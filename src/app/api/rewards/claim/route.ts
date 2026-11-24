import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { computeRewardTier, getStripeClient } from '@/lib/stripeServer';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generatePromoCode(discountPercent: number): string {
  const token = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FLATRATE-${discountPercent}-${token}`;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const repairOrderId =
    typeof (body as { repairOrderId?: unknown }).repairOrderId === 'string'
      ? (body as { repairOrderId: string }).repairOrderId.trim()
      : '';

  if (!repairOrderId || !UUID_REGEX.test(repairOrderId)) {
    return NextResponse.json(
      {
        error:
          'Rewards require a verified saved repair order on Supabase (real shift completion). Play a shift with Supabase online to claim.',
      },
      { status: 400 },
    );
  }

  const adminDb = getSupabaseAdminClient();
  if (!adminDb) {
    return NextResponse.json(
      {
        error:
          'SUPABASE_SECRET_KEY is not configured yet on the server. Add it in .env.local to issue verified shop rewards.',
        serverConfigured: false,
      },
      { status: 503 },
    );
  }

  const authRes = await getAuthenticatedUser(req);

  // Always verify repair order numbers from Postgres — never trust client scores
  const { data: ro, error: roError } = await adminDb
    .from('repair_orders')
    .select('id, user_id, mechanic_name, efficiency_rating, jobs_completed')
    .eq('id', repairOrderId)
    .maybeSingle();

  if (roError || !ro) {
    return NextResponse.json(
      { error: 'Repair order not found in database.' },
      { status: 404 },
    );
  }

  const efficiency = Number(ro.efficiency_rating);
  const jobsCompleted = Number(ro.jobs_completed);
  const tier = computeRewardTier(efficiency, jobsCompleted);

  if (!tier.eligible || tier.discountPercent === 0) {
    return NextResponse.json(
      {
        error: tier.tierLabel,
        eligible: false,
        efficiencyRating: efficiency,
      },
      { status: 400 },
    );
  }

  // Check for an existing claim for this repair order first (idempotent)
  const { data: existing } = await adminDb
    .from('reward_claims')
    .select(
      'id, repair_order_id, mechanic_name, efficiency_rating, discount_percent, promo_code, redeemed, created_at',
    )
    .eq('repair_order_id', ro.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      claim: existing,
      alreadyClaimed: true,
      tierLabel: tier.tierLabel,
    });
  }

  const promoCode = generatePromoCode(tier.discountPercent);
  let stripeCouponId: string | null = null;
  let stripePromoId: string | null = null;

  const stripe = getStripeClient();
  if (stripe) {
    try {
      const coupon = await stripe.coupons.create({
        percent_off: tier.discountPercent,
        duration: 'once',
        name: `Flat Rate Panic ${tier.discountPercent}% Off`,
        max_redemptions: 1,
      });
      const promo = await stripe.promotionCodes.create({
        promotion: {
          type: 'coupon',
          coupon: coupon.id,
        },
        code: promoCode,
        max_redemptions: 1,
      });
      stripeCouponId = coupon.id;
      stripePromoId = promo.id;
    } catch (err) {
      console.error('[api/rewards/claim] Stripe promo creation failed:', err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'Stripe promo generation failed.',
        },
        { status: 500 },
      );
    }
  }

  const { data: inserted, error: insertError } = await adminDb
    .from('reward_claims')
    .insert({
      repair_order_id: ro.id,
      user_id: authRes.user?.userId ?? ro.user_id ?? null,
      mechanic_name: ro.mechanic_name,
      efficiency_rating: efficiency,
      discount_percent: tier.discountPercent,
      promo_code: promoCode,
      stripe_coupon_id: stripeCouponId,
      stripe_promo_id: stripePromoId,
      redeemed: false,
    })
    .select(
      'id, repair_order_id, mechanic_name, efficiency_rating, discount_percent, promo_code, redeemed, created_at',
    )
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raceClaim } = await adminDb
        .from('reward_claims')
        .select(
          'id, repair_order_id, mechanic_name, efficiency_rating, discount_percent, promo_code, redeemed, created_at',
        )
        .eq('repair_order_id', ro.id)
        .maybeSingle();
      if (raceClaim) {
        return NextResponse.json({
          claim: raceClaim,
          alreadyClaimed: true,
          tierLabel: tier.tierLabel,
        });
      }
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      claim: inserted,
      alreadyClaimed: false,
      stripeSynced: Boolean(stripePromoId),
      tierLabel: tier.tierLabel,
    },
    { status: 201 },
  );
}
