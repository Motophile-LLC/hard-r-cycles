import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustomerMemoryRecord } from './types';

export function isMissingTableError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205';
}

export function normalizeCustomerMemoryRow(
  row: Record<string, unknown>,
): CustomerMemoryRecord {
  const nowIso = new Date().toISOString();
  return {
    user_id: String(row.user_id ?? ''),
    total_orders: Math.max(0, Math.floor(Number(row.total_orders ?? 0) || 0)),
    lifetime_spend: Math.max(
      0,
      Number(Number(row.lifetime_spend ?? 0).toFixed(2)) || 0,
    ),
    purchased_skus: Array.isArray(row.purchased_skus)
      ? row.purchased_skus.map((s) => String(s)).filter(Boolean)
      : [],
    last_order_date:
      typeof row.last_order_date === 'string' ? row.last_order_date : null,
    last_purchased_item:
      typeof row.last_purchased_item === 'string' ? row.last_purchased_item : null,
    diagnostic_count: Math.max(
      0,
      Math.floor(Number(row.diagnostic_count ?? 0) || 0),
    ),
    last_diagnosed_bike:
      typeof row.last_diagnosed_bike === 'string' ? row.last_diagnosed_bike : null,
    last_symptom:
      typeof row.last_symptom === 'string' ? row.last_symptom : null,
    flat_rate_high_score: Math.max(
      0,
      Math.min(300, Number(Number(row.flat_rate_high_score ?? 0).toFixed(2)) || 0),
    ),
    loiter_kick_count: Math.max(
      0,
      Math.floor(Number(row.loiter_kick_count ?? 0) || 0),
    ),
    created_at:
      typeof row.created_at === 'string' ? row.created_at : nowIso,
    updated_at:
      typeof row.updated_at === 'string' ? row.updated_at : nowIso,
  };
}

export async function ensureCustomerMemoryRow(
  adminDb: SupabaseClient,
  userId: string,
): Promise<CustomerMemoryRecord | null> {
  if (!userId) return null;

  const { data: existing, error: selectErr } = await adminDb
    .from('customer_memory')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (selectErr) {
    if (!isMissingTableError(selectErr)) {
      console.warn('[npc-memory] ensure select error:', selectErr.message);
    }
    return null;
  }

  if (existing) {
    return normalizeCustomerMemoryRow(existing as Record<string, unknown>);
  }

  const { data: inserted, error: insertErr } = await adminDb
    .from('customer_memory')
    .upsert({ user_id: userId }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (insertErr) {
    if (!isMissingTableError(insertErr)) {
      console.warn('[npc-memory] ensure upsert error:', insertErr.message);
    }
    return null;
  }

  return normalizeCustomerMemoryRow(inserted as Record<string, unknown>);
}

export async function recordOrderInCustomerMemory(
  adminDb: SupabaseClient,
  params: {
    userId: string | null;
    customerEmail: string;
    orderTotal: number;
    items: Array<{ handle: string; title: string }>;
  },
): Promise<CustomerMemoryRecord | null> {
  let targetUserId = params.userId?.trim() || null;

  if (!targetUserId && params.customerEmail) {
    const cleanEmail = params.customerEmail.trim().toLowerCase();
    if (cleanEmail) {
      const { data: prof } = await adminDb
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (prof?.id) {
        targetUserId = String(prof.id);
      }
    }
  }

  if (!targetUserId) {
    return null;
  }

  const existing = await ensureCustomerMemoryRow(adminDb, targetUserId);
  if (!existing) {
    return null;
  }

  const skuSet = new Set(existing.purchased_skus);
  for (const item of params.items) {
    const cleanHandle = item.handle?.trim();
    if (cleanHandle) skuSet.add(cleanHandle);
  }
  const nextSkus = Array.from(skuSet).slice(0, 50);

  const nowIso = new Date().toISOString();
  const nextOrders = existing.total_orders + 1;
  const addedSpend = Number.isFinite(params.orderTotal)
    ? Math.max(0, params.orderTotal)
    : 0;
  const nextSpend = Number((existing.lifetime_spend + addedSpend).toFixed(2));
  const lastPurchasedItem =
    params.items[0]?.title?.trim() ||
    existing.last_purchased_item ||
    'Hard R Gear';

  const { data: updated, error } = await adminDb
    .from('customer_memory')
    .update({
      total_orders: nextOrders,
      lifetime_spend: nextSpend,
      purchased_skus: nextSkus,
      last_order_date: nowIso,
      last_purchased_item: lastPurchasedItem,
      updated_at: nowIso,
    })
    .eq('user_id', targetUserId)
    .select('*')
    .single();

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn('[npc-memory] order update error:', error.message);
    }
    return existing;
  }

  return normalizeCustomerMemoryRow(updated as Record<string, unknown>);
}

export async function recordShiftInCustomerMemory(
  adminDb: SupabaseClient,
  params: { userId: string; efficiencyRating: number },
): Promise<CustomerMemoryRecord | null> {
  if (!params.userId) return null;

  const existing = await ensureCustomerMemoryRow(adminDb, params.userId);
  if (!existing) return null;

  const safeRating = Math.max(
    0,
    Math.min(300, Number(params.efficiencyRating.toFixed(2)) || 0),
  );
  if (safeRating <= existing.flat_rate_high_score) {
    return existing;
  }

  const { data: updated, error } = await adminDb
    .from('customer_memory')
    .update({
      flat_rate_high_score: safeRating,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', params.userId)
    .select('*')
    .single();

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn('[npc-memory] shift update error:', error.message);
    }
    return existing;
  }

  return normalizeCustomerMemoryRow(updated as Record<string, unknown>);
}

export async function recordLoiterKickInCustomerMemory(
  adminDb: SupabaseClient,
  userId: string,
): Promise<CustomerMemoryRecord | null> {
  if (!userId) return null;

  const existing = await ensureCustomerMemoryRow(adminDb, userId);
  if (!existing) return null;

  const lastUpdateMs = Date.parse(existing.updated_at);
  if (
    existing.loiter_kick_count > 0 &&
    Number.isFinite(lastUpdateMs) &&
    Date.now() - lastUpdateMs < 25_000
  ) {
    return existing;
  }

  const { data: updated, error } = await adminDb
    .from('customer_memory')
    .update({
      loiter_kick_count: existing.loiter_kick_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn('[npc-memory] loiter update error:', error.message);
    }
    return existing;
  }

  return normalizeCustomerMemoryRow(updated as Record<string, unknown>);
}
