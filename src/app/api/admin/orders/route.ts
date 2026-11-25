import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const VALID_STATUSES = [
  'paid',
  'fulfilling',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from('orders')
    .select(
      'id, stripe_session_id, customer_email, shipping_name, shipping_address, items, subtotal, shipping_cost, total, currency, fulfillment_mode, status, tracking_number, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { id?: unknown; status?: unknown; tracking_number?: unknown };
  try {
    body = (await req.json()) as { id?: unknown; status?: unknown; tracking_number?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'Missing order id.' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.status === 'string') {
    if (!VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json({ error: 'Invalid order status value.' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.tracking_number !== undefined) {
    patch.tracking_number =
      typeof body.tracking_number === 'string' && body.tracking_number.trim()
        ? body.tracking_number.trim()
        : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from('orders')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ order: data });
}
