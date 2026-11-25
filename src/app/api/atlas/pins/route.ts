import { NextRequest, NextResponse } from 'next/server';
import {
  clusterPinsToGeoJson,
  normalizeAtlasPinRow,
  sanitizeVisitorPin,
} from '@/features/atlas/geo';
import type {
  AtlasPinDot,
  AtlasPinRecord,
  AtlasPinsApiResponse,
} from '@/features/atlas/types';
import { getAuthenticatedUser } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

function parseBoundsParam(
  raw: string | null,
): [number, number, number, number] | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  const [swLat, swLng, neLat, neLng] = parts;
  if (swLat > neLat || swLng > neLng) return null;
  return [swLat, swLng, neLat, neLng];
}

export async function GET(req: NextRequest) {
  const zoomRaw = Number.parseInt(
    req.nextUrl.searchParams.get('zoom') ?? '3',
    10,
  );
  const zoom = Number.isFinite(zoomRaw)
    ? Math.max(1, Math.min(12, zoomRaw))
    : 3;
  const bounds = parseBoundsParam(req.nextUrl.searchParams.get('bounds'));

  const emptyPayload: AtlasPinsApiResponse = {
    type: 'FeatureCollection',
    features: [],
    totalVisiblePins: 0,
    uniqueRegions: 0,
    recentRiders: [],
    boardDots: [],
    myPin: null,
  };

  const adminDb = getSupabaseAdminClient();
  if (!adminDb) {
    return NextResponse.json(emptyPayload);
  }

  const { user } = await getAuthenticatedUser(req);

  const [pinsRes, myPinRes] = await Promise.all([
    adminDb
      .from('visitor_pins')
      .select('*')
      .neq('visibility', 'hidden')
      .order('last_seen_at', { ascending: false })
      .limit(500),
    user
      ? adminDb
          .from('visitor_pins')
          .select('*')
          .eq('user_id', user.userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (pinsRes.error) {
    console.warn('[atlas/pins] query error:', pinsRes.error.message);
    return NextResponse.json(emptyPayload);
  }

  const visibleRows: AtlasPinRecord[] = (pinsRes.data ?? []).map((raw) =>
    normalizeAtlasPinRow(raw as Record<string, unknown>),
  );

  const features = clusterPinsToGeoJson(visibleRows, { zoom, bounds });
  const recentRiders = visibleRows.slice(0, 15).map(sanitizeVisitorPin);
  const boardDots: AtlasPinDot[] = visibleRows.slice(0, 40).map((row) => ({
    lat: Number(row.lat_approx),
    lng: Number(row.lng_approx),
    city: row.city || 'Unknown',
    count: row.visit_count,
  }));

  const regionSet = new Set<string>();
  for (const row of visibleRows) {
    const label = [row.region, row.country]
      .filter((s) => s && s !== 'Unknown')
      .join(', ');
    if (label) regionSet.add(label);
  }

  const myPin = myPinRes.data
    ? normalizeAtlasPinRow(myPinRes.data as Record<string, unknown>)
    : null;

  const responsePayload: AtlasPinsApiResponse = {
    type: 'FeatureCollection',
    features,
    totalVisiblePins: visibleRows.length,
    uniqueRegions: regionSet.size,
    recentRiders,
    boardDots,
    myPin,
  };

  return NextResponse.json(responsePayload);
}
