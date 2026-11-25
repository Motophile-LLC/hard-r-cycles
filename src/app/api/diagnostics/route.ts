import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  decodeVinViaNhtsa,
  formatVehicleText,
  normalizeVin,
} from '@/features/diagnostics/nhtsa';
import { buildDiagnosticTriage } from '@/features/diagnostics/triage';
import {
  SYMPTOM_OPTIONS,
  type DecodedVehicle,
  type DiagnosticSymptomCategory,
} from '@/features/diagnostics/types';
import {
  ensureCustomerMemoryRow,
  mergeDecodedBikeIntoGarage,
  recordDiagnosticInCustomerMemory,
} from '@/features/npc-memory/serverSync';
import { getAuthenticatedUser } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import type { CustomerMemoryRecord, GarageBike } from '@/types/shop';

const MAX_BODY_BYTES = 4096;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_CALLS = 25;

const ALLOWED_SYMPTOMS = new Set<DiagnosticSymptomCategory>(
  SYMPTOM_OPTIONS.map((opt) => opt.id),
);

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function cleanText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function getRequesterBucketKey(req: NextRequest, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const realIp = req.headers.get('x-real-ip')?.trim() ?? '';
  const seed = forwarded || realIp || req.headers.get('user-agent') || 'guest';
  // Hash ephemerally in RAM only — never persist raw IP addresses.
  return `g:${createHash('sha256').update(seed).digest('hex').slice(0, 16)}`;
}

function checkRateLimit(bucketKey: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [k, entry] of rateBuckets.entries()) {
      if (entry.resetAt <= now) rateBuckets.delete(k);
    }
  }

  const current = rateBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX_CALLS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export async function POST(req: NextRequest) {
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'Unable to read request body.' }, { status: 400 });
  }

  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request payload is too large.' }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const body = parsed as Record<string, unknown>;
  const { user } = await getAuthenticatedUser(req);
  const bucketKey = getRequesterBucketKey(req, user?.userId ?? null);
  const rate = checkRateLimit(bucketKey);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Slow down, wrench — counter terminal cools off for ${rate.retryAfterSec}s.`,
      },
      { status: 429 },
    );
  }

  const mode = body.mode === 'manual' ? 'manual' : body.mode === 'vin' ? 'vin' : null;
  if (!mode) {
    return NextResponse.json(
      { error: 'Specify mode as either "vin" or "manual".' },
      { status: 400 },
    );
  }

  const rawCategory = cleanText(body.symptomCategory, 40) as DiagnosticSymptomCategory;
  const symptomCategory: DiagnosticSymptomCategory = ALLOWED_SYMPTOMS.has(rawCategory)
    ? rawCategory
    : 'other';
  const symptomText = cleanText(body.symptomText, 140);
  const saveToGarage = body.saveToGarage !== false;

  let vehicle: DecodedVehicle;

  if (mode === 'vin') {
    const rawVin = cleanText(body.vin, 32);
    const decoded = await decodeVinViaNhtsa(rawVin);
    if (!decoded.ok) {
      const isFormatIssue =
        decoded.error.includes('17 characters') ||
        decoded.error.includes('letters I, O, or Q') ||
        decoded.error.includes('Enter a 17-character VIN') ||
        decoded.error.includes('may only contain');
      return NextResponse.json(
        {
          error: decoded.error,
          fallbackToManual: !isFormatIssue,
        },
        { status: isFormatIssue ? 400 : 422 },
      );
    }
    vehicle = decoded.vehicle;
  } else {
    const year = cleanText(body.year, 8).replace(/[^0-9]/g, '').slice(0, 4);
    const make = formatVehicleText(cleanText(body.make, 40));
    const model = formatVehicleText(cleanText(body.model, 60));
    const optionalVin = normalizeVin(cleanText(body.vin, 24)).slice(0, 24);

    if (!make || !model) {
      return NextResponse.json(
        { error: 'Enter both Make and Model when running manual diagnostics.' },
        { status: 400 },
      );
    }

    vehicle = {
      source: 'manual',
      vin: optionalVin,
      year,
      make,
      model,
      displayName: [year, make, model].filter(Boolean).join(' ').trim(),
    };
  }

  let riderName: string | undefined;
  let previousDiagnosticCount = 0;
  let previousBike: string | null = null;
  let customerMemory: CustomerMemoryRecord | null = null;
  let garageBikes: GarageBike[] | null = null;
  let savedToGarage = false;

  const adminDb = getSupabaseAdminClient();
  if (user && adminDb) {
    const [profileRes, existingMem] = await Promise.all([
      adminDb
        .from('profiles')
        .select('display_name, mechanic_handle, garage_bikes')
        .eq('id', user.userId)
        .maybeSingle(),
      ensureCustomerMemoryRow(adminDb, user.userId),
    ]);

    const profileRow = profileRes.data as Record<string, unknown> | null;
    riderName =
      (typeof profileRow?.mechanic_handle === 'string' &&
        profileRow.mechanic_handle.trim()) ||
      (typeof profileRow?.display_name === 'string' &&
        profileRow.display_name.trim()) ||
      user.fullName ||
      undefined;

    previousDiagnosticCount = existingMem?.diagnostic_count ?? 0;
    previousBike = existingMem?.last_diagnosed_bike ?? null;

    const optionMeta =
      SYMPTOM_OPTIONS.find((opt) => opt.id === symptomCategory) ?? SYMPTOM_OPTIONS[7];
    const resolvedSummary = symptomText || optionMeta.label;

    customerMemory = await recordDiagnosticInCustomerMemory(adminDb, {
      userId: user.userId,
      bikeLabel: vehicle.displayName,
      symptomSummary: resolvedSummary,
    });

    if (saveToGarage) {
      const mergedBikes = mergeDecodedBikeIntoGarage(profileRow?.garage_bikes, {
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        vin: vehicle.vin,
        notes: resolvedSummary ? `Last check: ${resolvedSummary}` : '',
      });
      const { error: garageErr } = await adminDb
        .from('profiles')
        .update({
          garage_bikes: mergedBikes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.userId);

      if (!garageErr) {
        garageBikes = mergedBikes;
        savedToGarage = true;
      } else {
        console.warn('[diagnostics] garage sync error:', garageErr.message);
      }
    }
  }

  const triage = buildDiagnosticTriage({
    vehicle,
    symptomCategory,
    symptomText,
    riderName,
    previousDiagnosticCount,
    previousBike,
    savedToGarage,
    nextDiagnosticCount: customerMemory?.diagnostic_count ?? null,
  });

  return NextResponse.json({
    triage,
    customerMemory,
    garageBikes,
  });
}
