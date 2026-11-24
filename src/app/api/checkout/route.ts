import { NextRequest, NextResponse } from 'next/server';
import { FALLBACK_CATALOG } from '@/data/fallbackCatalog';
import { getAuthenticatedUser } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  getShippingPolicy,
  getStripeClient,
  resolveSiteOrigin,
} from '@/lib/stripeServer';
import { determineFulfillmentMode } from '@/lib/fulfillment';
import type { CheckoutMode, ShopProduct } from '@/types/shop';

interface CheckoutItemInput {
  handle: string;
  quantity: number;
  size?: string;
  color?: string;
}

function resolveAbsoluteImageUrl(origin: string, imageUrl: string | undefined): string[] {
  if (!imageUrl) return [];
  if (imageUrl.startsWith('https://') || imageUrl.startsWith('http://')) {
    return [imageUrl];
  }
  if (imageUrl.startsWith('/')) {
    return [`${origin}${imageUrl}`];
  }
  return [];
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const rawItems = Array.isArray((body as { items?: unknown }).items)
    ? ((body as { items: unknown[] }).items as CheckoutItemInput[])
    : [];
  const rawPromoCode =
    typeof (body as { promoCode?: unknown }).promoCode === 'string'
      ? (body as { promoCode: string }).promoCode.trim().toUpperCase()
      : '';

  if (rawItems.length === 0 || rawItems.length > 20) {
    return NextResponse.json(
      { error: 'Cart must contain between 1 and 20 line items.' },
      { status: 400 },
    );
  }

  const normalizedItems = rawItems
    .map((item) => ({
      handle: typeof item.handle === 'string' ? item.handle.trim() : '',
      quantity: Math.floor(Number(item.quantity)),
      size: typeof item.size === 'string' && item.size.trim() ? item.size.trim() : 'One Size',
      color:
        typeof item.color === 'string' && item.color.trim() ? item.color.trim() : 'Standard',
    }))
    .filter(
      (item) =>
        item.handle.length > 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 20,
    );

  if (normalizedItems.length !== rawItems.length) {
    return NextResponse.json(
      { error: 'Each cart item requires a valid product handle and quantity (1-20).' },
      { status: 400 },
    );
  }

  const handles = Array.from(new Set(normalizedItems.map((i) => i.handle)));
  const productMap = new Map<string, ShopProduct>();

  const db = getSupabaseAdminClient() ?? getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from('products')
      .select(
        'id, handle, title, collection, rack_slot, department, checkout_mode, external_url, price_min, price_max, colors, sizes, tags, fit_notes, image_url, active, sort_order',
      )
      .in('handle', handles)
      .eq('active', true);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        productMap.set(row.handle, {
          ...row,
          price_min: Number(row.price_min),
          price_max: Number(row.price_max),
          colors: Array.isArray(row.colors) ? row.colors : [],
          sizes: Array.isArray(row.sizes) ? row.sizes : [],
          tags: Array.isArray(row.tags) ? row.tags : [],
        });
      }
    }
  }

  // Fallback for local/offline mode only when handle isn't returned from DB
  for (const fallback of FALLBACK_CATALOG) {
    if (fallback.active && handles.includes(fallback.handle) && !productMap.has(fallback.handle)) {
      productMap.set(fallback.handle, fallback);
    }
  }

  const resolvedLineSpecs: Array<{
    product: ShopProduct;
    quantity: number;
    size: string;
    color: string;
    unitPriceCents: number;
  }> = [];

  for (const item of normalizedItems) {
    const product = productMap.get(item.handle);
    if (!product) {
      return NextResponse.json(
        { error: `Product "${item.handle}" is unavailable or no longer active.` },
        { status: 400 },
      );
    }
    if (product.checkout_mode === 'shopify_link') {
      return NextResponse.json(
        {
          error: `"${product.title}" is fulfilled through MotophileUSA.com. Use the Shop on MotophileUSA button instead.`,
        },
        { status: 400 },
      );
    }
    const unitPriceCents = Math.round(Number(product.price_min) * 100);
    if (!Number.isFinite(unitPriceCents) || unitPriceCents < 50) {
      return NextResponse.json(
        { error: `Invalid server price configured for "${product.title}".` },
        { status: 400 },
      );
    }
    resolvedLineSpecs.push({
      product,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      unitPriceCents,
    });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          'Stripe Checkout is not configured yet on this deployment. Add STRIPE_SECRET_KEY in .env.local to accept direct payments.',
        stripeConfigured: false,
      },
      { status: 503 },
    );
  }

  const origin = resolveSiteOrigin(req);
  const { flatRateCents, freeThresholdCents, automaticTax } = getShippingPolicy();
  const subtotalCents = resolvedLineSpecs.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const qualifiesFreeShipping = subtotalCents >= freeThresholdCents;
  const fulfillmentMode = determineFulfillmentMode(
    resolvedLineSpecs.map((l) => l.product.checkout_mode as CheckoutMode),
  );

  // Optional promo code verification against server reward_claims or active Stripe promotion codes
  let matchedRewardClaimId = '';
  let stripePromotionCodeId = '';

  if (rawPromoCode) {
    const adminDb = getSupabaseAdminClient();
    if (adminDb) {
      const { data: claim } = await adminDb
        .from('reward_claims')
        .select('id, stripe_promo_id, redeemed')
        .eq('promo_code', rawPromoCode)
        .maybeSingle();

      if (claim) {
        if (claim.redeemed) {
          return NextResponse.json(
            { error: `Promo code "${rawPromoCode}" has already been redeemed.` },
            { status: 400 },
          );
        }
        matchedRewardClaimId = claim.id;
        if (claim.stripe_promo_id) {
          stripePromotionCodeId = claim.stripe_promo_id;
        }
      }
    }

    if (!stripePromotionCodeId) {
      const promoList = await stripe.promotionCodes.list({
        code: rawPromoCode,
        active: true,
        limit: 1,
      });
      const found = promoList.data[0];
      if (!found) {
        return NextResponse.json(
          { error: `Promo code "${rawPromoCode}" is invalid or expired.` },
          { status: 400 },
        );
      }
      stripePromotionCodeId = found.id;
    }
  }

  const authResult = await getAuthenticatedUser(req);
  const authenticatedUserId = authResult.user?.userId ?? '';
  const authenticatedEmail = authResult.user?.email || undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ...(authenticatedEmail ? { customer_email: authenticatedEmail } : {}),
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      shipping_options: [
        qualifiesFreeShipping
          ? {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: { amount: 0, currency: 'usd' },
                display_name: 'Free Shop Ground Shipping ($125+ Order)',
                delivery_estimate: {
                  minimum: { unit: 'business_day', value: 3 },
                  maximum: { unit: 'business_day', value: 7 },
                },
              },
            }
          : {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: { amount: flatRateCents, currency: 'usd' },
                display_name: 'Standard Garage Ground Shipping',
                delivery_estimate: {
                  minimum: { unit: 'business_day', value: 3 },
                  maximum: { unit: 'business_day', value: 7 },
                },
              },
            },
      ],
      ...(automaticTax ? { automatic_tax: { enabled: true } } : {}),
      ...(stripePromotionCodeId
        ? { discounts: [{ promotion_code: stripePromotionCodeId }] }
        : { allow_promotion_codes: true }),
      line_items: resolvedLineSpecs.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: line.unitPriceCents,
          product_data: {
            name: `${line.product.title} (${line.size} / ${line.color})`,
            description: `${line.product.collection} — Hard R Cycles`,
            images: resolveAbsoluteImageUrl(origin, line.product.image_url),
            metadata: {
              handle: line.product.handle,
              checkout_mode: line.product.checkout_mode,
              size: line.size,
              color: line.color,
            },
          },
        },
      })),
      metadata: {
        fulfillment_mode: fulfillmentMode,
        reward_claim_id: matchedRewardClaimId,
        promo_code: rawPromoCode,
        user_id: authenticatedUserId,
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      fulfillmentMode,
    });
  } catch (err) {
    console.error('[api/checkout] Stripe create session failed:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Unable to initialize Stripe Checkout session.',
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id query parameter.' }, { status: 400 });
  }

  const adminDb = getSupabaseAdminClient();
  if (adminDb) {
    const { data: orderRow } = await adminDb
      .from('orders')
      .select(
        'id, stripe_session_id, subtotal, shipping_cost, total, currency, fulfillment_mode, status, tracking_number, items, created_at',
      )
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (orderRow) {
      return NextResponse.json({ source: 'database', order: orderRow });
    }
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      {
        source: 'pending',
        message: 'Order confirmation recorded; Stripe detail lookup unavailable until keys are set.',
      },
      { status: 200 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    return NextResponse.json({
      source: 'stripe',
      order: {
        stripe_session_id: session.id,
        status: session.payment_status === 'paid' ? 'paid' : session.payment_status,
        subtotal: ((session.amount_subtotal ?? 0) / 100).toFixed(2),
        shipping_cost: (((session.shipping_cost?.amount_total ?? 0) as number) / 100).toFixed(2),
        total: ((session.amount_total ?? 0) / 100).toFixed(2),
        currency: session.currency ?? 'usd',
        fulfillment_mode: session.metadata?.fulfillment_mode ?? 'diy',
        items:
          session.line_items?.data.map((li) => ({
            title: li.description ?? 'Hard R Cycles Item',
            quantity: li.quantity ?? 1,
            amountTotal: (li.amount_total ?? 0) / 100,
          })) ?? [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Checkout session not found.',
      },
      { status: 404 },
    );
  }
}
