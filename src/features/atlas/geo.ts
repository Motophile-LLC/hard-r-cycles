import type {
  AtlasGeoFeature,
  AtlasPinRecord,
  AtlasSanitizedPin,
  AtlasVisibility,
} from './types';

function cleanZero(num: number): number {
  return num === 0 ? 0 : num;
}

export function fuzzCoordinate(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  return cleanZero(Math.round(clamped * 10) / 10);
}

function safeDecodeHeader(
  raw: string | null,
  fallback: string,
  maxLen: number,
): string {
  if (!raw) return fallback;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const cleaned = decoded
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
}

export function extractVercelGeoFromHeaders(headers: Headers): {
  city: string;
  region: string;
  country: string;
  latApprox: number;
  lngApprox: number;
  geoSource: 'vercel' | 'fallback';
} {
  const latRaw = headers.get('x-vercel-ip-latitude');
  const lngRaw = headers.get('x-vercel-ip-longitude');
  const latParsed = latRaw !== null ? Number(latRaw) : NaN;
  const lngParsed = lngRaw !== null ? Number(lngRaw) : NaN;

  if (Number.isFinite(latParsed) && Number.isFinite(lngParsed)) {
    const city = safeDecodeHeader(headers.get('x-vercel-ip-city'), 'Unknown', 60);
    const region = safeDecodeHeader(headers.get('x-vercel-ip-region'), 'Unknown', 40);
    const country = safeDecodeHeader(
      headers.get('x-vercel-ip-country'),
      'US',
      16,
    ).toUpperCase();

    return {
      city,
      region,
      country,
      latApprox: fuzzCoordinate(latParsed, -85, 85),
      lngApprox: fuzzCoordinate(lngParsed, -180, 180),
      geoSource: 'vercel',
    };
  }

  return {
    city: 'Austin',
    region: 'TX',
    country: 'US',
    latApprox: 30.3,
    lngApprox: -97.7,
    geoSource: 'fallback',
  };
}

export function normalizeAtlasPinRow(row: Record<string, unknown>): AtlasPinRecord {
  const visRaw = row.visibility;
  const visibility: AtlasVisibility =
    visRaw === 'anonymized' || visRaw === 'hidden' ? visRaw : 'public';
  const nowIso = new Date().toISOString();

  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    display_name:
      typeof row.display_name === 'string' && row.display_name.trim()
        ? row.display_name.trim()
        : 'Anonymous Rider',
    city:
      typeof row.city === 'string' && row.city.trim() ? row.city.trim() : 'Unknown',
    region:
      typeof row.region === 'string' && row.region.trim()
        ? row.region.trim()
        : 'Unknown',
    country:
      typeof row.country === 'string' && row.country.trim()
        ? row.country.trim()
        : 'US',
    lat_approx: Number(row.lat_approx ?? 0) || 0,
    lng_approx: Number(row.lng_approx ?? 0) || 0,
    visit_count: Math.max(1, Math.floor(Number(row.visit_count ?? 1) || 1)),
    favorite_bike:
      typeof row.favorite_bike === 'string' && row.favorite_bike.trim()
        ? row.favorite_bike.trim()
        : 'Custom Chopper',
    visibility,
    first_seen_at:
      typeof row.first_seen_at === 'string' ? row.first_seen_at : nowIso,
    last_seen_at:
      typeof row.last_seen_at === 'string' ? row.last_seen_at : nowIso,
  };
}

export function sanitizeVisitorPin(row: AtlasPinRecord): AtlasSanitizedPin {
  const isAnonymized = row.visibility === 'anonymized';
  const displayName = isAnonymized
    ? row.city && row.city !== 'Unknown'
      ? `Rider from ${row.city}`
      : 'Anonymous Rider'
    : row.display_name || 'Anonymous Rider';

  return {
    id: row.id,
    displayName,
    city: row.city || 'Unknown',
    region: row.region || 'Unknown',
    country: row.country || 'US',
    lat: Number(row.lat_approx),
    lng: Number(row.lng_approx),
    visitCount: Math.max(1, Number(row.visit_count) || 1),
    favoriteBike: row.favorite_bike || 'Custom Chopper',
    lastSeenAt: row.last_seen_at,
    isAnonymized,
  };
}

function toIndividualFeature(row: AtlasPinRecord): AtlasGeoFeature {
  const sanitized = sanitizeVisitorPin(row);
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [sanitized.lng, sanitized.lat],
    },
    properties: {
      isCluster: false,
      ...sanitized,
    },
  };
}

export function clusterPinsToGeoJson(
  rows: AtlasPinRecord[],
  opts: { zoom: number; bounds?: [number, number, number, number] | null },
): AtlasGeoFeature[] {
  let visible = rows.filter((r) => r.visibility !== 'hidden');

  if (opts.bounds) {
    const [swLat, swLng, neLat, neLng] = opts.bounds;
    visible = visible.filter((r) => {
      const lat = Number(r.lat_approx);
      const lng = Number(r.lng_approx);
      return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
    });
  }

  if (opts.zoom >= 5) {
    return visible.map(toIndividualFeature);
  }

  const grid = new Map<string, AtlasPinRecord[]>();
  for (const row of visible) {
    const cellLat = cleanZero(Math.round(Number(row.lat_approx) / 3) * 3);
    const cellLng = cleanZero(Math.round(Number(row.lng_approx) / 3) * 3);
    const key = `${cellLat}:${cellLng}`;
    const bucket = grid.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      grid.set(key, [row]);
    }
  }

  const features: AtlasGeoFeature[] = [];
  for (const [key, bucket] of grid.entries()) {
    if (bucket.length === 1) {
      features.push(toIndividualFeature(bucket[0]));
      continue;
    }

    const avgLat = fuzzCoordinate(
      bucket.reduce((sum, p) => sum + Number(p.lat_approx), 0) / bucket.length,
      -85,
      85,
    );
    const avgLng = fuzzCoordinate(
      bucket.reduce((sum, p) => sum + Number(p.lng_approx), 0) / bucket.length,
      -180,
      180,
    );

    const citySet = new Set<string>();
    const bikeSet = new Set<string>();
    let latestSeenAt = bucket[0]?.last_seen_at ?? new Date().toISOString();

    for (const item of bucket) {
      if (item.city && item.city !== 'Unknown') citySet.add(item.city);
      if (item.favorite_bike) bikeSet.add(item.favorite_bike);
      if (Date.parse(item.last_seen_at) > Date.parse(latestSeenAt)) {
        latestSeenAt = item.last_seen_at;
      }
    }

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [avgLng, avgLat],
      },
      properties: {
        isCluster: true,
        clusterId: `cluster-${key}`,
        pointCount: bucket.length,
        topCities: Array.from(citySet).slice(0, 3),
        sampleBikes: Array.from(bikeSet).slice(0, 3),
        latestSeenAt,
      },
    });
  }

  return features;
}

export function projectLatLngToMapXY(
  lat: number,
  lng: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const clampedLat = Math.max(-60, Math.min(78, Number.isFinite(lat) ? lat : 0));
  const clampedLng = Math.max(-170, Math.min(180, Number.isFinite(lng) ? lng : 0));
  const x = ((clampedLng - -170) / 350) * width;
  const y = ((78 - clampedLat) / 138) * height;
  return { x, y };
}
