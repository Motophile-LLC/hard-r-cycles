import type { DecodedVehicle } from './types';

const ACRONYM_TOKENS = new Set([
  'BMW',
  'KTM',
  'MV',
  'CFMOTO',
  'CBR',
  'CB',
  'CRF',
  'CR',
  'XR',
  'FXR',
  'FX',
  'FXDB',
  'FXDLS',
  'FXBB',
  'FXLR',
  'FXLRS',
  'FLH',
  'FLHX',
  'FLHXS',
  'FLTR',
  'FLTRX',
  'FLTRXS',
  'FLHT',
  'FLST',
  'XL',
  'YZ',
  'YZF',
  'GSX',
  'GSXR',
  'GS',
  'ZX',
  'KX',
  'KLR',
  'DRZ',
  'SV',
  'MT',
  'FZ',
  'VN',
  'VTX',
  'GL',
  'XT',
  'RM',
  'RMZ',
  'EXC',
  'SX',
  'TC',
  'RR',
  'RS',
  'GT',
  'ST',
  'SE',
  'CVO',
  'ABS',
  'ADV',
  'USA',
  'US',
  'UK',
  'ATV',
  'UTV',
  'MPV',
  'SUV',
]);

const NHTSA_EMPTY_VALUES = new Set([
  '',
  'not applicable',
  'n/a',
  'na',
  'null',
  'undefined',
  'unknown',
]);

export function normalizeVin(raw: string): string {
  return raw.trim().replace(/[\s-]+/g, '').toUpperCase();
}

export function validateVinFormat(rawVin: string): {
  valid: boolean;
  vin: string;
  reason?: string;
} {
  const vin = normalizeVin(rawVin);
  if (!vin) {
    return { valid: false, vin, reason: 'Enter a 17-character VIN first.' };
  }
  if (vin.length !== 17) {
    return {
      valid: false,
      vin,
      reason: `Standard VINs must be exactly 17 characters (got ${vin.length}). Use Year / Make / Model for pre-1981 frames.`,
    };
  }
  if (/[IOQ]/.test(vin)) {
    return {
      valid: false,
      vin,
      reason: 'VINs never contain the letters I, O, or Q (check 1 vs I or 0 vs O).',
    };
  }
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return {
      valid: false,
      vin,
      reason: 'VIN may only contain letters A–Z (excluding I, O, Q) and digits 0–9.',
    };
  }
  return { valid: true, vin };
}

function formatSegmentToken(token: string): string {
  if (!token) return '';
  const upper = token.toUpperCase();

  // Preserve alphanumeric model designations (e.g. CBR600RR, XL883N, R1, F150)
  // and well-known powersports acronyms (BMW, KTM, FLHXS, CVO).
  if (/\d/.test(token) || ACRONYM_TOKENS.has(upper)) {
    return upper;
  }

  if (token.length <= 1) {
    return upper;
  }

  return upper.charAt(0) + upper.slice(1).toLowerCase();
}

export function formatVehicleText(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((sub) => formatSegmentToken(sub))
        .join('-'),
    )
    .join(' ');
}

function readNhtsaField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (NHTSA_EMPTY_VALUES.has(trimmed.toLowerCase())) {
    return '';
  }
  return trimmed;
}

function formatDisplacementCc(raw: string): string {
  if (!raw) return '';
  const numeric = Number.parseFloat(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return `${Math.round(numeric)} cc`;
}

export function parseNhtsaVpicPayload(
  rawVin: string,
  payload: unknown,
): DecodedVehicle | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const results = record.Results;
  if (!Array.isArray(results) || results.length === 0) return null;

  const first = results[0];
  if (!first || typeof first !== 'object') return null;
  const row = first as Record<string, unknown>;

  const year = readNhtsaField(row, 'ModelYear').replace(/[^0-9]/g, '').slice(0, 4);
  const rawMake = readNhtsaField(row, 'Make');
  const rawModel = readNhtsaField(row, 'Model');

  if (!rawMake && !rawModel) {
    return null;
  }

  const make = formatVehicleText(rawMake);
  const model = formatVehicleText(rawModel);
  const series = formatVehicleText(readNhtsaField(row, 'Series'));
  const rawTrim = formatVehicleText(readNhtsaField(row, 'Trim'));
  const trim =
    rawTrim && rawTrim.toLowerCase() !== model.toLowerCase()
      ? rawTrim
      : series && series.toLowerCase() !== model.toLowerCase()
        ? series
        : undefined;

  const displacementCc =
    formatDisplacementCc(readNhtsaField(row, 'DisplacementCC')) || undefined;
  const rawEngineConfig = readNhtsaField(row, 'EngineConfiguration');
  const rawCylinders = readNhtsaField(row, 'EngineCylinders');
  const engineConfig =
    rawEngineConfig || (rawCylinders ? `${rawCylinders}-cyl` : undefined);
  const vehicleType = readNhtsaField(row, 'VehicleType') || undefined;
  const plantCountry =
    formatVehicleText(readNhtsaField(row, 'PlantCountry')) || undefined;

  const vin = normalizeVin(rawVin);
  const displayName = [year, make, model, trim].filter(Boolean).join(' ').trim() || vin;

  return {
    source: 'nhtsa',
    vin,
    year,
    make,
    model,
    trim,
    displacementCc,
    engineConfig,
    vehicleType,
    plantCountry,
    displayName,
  };
}

export async function decodeVinViaNhtsa(
  rawVin: string,
  timeoutMs = 6500,
): Promise<{ ok: true; vehicle: DecodedVehicle } | { ok: false; error: string }> {
  const checked = validateVinFormat(rawVin);
  if (!checked.valid) {
    return { ok: false, error: checked.reason ?? 'Invalid VIN format.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(
      checked.vin,
    )}?format=json`;
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `NHTSA VIN database returned HTTP ${response.status}. Switch to Year / Make / Model below.`,
      };
    }

    const payload = (await response.json()) as unknown;
    const decoded = parseNhtsaVpicPayload(checked.vin, payload);
    if (!decoded) {
      return {
        ok: false,
        error:
          'NHTSA could not match a make and model for that VIN. Enter Year / Make / Model manually below.',
      };
    }

    return { ok: true, vehicle: decoded };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      error: isTimeout
        ? 'NHTSA VIN lookup timed out. Enter Year / Make / Model below to keep moving.'
        : 'Unable to reach NHTSA VIN decoder right now. Use Year / Make / Model below.',
    };
  } finally {
    clearTimeout(timer);
  }
}
