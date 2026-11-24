'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserAuthClient } from '@/lib/supabaseClient';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    const run = async () => {
      const client = getSupabaseBrowserAuthClient();
      if (!client) {
        setErrorMsg('Supabase client keys are not configured.');
        return;
      }

      const oauthError =
        searchParams.get('error_description') || searchParams.get('error');
      if (oauthError) {
        setErrorMsg(oauthError);
        return;
      }

      const code = searchParams.get('code');
      let accessToken = '';

      if (code) {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        accessToken = data.session?.access_token ?? '';
      } else {
        const { data } = await client.auth.getSession();
        accessToken = data.session?.access_token ?? '';
      }

      if (accessToken) {
        try {
          await fetch('/api/profile?login=1', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch {
          // Profile sync will retry on destination page mount
        }
      }

      const rawNext = searchParams.get('next') ?? '/';
      const safeNext =
        rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
      router.replace(safeNext);
    };

    void run();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-900 p-4 text-black">
      <div className="w-full max-w-md rounded-3xl border-4 border-black bg-amber-50 p-6 text-center shadow-[10px_10px_0px_#000]">
        {errorMsg ? (
          <>
            <h1 className="text-xl font-black uppercase text-red-700">
              Sign-In Interrupted
            </h1>
            <p className="mt-2 text-xs font-bold text-zinc-700">{errorMsg}</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                href="/"
                className="rounded-xl border-3 border-black bg-amber-300 px-4 py-2 text-xs font-black uppercase text-black shadow-[3px_3px_0px_#000]"
              >
                Back to Shop Floor
              </Link>
              <Link
                href="/admin"
                className="rounded-xl border-3 border-black bg-white px-4 py-2 text-xs font-black uppercase text-black shadow-[3px_3px_0px_#000]"
              >
                Try /admin
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">
              HARD R CYCLES GARAGE PASS
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase">
              Signing You In...
            </h1>
            <p className="mt-2 text-xs font-bold text-zinc-600">
              Syncing your rider profile, saved garage, and permissions.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-stone-900 p-6 text-sm font-black uppercase text-amber-300">
          Completing SSO sign-in...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
