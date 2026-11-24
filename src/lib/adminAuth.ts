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

export interface AuthenticatedUser {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  provider: string;
}

export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminAllowlist().includes(email.trim().toLowerCase());
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

export function extractBearerToken(req: Request | NextRequest): string {
  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

export async function getAuthenticatedUser(
  req: Request | NextRequest,
): Promise<{ user: AuthenticatedUser | null; tokenPresent: boolean; error?: string }> {
  const token = extractBearerToken(req);
  if (!token) {
    return { user: null, tokenPresent: false };
  }

  const verifier = getSupabaseAdminClient() ?? getSupabaseClient();
  if (!verifier) {
    return {
      user: null,
      tokenPresent: true,
      error: 'Supabase authentication client is not configured.',
    };
  }

  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) {
    return {
      user: null,
      tokenPresent: true,
      error: 'Invalid or expired session. Please sign in again.',
    };
  }

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
        ? meta.name
        : '';
  const avatarUrl =
    typeof meta.avatar_url === 'string'
      ? meta.avatar_url
      : typeof meta.picture === 'string'
        ? meta.picture
        : null;

  return {
    tokenPresent: true,
    user: {
      userId: data.user.id,
      email: (data.user.email ?? '').trim().toLowerCase(),
      fullName: fullName.trim(),
      avatarUrl,
      provider: typeof appMeta.provider === 'string' ? appMeta.provider : 'email',
    },
  };
}

export type AdminAuthResult =
  | { ok: true; email: string; userId: string; isSuperAdmin: boolean }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function requireAdminAuth(
  req: NextRequest,
  opts: { requireSecretClient?: boolean } = {},
): Promise<AdminAuthResult> {
  const { user, tokenPresent, error } = await getAuthenticatedUser(req);

  if (!tokenPresent) {
    return {
      ok: false,
      status: 401,
      error: 'Sign in with Google or Apple to continue.',
    };
  }

  if (!user) {
    return {
      ok: false,
      status: error?.includes('not configured') ? 503 : 401,
      error: error ?? 'Invalid or expired session. Please sign in again.',
    };
  }

  const adminDb = getSupabaseAdminClient();
  if (opts.requireSecretClient && !adminDb) {
    return {
      ok: false,
      status: 503,
      error:
        'SUPABASE_SECRET_KEY is not configured on the server. Add your sb_secret key to .env.local.',
    };
  }

  const isSuperAdmin = isSuperAdminEmail(user.email);
  let hasProfileAdmin = false;

  if (adminDb) {
    const { data: profile } = await adminDb
      .from('profiles')
      .select('id, role')
      .eq('id', user.userId)
      .maybeSingle();

    hasProfileAdmin = profile?.role === 'admin';

    // Ensure Super Admins from ADMIN_EMAILS always appear as role = 'admin' in profiles
    if (isSuperAdmin && (!profile || profile.role !== 'admin')) {
      const fallbackHandle =
        (user.fullName.split(/\s+/)[0] || user.email.split('@')[0] || 'Admin').slice(0, 24);
      await adminDb.from('profiles').upsert(
        {
          id: user.userId,
          email: user.email,
          full_name: user.fullName,
          display_name: user.fullName || user.email.split('@')[0] || 'Admin',
          mechanic_handle: fallbackHandle,
          avatar_url: user.avatarUrl,
          auth_provider: user.provider,
          role: 'admin',
        },
        { onConflict: 'id' },
      );
    }
  }

  if (!isSuperAdmin && !hasProfileAdmin) {
    return {
      ok: false,
      status: 403,
      error:
        'Signed in, but this account does not have Admin access yet. Ask an existing Admin to promote your account in /admin → Users & Admins.',
    };
  }

  return {
    ok: true,
    email: user.email,
    userId: user.userId,
    isSuperAdmin,
  };
}
