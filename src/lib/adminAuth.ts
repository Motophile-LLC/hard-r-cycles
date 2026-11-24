import type { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getSupabaseAdminClient, getSupabaseSecretKey } from '@/lib/supabaseAdmin';

export interface AdminSetupStatus {
  supabaseUrlConfigured: boolean;
  publishableKeyConfigured: boolean;
  supabaseSecretConfigured: boolean;
  adminAllowlistConfigured: boolean;
  stripeSecretConfigured: boolean;
  stripeWebhookConfigured: boolean;
  printfulConfigured: boolean;
  adminWritesReady: boolean;
  stripeCheckoutReady: boolean;
}

export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminSetupStatus(): AdminSetupStatus {
  const supabaseUrlConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const publishableKeyConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
  const supabaseSecretConfigured = Boolean(getSupabaseSecretKey());
  const adminAllowlistConfigured = getAdminAllowlist().length > 0;
  const stripeSecretConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const stripeWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const printfulConfigured = Boolean(process.env.PRINTFUL_API_TOKEN?.trim());

  return {
    supabaseUrlConfigured,
    publishableKeyConfigured,
    supabaseSecretConfigured,
    adminAllowlistConfigured,
    stripeSecretConfigured,
    stripeWebhookConfigured,
    printfulConfigured,
    adminWritesReady:
      supabaseUrlConfigured && supabaseSecretConfigured && adminAllowlistConfigured,
    stripeCheckoutReady: stripeSecretConfigured && supabaseSecretConfigured,
  };
}

export type AdminAuthResult =
  | { ok: true; email: string; userId: string }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function requireAdminAuth(
  req: NextRequest,
  opts: { requireSecretClient?: boolean } = {},
): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Missing Bearer authentication token. Sign in as an admin first.',
    };
  }

  const verifier = getSupabaseAdminClient() ?? getSupabaseClient();
  if (!verifier) {
    return {
      ok: false,
      status: 503,
      error: 'Supabase authentication client is not configured.',
    };
  }

  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) {
    return {
      ok: false,
      status: 401,
      error: 'Invalid or expired admin session. Please sign in again.',
    };
  }

  const allowlist = getAdminAllowlist();
  if (allowlist.length === 0) {
    return {
      ok: false,
      status: 503,
      error:
        'ADMIN_EMAILS is not configured on the server. Add your admin email(s) to .env.local.',
    };
  }

  const verifiedEmail = (data.user.email ?? '').trim().toLowerCase();
  if (!verifiedEmail || !allowlist.includes(verifiedEmail)) {
    return {
      ok: false,
      status: 403,
      error: 'Authenticated account is not on the ADMIN_EMAILS allowlist.',
    };
  }

  if (opts.requireSecretClient && !getSupabaseAdminClient()) {
    return {
      ok: false,
      status: 503,
      error:
        'SUPABASE_SECRET_KEY is not configured on the server. Add your sb_secret key to .env.local for admin mutations.',
    };
  }

  return {
    ok: true,
    email: verifiedEmail,
    userId: data.user.id,
  };
}
