import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminDb = getSupabaseAdminClient()!;
  const [claimsRes, leaderboardRes] = await Promise.all([
    adminDb
      .from('reward_claims')
      .select(
        'id, repair_order_id, mechanic_name, efficiency_rating, discount_percent, promo_code, redeemed, redeemed_order_id, redeemed_at, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(100),
    adminDb
      .from('repair_orders')
      .select(
        'id, mechanic_name, billed_hours, actual_hours, efficiency_rating, shop_damage_cost, rank_badge, jobs_completed, created_at',
      )
      .order('efficiency_rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  if (claimsRes.error) {
    return NextResponse.json({ error: claimsRes.error.message }, { status: 500 });
  }
  if (leaderboardRes.error) {
    return NextResponse.json({ error: leaderboardRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    claims: claimsRes.data ?? [],
    leaderboard: leaderboardRes.data ?? [],
  });
}
