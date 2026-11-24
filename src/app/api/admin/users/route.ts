import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdminEmail, requireAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminDb = getSupabaseAdminClient()!;
  const [profilesRes, ordersRes, shiftsRes, rewardsRes] = await Promise.all([
    adminDb
      .from('profiles')
      .select(
        'id, email, full_name, display_name, mechanic_handle, avatar_url, auth_provider, role, phone, shirt_size, default_shipping_address, garage_bikes, marketing_opt_in, notes, sign_in_count, last_seen_at, created_at',
      )
      .order('last_seen_at', { ascending: false })
      .limit(200),
    adminDb.from('orders').select('user_id, customer_email, total'),
    adminDb.from('repair_orders').select('user_id, efficiency_rating'),
    adminDb.from('reward_claims').select('user_id, redeemed'),
  ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  const profiles = profilesRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const shifts = shiftsRes.data ?? [];
  const rewards = rewardsRes.data ?? [];

  const enriched = profiles.map((p) => {
    const emailLower = (p.email ?? '').toLowerCase();
    const userOrders = orders.filter(
      (o) =>
        (o.user_id && o.user_id === p.id) ||
        (emailLower && (o.customer_email ?? '').toLowerCase() === emailLower),
    );
    const userShifts = shifts.filter((s) => s.user_id === p.id);
    const userRewards = rewards.filter((r) => r.user_id === p.id);
    const lifetimeSpend = userOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const bestEfficiency = userShifts.reduce(
      (best, s) => Math.max(best, Number(s.efficiency_rating || 0)),
      0,
    );
    const superAdmin = isSuperAdminEmail(p.email);

    return {
      ...p,
      role: superAdmin ? 'admin' : p.role,
      isSuperAdmin: superAdmin,
      orderCount: userOrders.length,
      lifetimeSpend: Number(lifetimeSpend.toFixed(2)),
      shiftCount: userShifts.length,
      bestEfficiency: Number(bestEfficiency.toFixed(1)),
      rewardCount: userRewards.length,
    };
  });

  return NextResponse.json({ users: enriched });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { id?: unknown; role?: unknown; notes?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; role?: unknown; notes?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const targetId = typeof body.id === 'string' ? body.id.trim() : '';
  if (!targetId) {
    return NextResponse.json({ error: 'Missing target user id.' }, { status: 400 });
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data: targetProfile, error: lookupError } = await adminDb
    .from('profiles')
    .select('id, email, role')
    .eq('id', targetId)
    .maybeSingle();

  if (lookupError || !targetProfile) {
    return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.role !== undefined) {
    if (body.role !== 'admin' && body.role !== 'customer') {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "customer".' },
        { status: 400 },
      );
    }
    if (body.role === 'customer' && isSuperAdminEmail(targetProfile.email)) {
      return NextResponse.json(
        { error: 'Super Admin listed in ADMIN_EMAILS cannot be demoted here.' },
        { status: 400 },
      );
    }
    if (body.role === 'customer' && targetId === auth.userId) {
      return NextResponse.json(
        { error: 'You cannot remove your own active Admin access.' },
        { status: 400 },
      );
    }
    patch.role = body.role;
  }

  if (body.notes !== undefined) {
    patch.notes =
      typeof body.notes === 'string'
        ? body.notes.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 500)
        : '';
  }

  const { data: updated, error: updateError } = await adminDb
    .from('profiles')
    .update(patch)
    .eq('id', targetId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ user: updated });
}
