import { NextRequest, NextResponse } from 'next/server';
import {
  ensureCustomerMemoryRow,
  isMissingTableError,
  normalizeCustomerMemoryRow,
} from '@/features/npc-memory/serverSync';
import type { CustomerMemoryRecord } from '@/features/npc-memory/types';
import { isSuperAdminEmail, requireAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const VALID_MEMORY_PRESETS = [
  'reset',
  'window_shopper',
  'first_time_buyer',
  'vip_supporter',
  'repeat_diagnostic',
] as const;

type MemoryPreset = (typeof VALID_MEMORY_PRESETS)[number];

function isValidMemoryPreset(value: unknown): value is MemoryPreset {
  return (
    typeof value === 'string' &&
    (VALID_MEMORY_PRESETS as readonly string[]).includes(value)
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminDb = getSupabaseAdminClient()!;
  const [profilesRes, ordersRes, shiftsRes, rewardsRes, memoryRes] =
    await Promise.all([
      adminDb
        .from('profiles')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(200),
      adminDb.from('orders').select('user_id, customer_email, total'),
      adminDb.from('repair_orders').select('user_id, efficiency_rating'),
      adminDb.from('reward_claims').select('user_id, redeemed'),
      adminDb.from('customer_memory').select('*'),
    ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  const memoryTableReady =
    !memoryRes.error || !isMissingTableError(memoryRes.error);
  const memoryByUserId = new Map<string, CustomerMemoryRecord>();
  if (!memoryRes.error && Array.isArray(memoryRes.data)) {
    for (const rawRow of memoryRes.data) {
      const normalized = normalizeCustomerMemoryRow(
        rawRow as Record<string, unknown>,
      );
      if (normalized.user_id) {
        memoryByUserId.set(normalized.user_id, normalized);
      }
    }
  }

  const profiles = (profilesRes.data ?? []) as Array<Record<string, unknown>>;
  const orders = ordersRes.data ?? [];
  const shifts = shiftsRes.data ?? [];
  const rewards = rewardsRes.data ?? [];

  const enriched = profiles.map((p) => {
    const profileId = String(p.id ?? '');
    const email = typeof p.email === 'string' ? p.email : '';
    const emailLower = email.toLowerCase();
    const userOrders = orders.filter(
      (o) =>
        (o.user_id && o.user_id === profileId) ||
        (emailLower && (o.customer_email ?? '').toLowerCase() === emailLower),
    );
    const userShifts = shifts.filter((s) => s.user_id === profileId);
    const userRewards = rewards.filter((r) => r.user_id === profileId);
    const lifetimeSpend = userOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const bestEfficiency = userShifts.reduce(
      (best, s) => Math.max(best, Number(s.efficiency_rating || 0)),
      0,
    );
    const superAdmin = isSuperAdminEmail(email);

    return {
      ...p,
      id: profileId,
      email,
      visit_count: Number(p.visit_count ?? p.sign_in_count ?? 1),
      social_handle: typeof p.social_handle === 'string' ? p.social_handle : '',
      atlas_visibility:
        p.atlas_visibility === 'anonymized' || p.atlas_visibility === 'hidden'
          ? p.atlas_visibility
          : 'public',
      v_circle_opt_in: Boolean(p.v_circle_opt_in),
      role: superAdmin ? 'admin' : p.role === 'admin' ? 'admin' : 'customer',
      isSuperAdmin: superAdmin,
      orderCount: userOrders.length,
      lifetimeSpend: Number(lifetimeSpend.toFixed(2)),
      shiftCount: userShifts.length,
      bestEfficiency: Number(bestEfficiency.toFixed(1)),
      rewardCount: userRewards.length,
      customerMemory: memoryByUserId.get(profileId) ?? null,
    };
  });

  return NextResponse.json({ users: enriched, memoryTableReady });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    id?: unknown;
    role?: unknown;
    notes?: unknown;
    memoryPreset?: unknown;
  };
  try {
    body = (await req.json()) as {
      id?: unknown;
      role?: unknown;
      notes?: unknown;
      memoryPreset?: unknown;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const targetId = typeof body.id === 'string' ? body.id.trim() : '';
  if (!targetId) {
    return NextResponse.json({ error: 'Missing target user id.' }, { status: 400 });
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data: targetProfileRaw, error: lookupError } = await adminDb
    .from('profiles')
    .select('*')
    .eq('id', targetId)
    .maybeSingle();

  if (lookupError || !targetProfileRaw) {
    return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
  }

  const targetProfile = targetProfileRaw as Record<string, unknown>;
  const targetEmail =
    typeof targetProfile.email === 'string' ? targetProfile.email : '';

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    updated_at: nowIso,
  };
  let hasProfileChange = false;

  if (body.role !== undefined) {
    if (body.role !== 'admin' && body.role !== 'customer') {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "customer".' },
        { status: 400 },
      );
    }
    if (body.role === 'customer' && isSuperAdminEmail(targetEmail)) {
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
    hasProfileChange = true;
  }

  if (body.notes !== undefined) {
    patch.notes =
      typeof body.notes === 'string'
        ? body.notes.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 500)
        : '';
    hasProfileChange = true;
  }

  let updatedMemory: CustomerMemoryRecord | null = null;

  if (body.memoryPreset !== undefined) {
    if (!isValidMemoryPreset(body.memoryPreset)) {
      return NextResponse.json(
        { error: 'Unsupported customer memory preset.' },
        { status: 400 },
      );
    }

    const ensured = await ensureCustomerMemoryRow(adminDb, targetId);
    if (!ensured) {
      return NextResponse.json(
        {
          error:
            'Run supabase/migrations/005_phase2_memory_atlas_and_racks.sql in Supabase SQL Editor first to activate Customer Memory presets.',
        },
        { status: 503 },
      );
    }

    const preset = body.memoryPreset;
    let memPatch: Record<string, unknown> = { updated_at: nowIso };

    if (preset === 'reset') {
      memPatch = {
        total_orders: 0,
        lifetime_spend: 0,
        purchased_skus: [],
        last_order_date: null,
        last_purchased_item: null,
        diagnostic_count: 0,
        last_diagnosed_bike: null,
        last_symptom: null,
        loiter_kick_count: 0,
        updated_at: nowIso,
      };
      if ('visit_count' in targetProfile) {
        patch.visit_count = 1;
        hasProfileChange = true;
      }
    } else if (preset === 'window_shopper') {
      memPatch = {
        total_orders: 0,
        lifetime_spend: 0,
        diagnostic_count: 0,
        updated_at: nowIso,
      };
      if ('visit_count' in targetProfile) {
        patch.visit_count = 3;
        hasProfileChange = true;
      }
    } else if (preset === 'first_time_buyer') {
      memPatch = {
        total_orders: 1,
        lifetime_spend: 42.5,
        last_purchased_item: 'Hard R Shop Tee',
        last_order_date: nowIso,
        updated_at: nowIso,
      };
    } else if (preset === 'vip_supporter') {
      memPatch = {
        total_orders: 3,
        lifetime_spend: 165.0,
        last_purchased_item: 'Hard R VIP Shop Hoodie',
        last_order_date: nowIso,
        updated_at: nowIso,
      };
    } else if (preset === 'repeat_diagnostic') {
      memPatch = {
        total_orders: 0,
        diagnostic_count: 2,
        last_diagnosed_bike: '2022 Harley-Davidson Road Glide ST',
        last_symptom: 'Primary chain rattle at idle',
        updated_at: nowIso,
      };
    }

    const { data: memData, error: memErr } = await adminDb
      .from('customer_memory')
      .update(memPatch)
      .eq('user_id', targetId)
      .select('*')
      .single();

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 400 });
    }
    updatedMemory = normalizeCustomerMemoryRow(memData as Record<string, unknown>);
  }

  let updatedProfile = targetProfile;
  if (hasProfileChange) {
    const { data: profData, error: updateError } = await adminDb
      .from('profiles')
      .update(patch)
      .eq('id', targetId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    updatedProfile = (profData as Record<string, unknown>) ?? targetProfile;
  }

  return NextResponse.json({
    user: updatedProfile,
    customerMemory: updatedMemory,
  });
}
