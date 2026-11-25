import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/adminAuth';
import type { ShopAnalyticsEventName } from '@/lib/analytics';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const MAX_BODY_BYTES = 2048;

const ALLOWED_EVENTS = new Set<ShopAnalyticsEventName>([
  'poster_open_flatratemaster',
  'poster_click_flatratemaster',
  'deep_link_landed',
  'atlas_open',
  'atlas_checkin',
  'diagnostic_decode',
  'diagnostic_frm_handoff',
  'roast_card_open',
  'roast_card_share',
]);

type CleanMetadataValue = string | number | boolean | null;

function sanitizeMetadata(
  raw: unknown,
): Record<string, CleanMetadataValue> | null {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const cleaned: Record<string, CleanMetadataValue> = {};
  for (const [rawKey, rawVal] of Object.entries(raw)) {
    if (Object.keys(cleaned).length >= 12) break;
    const key = rawKey.trim().slice(0, 40);
    if (!key) continue;

    if (rawVal === null) {
      cleaned[key] = null;
    } else if (typeof rawVal === 'string') {
      cleaned[key] = rawVal.trim().slice(0, 200);
    } else if (typeof rawVal === 'number' && Number.isFinite(rawVal)) {
      cleaned[key] = rawVal;
    } else if (typeof rawVal === 'boolean') {
      cleaned[key] = rawVal;
    }
  }

  return cleaned;
}

export async function POST(req: NextRequest) {
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'Unable to read request body.' }, { status: 400 });
  }

  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Invalid event payload.' }, { status: 400 });
  }

  const record = parsed as Record<string, unknown>;
  const eventName =
    typeof record.eventName === 'string' ? record.eventName.trim() : '';

  if (!ALLOWED_EVENTS.has(eventName as ShopAnalyticsEventName)) {
    return NextResponse.json({ error: 'Unsupported analytics event.' }, { status: 400 });
  }

  const cleanMetadata = sanitizeMetadata(record.metadata);
  if (!cleanMetadata) {
    return NextResponse.json({ error: 'Invalid metadata object.' }, { status: 400 });
  }

  const { user } = await getAuthenticatedUser(req);
  const adminDb = getSupabaseAdminClient();

  if (!adminDb) {
    console.info('[analytics]', eventName, cleanMetadata);
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const { error } = await adminDb.from('analytics_events').insert({
      event_name: eventName,
      user_id: user?.userId ?? null,
      metadata: cleanMetadata,
    });

    if (!error) {
      return NextResponse.json({ ok: true, persisted: true });
    }

    // Wave 1 migration `005` creates `analytics_events`; tolerate pre-migration state cleanly.
    if (error.code === '42P01' || error.code === 'PGRST205') {
      console.info('[analytics]', eventName, cleanMetadata);
      return NextResponse.json({
        ok: true,
        persisted: false,
        pendingMigration: true,
      });
    }

    console.warn('[analytics] insert error:', error.message);
    return NextResponse.json({ ok: true, persisted: false });
  } catch (err) {
    console.warn('[analytics] unexpected error:', err);
    return NextResponse.json({ ok: true, persisted: false });
  }
}
