import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getStripeClient } from '@/lib/stripeServer';
import {
  determineFulfillmentMode,
  dispatchFulfillment,
  type FulfillableItem,
} from '@/lib/fulfillment';
import type { CheckoutMode } from '@/types/shop';

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook secret or secret key is not configured.' },
      { status: 503 },
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.warn('[webhook/stripe] Invalid signature:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 },
    );
  }

  const adminDb = getSupabaseAdminClient();
  if (!adminDb) {
    return NextResponse.json(
      { error: 'SUPABASE_SECRET_KEY is not configured for order persistence.' },
      { status: 503 },
    );
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const eventSession = event.data.object as Stripe.Checkout.Session;
    if (eventSession.payment_status !== 'paid') {
      return NextResponse.json({ received: true, skipped: 'unpaid' });
    }

    // Idempotency guard: avoid duplicating orders or Printful drafts on Stripe retries
    const { data: existingOrder } = await adminDb
      .from('orders')
      .select('id')
      .eq('stripe_session_id', eventSession.id)
      .maybeSingle();

    if (existingOrder) {
      return NextResponse.json({ received: true, idempotent: true, orderId: existingOrder.id });
    }

    const fullSession = await stripe.checkout.sessions.retrieve(eventSession.id, {
      expand: ['line_items.data.price.product'],
    });

    const items: FulfillableItem[] = [];
    for (const line of fullSession.line_items?.data ?? []) {
      const productObj =
        line.price?.product && typeof line.price.product !== 'string' && !('deleted' in line.price.product)
          ? line.price.product
          : null;
      const meta = productObj?.metadata ?? {};
      const qty = Math.max(1, line.quantity ?? 1);
      const unitCents = Math.round((line.amount_subtotal ?? 0) / qty);
      const mode: CheckoutMode =
        meta.checkout_mode === 'stripe_pod' || meta.checkout_mode === 'shopify_link'
          ? meta.checkout_mode
          : 'stripe_diy';

      items.push({
        handle: meta.handle || productObj?.id || 'custom-item',
        title: line.description || productObj?.name || 'Hard R Cycles Gear',
        quantity: qty,
        size: meta.size || 'One Size',
        color: meta.color || 'Standard',
        unitPriceCents: unitCents,
        checkoutMode: mode,
      });
    }

    const fulfillmentMode = determineFulfillmentMode(items.map((i) => i.checkoutMode));
    const shippingDetails = fullSession.collected_information?.shipping_details ?? null;
    const customerEmail =
      fullSession.customer_details?.email ||
      fullSession.customer_email ||
      'unknown@hardrcycles.local';

    const subtotal = Number(((fullSession.amount_subtotal ?? 0) / 100).toFixed(2));
    const shippingCost = Number(((fullSession.shipping_cost?.amount_total ?? 0) / 100).toFixed(2));
    const total = Number(((fullSession.amount_total ?? 0) / 100).toFixed(2));

    const { data: insertedOrder, error: insertError } = await adminDb
      .from('orders')
      .insert({
        stripe_session_id: fullSession.id,
        customer_email: customerEmail,
        shipping_name: shippingDetails?.name ?? fullSession.customer_details?.name ?? null,
        shipping_address: shippingDetails?.address ?? null,
        items,
        subtotal,
        shipping_cost: shippingCost,
        total,
        currency: fullSession.currency ?? 'usd',
        fulfillment_mode: fulfillmentMode,
        status: 'paid',
      })
      .select('id')
      .single();

    if (insertError) {
      // Unique violation means concurrent webhook delivery already wrote it
      if (insertError.code === '23505') {
        return NextResponse.json({ received: true, idempotent: true });
      }
      console.error('[webhook/stripe] DB insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const dispatchResult = await dispatchFulfillment({
      orderId: insertedOrder.id,
      customerEmail,
      shipping: shippingDetails,
      items,
    });

    if (dispatchResult.initialStatus !== 'paid') {
      await adminDb
        .from('orders')
        .update({ status: dispatchResult.initialStatus })
        .eq('id', insertedOrder.id);
    }

    const rewardClaimId = fullSession.metadata?.reward_claim_id?.trim();
    const promoCode = fullSession.metadata?.promo_code?.trim().toUpperCase();
    if (rewardClaimId) {
      await adminDb
        .from('reward_claims')
        .update({
          redeemed: true,
          redeemed_order_id: insertedOrder.id,
          redeemed_at: new Date().toISOString(),
        })
        .eq('id', rewardClaimId);
    } else if (promoCode) {
      await adminDb
        .from('reward_claims')
        .update({
          redeemed: true,
          redeemed_order_id: insertedOrder.id,
          redeemed_at: new Date().toISOString(),
        })
        .eq('promo_code', promoCode);
    }

    return NextResponse.json({
      received: true,
      orderId: insertedOrder.id,
      fulfillmentMode,
      podNote: dispatchResult.podNote,
    });
  }

  return NextResponse.json({ received: true });
}
