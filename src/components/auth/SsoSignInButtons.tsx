'use client';

import { useState } from 'react';
import { getSupabaseBrowserAuthClient } from '@/lib/supabaseClient';

interface SsoSignInButtonsProps {
  nextPath?: string;
  compact?: boolean;
}

export function SsoSignInButtons({
  nextPath = '/',
  compact = false,
}: SsoSignInButtonsProps) {
  const [busyProvider, setBusyProvider] = useState<'google' | 'apple' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setErrorMsg(null);
    const client = getSupabaseBrowserAuthClient();
    if (!client) {
      setErrorMsg('Authentication is not configured on this environment.');
      return;
    }

    setBusyProvider(provider);
    try {
      const origin = window.location.origin;
      const safeNext =
        nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
          queryParams:
            provider === 'google'
              ? { prompt: 'select_account' }
              : undefined,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setBusyProvider(null);
      }
    } catch {
      setErrorMsg('Unable to start single sign-on. Please try again.');
      setBusyProvider(null);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className={compact ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2.5'}>
        <button
          type="button"
          disabled={busyProvider !== null}
          onClick={() => handleOAuth('google')}
          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-3 border-black bg-white px-4 py-2.5 text-sm font-black uppercase text-black shadow-[4px_4px_0px_#000] transition-transform hover:-translate-y-0.5 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z"
            />
          </svg>
          <span>
            {busyProvider === 'google' ? 'Connecting Google...' : 'Continue with Google'}
          </span>
        </button>

        <button
          type="button"
          disabled={busyProvider !== null}
          onClick={() => handleOAuth('apple')}
          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-3 border-black bg-zinc-900 px-4 py-2.5 text-sm font-black uppercase text-white shadow-[4px_4px_0px_#000] transition-transform hover:-translate-y-0.5 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
          </svg>
          <span>
            {busyProvider === 'apple' ? 'Connecting Apple...' : 'Continue with Apple'}
          </span>
        </button>
      </div>

      {errorMsg ? (
        <div
          role="alert"
          className="rounded-xl border-2 border-red-700 bg-red-100 px-3 py-2 text-xs font-bold text-red-900"
        >
          {errorMsg}
        </div>
      ) : null}
    </div>
  );
}
