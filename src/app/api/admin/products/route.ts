import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import type { CheckoutMode, RackSlot, ShopDepartment } from '@/types/shop';

const VALID_RACK_SLOTS: RackSlot[] = [
  'rack_1_humor',
  'rack_2_definition',
  'wall_braap',
  'parts_shelf',
  'hard_r_originals',
];

const VALID_DEPARTMENTS: ShopDepartment[] = ['APPAREL', 'PARTS'];
const VALID_MODES: CheckoutMode[] = ['shopify_link', 'stripe_diy', 'stripe_pod'];

function slugifyHandle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function parseStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from('products')
    .select(
      'id, handle, title, collection, rack_slot, department, checkout_mode, external_url, price_min, price_max, colors, sizes, tags, fit_notes, image_url, active, sort_order, created_at, updated_at',
    )
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const rawHandle = typeof body.handle === 'string' && body.handle.trim() ? body.handle : title;
  const handle = slugifyHandle(rawHandle);
  const collection =
    typeof body.collection === 'string' && body.collection.trim()
      ? body.collection.trim()
      : 'Hard R Originals';
  const rackSlot = VALID_RACK_SLOTS.includes(body.rack_slot as RackSlot)
    ? (body.rack_slot as RackSlot)
    : 'hard_r_originals';
  const department = VALID_DEPARTMENTS.includes(body.department as ShopDepartment)
    ? (body.department as ShopDepartment)
    : 'APPAREL';
  const checkoutMode = VALID_MODES.includes(body.checkout_mode as CheckoutMode)
    ? (body.checkout_mode as CheckoutMode)
    : 'stripe_diy';
  const externalUrl =
    typeof body.external_url === 'string' && body.external_url.trim()
      ? body.external_url.trim()
      : null;
  const priceMin = Number(body.price_min);
  const priceMax =
    body.price_max !== undefined && body.price_max !== ''
      ? Number(body.price_max)
      : priceMin;
  const imageUrl =
    typeof body.image_url === 'string' && body.image_url.trim()
      ? body.image_url.trim()
      : '/brand/hard-r-cycles-logo.png';
  const fitNotes = typeof body.fit_notes === 'string' ? body.fit_notes.trim() : '';
  const active = body.active !== false;
  const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 5;

  if (!title || !handle) {
    return NextResponse.json({ error: 'Product title and handle are required.' }, { status: 400 });
  }
  if (!Number.isFinite(priceMin) || priceMin < 0 || !Number.isFinite(priceMax) || priceMax < priceMin) {
    return NextResponse.json(
      { error: 'Price min/max must be valid non-negative numbers with max >= min.' },
      { status: 400 },
    );
  }
  if (checkoutMode === 'shopify_link' && !externalUrl) {
    return NextResponse.json(
      { error: 'Shopify Link mode requires an External URL.' },
      { status: 400 },
    );
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from('products')
    .insert({
      handle,
      title,
      collection,
      rack_slot: rackSlot,
      department,
      checkout_mode: checkoutMode,
      external_url: externalUrl,
      price_min: Number(priceMin.toFixed(2)),
      price_max: Number(priceMax.toFixed(2)),
      colors: parseStringArray(body.colors),
      sizes: parseStringArray(body.sizes),
      tags: parseStringArray(body.tags),
      fit_notes: fitNotes,
      image_url: imageUrl,
      active,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'Missing product id for update.' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.collection === 'string' && body.collection.trim()) {
    patch.collection = body.collection.trim();
  }
  if (VALID_RACK_SLOTS.includes(body.rack_slot as RackSlot)) {
    patch.rack_slot = body.rack_slot;
  }
  if (VALID_DEPARTMENTS.includes(body.department as ShopDepartment)) {
    patch.department = body.department;
  }
  if (VALID_MODES.includes(body.checkout_mode as CheckoutMode)) {
    patch.checkout_mode = body.checkout_mode;
  }
  if (body.external_url !== undefined) {
    patch.external_url =
      typeof body.external_url === 'string' && body.external_url.trim()
        ? body.external_url.trim()
        : null;
  }
  if (body.price_min !== undefined) {
    const pMin = Number(body.price_min);
    if (!Number.isFinite(pMin) || pMin < 0) {
      return NextResponse.json({ error: 'Invalid price_min.' }, { status: 400 });
    }
    patch.price_min = Number(pMin.toFixed(2));
  }
  if (body.price_max !== undefined) {
    const pMax = Number(body.price_max);
    if (!Number.isFinite(pMax) || pMax < 0) {
      return NextResponse.json({ error: 'Invalid price_max.' }, { status: 400 });
    }
    patch.price_max = Number(pMax.toFixed(2));
  }
  if (body.colors !== undefined) patch.colors = parseStringArray(body.colors);
  if (body.sizes !== undefined) patch.sizes = parseStringArray(body.sizes);
  if (body.tags !== undefined) patch.tags = parseStringArray(body.tags);
  if (typeof body.fit_notes === 'string') patch.fit_notes = body.fit_notes.trim();
  if (typeof body.image_url === 'string' && body.image_url.trim()) {
    patch.image_url = body.image_url.trim();
  }
  if (typeof body.active === 'boolean') patch.active = body.active;
  if (body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))) {
    patch.sort_order = Number(body.sort_order);
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from('products')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const idParam = req.nextUrl.searchParams.get('id')?.trim();
  if (!idParam) {
    return NextResponse.json({ error: 'Missing id query parameter.' }, { status: 400 });
  }

  const adminDb = getSupabaseAdminClient()!;
  const { error } = await adminDb.from('products').delete().eq('id', idParam);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ deleted: true, id: idParam });
}
