import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null | undefined;
let cachedAuthClient: SupabaseClient | null | undefined;

function readPublicEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const env = readPublicEnv();
  if (!env) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

export function getSupabaseBrowserAuthClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return getSupabaseClient();
  }
  if (cachedAuthClient !== undefined) {
    return cachedAuthClient;
  }

  const env = readPublicEnv();
  if (!env) {
    cachedAuthClient = null;
    return null;
  }

  cachedAuthClient = createClient(env.url, env.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedAuthClient;
}
