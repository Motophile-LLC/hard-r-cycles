'use client';

import { ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useShopStore } from '@/store/useShopStore';

export function FrontDoorGateModal() {
  const isAgeVerified = useShopStore((s) => s.isAgeVerified);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Restore saved 18+ door verification cleanly on client mount
  useEffect(() => {
    try {
      if (window.localStorage.getItem('hardr_18plus_verified_v1') === '1') {
        useShopStore.getState().setAgeVerified(true);
        return;
      }
    } catch {
      // Ignore storage access failures
    }

    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isAgeVerified && dialog.open) {
      dialog.close();
    }
  }, [isAgeVerified]);

  const handleEnterShop = () => {
    useShopStore.getState().setAgeVerified(true);
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="none"
      aria-labelledby="front-door-title"
      onCancel={(e) => {
        if (!useShopStore.getState().isAgeVerified) {
          e.preventDefault();
        }
      }}
      onClose={(e) => {
        e.currentTarget.returnValue = '';
      }}
      className="m-auto max-h-[92dvh] w-[min(94dvw,540px)] overflow-y-auto rounded-3xl border-4 border-black bg-amber-50 p-0 text-black shadow-[12px_12px_0px_#000]"
    >
      <div className="p-5 sm:p-6">
        {/* Clean Official Stencil Logo Banner */}
        <div className="mb-4 overflow-hidden rounded-2xl border-4 border-black bg-black p-3 shadow-[5px_5px_0px_#111]">
          <div className="relative mx-auto h-28 w-full max-w-[360px]">
            <Image
              src="/brand/hard-r-cycles-logo.png"
              alt="Hard R Cycles"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-3 border-black bg-red-600 text-white shadow-[3px_3px_0px_#000]">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-red-700">
              18+ ADULT SHOP HUMOR • NO FILTER
            </p>
            <h1 id="front-door-title" className="text-2xl font-black uppercase leading-tight">
              Wipe Your Boots Before Coming In
            </h1>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border-3 border-black bg-white p-3.5 text-sm font-bold leading-snug text-zinc-800">
          Hard R Cycles features unfiltered biker shop banter, adult humor, and zero corporate customer service. By pushing these doors open, you confirm you are <strong>18+</strong> and won&apos;t cry to HR about what Dick says.
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <a
            href="https://motophileusa.com"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-2xl border-3 border-black bg-zinc-200 px-4 py-3 text-xs font-black uppercase text-zinc-800 shadow-[4px_4px_0px_#000] hover:bg-zinc-300"
          >
            Take Me Somewhere Polite
          </a>
          <button
            type="button"
            autoFocus
            onClick={handleEnterShop}
            className="flex flex-1 cursor-pointer items-center justify-center rounded-2xl border-4 border-black bg-emerald-400 px-5 py-3 text-base font-black uppercase tracking-wide text-black shadow-[5px_5px_0px_#000] transition-transform hover:-translate-y-0.5 hover:bg-emerald-300"
          >
            I&apos;m 18+ — Push Door Open
          </button>
        </div>

        <nav
          aria-label="Shop policies"
          className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t-2 border-black/15 pt-3 text-[11px] font-black uppercase text-zinc-600"
        >
          <Link href="/terms" className="underline hover:text-black">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/privacy" className="underline hover:text-black">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/shipping-returns" className="underline hover:text-black">
            Shipping &amp; Returns
          </Link>
        </nav>
      </div>
    </dialog>
  );
}
