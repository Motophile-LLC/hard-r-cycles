import { NextRequest, NextResponse } from 'next/server';
import {
  extractVercelGeoFromHeaders,
  normalizeAtlasPinRow,
} from '@/features/atlas/geo';
import type { AtlasVisibility } from '@/features/atlas/types';
import { getAuthenticatedUser } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

function cleanStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function parseVisibility(val: unknown): AtlasVisibility | null {
  if (val === 'public' || val === 'anonymized' || val === 'hidden') {
    return val;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { user, tokenPresent, error } = await getAuthenticatedUser(req);
  if (!tokenPresent || !user) {
    return NextResponse.json(
      { error: error ?? 'Google or Apple SSO sign-in is required to pin the Shop Wall.' },
      { status: 401 },
    );
  }

  const adminDb = getSupabaseAdminClient();
  if (!adminDb) {
    return NextResponse.json(
      { error: 'Supabase server credentials are not configured.' },
      { status: 503 },
    );
  }

  let body: {
    favoriteBike?: unknown;
    visibility?: unknown;
    displayName?: unknown;
  } = {};
  try {
    const raw = await req.text();
    if (raw.trim()) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as typeof body;
      }
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const requestedBike = cleanStr(body.favoriteBike, 80);
  const requestedName = cleanStr(body.displayName, 40);
  const requestedVisibility = parseVisibility(body.visibility);

  const geo = extractVercelGeoFromHeaders(req.headers);

  const [profileRes, existingPinRes] = await Promise.all([
    adminDb.from('profiles').select('*').eq('id', user.userId).maybeSingle(),
    adminDb.from('visitor_pins').select('*').eq('user_id', user.userId).maybeSingle(),
  ]);

  const profile = (profileRes.data ?? null) as Record<string, unknown> | null;
  const existingPin = existingPinRes.data
    ? normalizeAtlasPinRow(existingPinRes.data as Record<string, unknown>)
    : null;

  let garageBikeLabel = '';
  if (profile && Array.isArray(profile.garage_bikes) && profile.garage_bikes.length > 0) {
    const first = profile.garage_bikes[0] as Record<string, unknown>;
    garageBikeLabel = [first.year, first.make, first.model]
      .filter((v) => typeof v === 'string' && v.trim())
      .join(' ')
      .trim()
      .slice(0, 80);
  }

  const favoriteBike =
    requestedBike ||
    garageBikeLabel ||
    existingPin?.favorite_bike ||
    'Custom Chopper';

  const profileHandle =
    profile && typeof profile.mechanic_handle === 'string'
      ? profile.mechanic_handle.trim()
      : '';
  const profileDisplay =
    profile && typeof profile.display_name === 'string'
      ? profile.display_name.trim()
      : '';

  const displayName =
    requestedName ||
    profileHandle ||
    profileDisplay ||
    user.fullName ||
    'Anonymous Rider';

  const profileVisibility =
    profile && 'atlas_visibility' in profile
      ? parseVisibility(profile.atlas_visibility)
      : null;
  const visibility: AtlasVisibility =
    requestedVisibility ?? profileVisibility ?? existingPin?.visibility ?? 'public';

  const nowIso = new Date().toISOString();
  const nextVisitCount = existingPin ? existingPin.visit_count + 1 : 1;

  const { data: upserted, error: upsertError } = await adminDb
    .from('visitor_pins')
    .upsert(
      {
        user_id: user.userId,
        display_name: displayName,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        lat_approx: geo.latApprox,
        lng_approx: geo.lngApprox,
        visit_count: nextVisitCount,
        favorite_bike: favoriteBike,
        visibility,
        first_seen_at: existingPin?.first_seen_at ?? nowIso,
        last_seen_at: nowIso,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  if (upsertError || !upserted) {
    return NextResponse.json(
      { error: upsertError?.message ?? 'Unable to save Shop Wall pin.' },
      { status: 500 },
    );
  }

  if (
    profile &&
    'atlas_visibility' in profile &&
    profile.atlas_visibility !== visibility
  ) {
    await adminDb
      .from('profiles')
      .update({ atlas_visibility: visibility, updated_at: nowIso })
      .eq('id', user.userId);
  }

  try {
    await adminDb.from('analytics_events').insert({
      event_name: 'atlas_checkin',
      user_id: user.userId,
      metadata: {
        city: geo.city,
        region: geo.region,
        country: geo.country,
        visibility,
        geoSource: geo.geoSource,
      },
    });
  } catch (err) {
    console.warn('[atlas/checkin] analytics log error:', err);
  }

  return NextResponse.json({
    ok: true,
    pin: normalizeAtlasPinRow(upserted as Record<string, unknown>),
    geoSource: geo.geoSource,
  });
}
