import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  isSuperAdminEmail,
  type AuthenticatedUser,
} from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import type { GarageBike, ShippingAddress } from '@/types/shop';

function cleanStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function sanitizeGarageBikes(raw: unknown): GarageBike[] {
  if (!Array.isArray(raw)) return [];
  const list: GarageBike[] = [];
  for (const item of raw.slice(0, 10)) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const year = cleanStr(rec.year, 8);
    const make = cleanStr(rec.make, 40);
    const model = cleanStr(rec.model, 60);
    const vin = cleanStr(rec.vin, 24).toUpperCase();
    const notes = cleanStr(rec.notes, 180);
    if (!make && !model && !vin) continue;
    list.push({
      id: cleanStr(rec.id, 40) || `bike-${list.length + 1}`,
      year,
      make,
      model,
      vin,
      notes,
    });
  }
  return list;
}

function sanitizeAddress(raw: unknown): ShippingAddress | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const address: ShippingAddress = {
    name: cleanStr(rec.name, 80),
    line1: cleanStr(rec.line1, 120),
    line2: cleanStr(rec.line2, 120),
    city: cleanStr(rec.city, 60),
    state: cleanStr(rec.state, 40),
    postal_code: cleanStr(rec.postal_code, 24),
    country: cleanStr(rec.country, 8).toUpperCase() || 'US',
  };
  if (!address.line1 && !address.city && !address.postal_code) {
    return null;
  }
  return address;
}

async function ensureAndSyncProfile(
  user: AuthenticatedUser,
  bumpSignIn: boolean,
) {
  const adminDb = getSupabaseAdminClient();
  if (!adminDb) return null;

  const superAdmin = isSuperAdminEmail(user.email);
  const { data: existing } = await adminDb
    .from('profiles')
    .select('*')
    .eq('id', user.userId)
    .maybeSingle();

  const defaultHandle = (
    user.fullName.split(/\s+/)[0] ||
    user.email.split('@')[0] ||
    'Wrench'
  )
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .slice(0, 24) || 'Wrench';

  if (!existing) {
    const { data: inserted } = await adminDb
      .from('profiles')
      .insert({
        id: user.userId,
        email: user.email,
        full_name: user.fullName,
        display_name: user.fullName || user.email.split('@')[0] || 'Rider',
        mechanic_handle: defaultHandle,
        avatar_url: user.avatarUrl,
        auth_provider: user.provider,
        role: superAdmin ? 'admin' : 'customer',
        sign_in_count: 1,
        last_seen_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    return inserted ?? null;
  }

  const updatePatch: Record<string, unknown> = {
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (user.fullName && !existing.full_name) {
    updatePatch.full_name = user.fullName;
  }
  if (user.avatarUrl && user.avatarUrl !== existing.avatar_url) {
    updatePatch.avatar_url = user.avatarUrl;
  }
  if (user.provider && user.provider !== existing.auth_provider) {
    updatePatch.auth_provider = user.provider;
  }
  if (superAdmin && existing.role !== 'admin') {
    updatePatch.role = 'admin';
  }
  if (bumpSignIn) {
    updatePatch.sign_in_count = Number(existing.sign_in_count || 1) + 1;
  }

  const { data: updated } = await adminDb
    .from('profiles')
    .update(updatePatch)
    .eq('id', user.userId)
    .select('*')
    .single();

  return updated ?? existing;
}

export async function GET(req: NextRequest) {
  const { user, tokenPresent, error } = await getAuthenticatedUser(req);
  if (!tokenPresent || !user) {
    return NextResponse.json(
      { error: error ?? 'Authentication required.' },
      { status: 401 },
    );
  }

  const adminDb = getSupabaseAdminClient();
  if (!adminDb) {
    return NextResponse.json(
      { error: 'SUPABASE_SECRET_KEY is not configured.' },
      { status: 503 },
    );
  }

  const bumpLogin = req.nextUrl.searchParams.get('login') === '1';
  const profile = await ensureAndSyncProfile(user, bumpLogin);
  if (!profile) {
    return NextResponse.json(
      { error: 'Unable to load user profile.' },
      { status: 500 },
    );
  }

  const isSuperAdmin = isSuperAdminEmail(user.email);
  const isAdmin = isSuperAdmin || profile.role === 'admin';

  const ordersQuery = adminDb
    .from('orders')
    .select(
      'id, stripe_session_id, subtotal, shipping_cost, total, currency, fulfillment_mode, status, tracking_number, items, created_at',
    );
  const escapedEmail = user.email
    ? user.email.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    : '';
  const scopedOrdersQuery = escapedEmail
    ? ordersQuery.or(`user_id.eq.${user.userId},customer_email.eq."${escapedEmail}"`)
    : ordersQuery.eq('user_id', user.userId);

  const [ordersRes, rewardsRes, shiftsRes] = await Promise.all([
    scopedOrdersQuery
      .order('created_at', { ascending: false })
      .limit(25),
    adminDb
      .from('reward_claims')
      .select(
        'id, repair_order_id, mechanic_name, efficiency_rating, discount_percent, promo_code, redeemed, redeemed_at, created_at',
      )
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(25),
    adminDb
      .from('repair_orders')
      .select(
        'id, mechanic_name, billed_hours, actual_hours, efficiency_rating, shop_damage_cost, rank_badge, jobs_completed, created_at',
      )
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  return NextResponse.json({
    profile,
    isAdmin,
    isSuperAdmin,
    orders: ordersRes.data ?? [],
    rewards: rewardsRes.data ?? [],
    repairOrders: shiftsRes.data ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const { user, tokenPresent, error } = await getAuthenticatedUser(req);
  if (!tokenPresent || !user) {
    return NextResponse.json(
      { error: error ?? 'Authentication required.' },
      { status: 401 },
    );
  }

  const adminDb = getSupabaseAdminClient();
  if (!adminDb) {
    return NextResponse.json(
      { error: 'SUPABASE_SECRET_KEY is not configured.' },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  await ensureAndSyncProfile(user, false);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.display_name !== undefined) {
    patch.display_name = cleanStr(body.display_name, 60);
  }
  if (body.mechanic_handle !== undefined) {
    patch.mechanic_handle = cleanStr(body.mechanic_handle, 24) || 'Wrench';
  }
  if (body.phone !== undefined) {
    patch.phone = cleanStr(body.phone, 30);
  }
  if (body.shirt_size !== undefined) {
    patch.shirt_size = cleanStr(body.shirt_size, 16);
  }
  if (body.marketing_opt_in !== undefined) {
    patch.marketing_opt_in = Boolean(body.marketing_opt_in);
  }
  if (body.default_shipping_address !== undefined) {
    patch.default_shipping_address = sanitizeAddress(body.default_shipping_address);
  }
  if (body.garage_bikes !== undefined) {
    patch.garage_bikes = sanitizeGarageBikes(body.garage_bikes);
  }

  const { data: updated, error: updateError } = await adminDb
    .from('profiles')
    .update(patch)
    .eq('id', user.userId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ profile: updated });
}
