'use client';

import { ArrowLeft, ExternalLink, FileScan, ShieldCheck, Timer } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import {
  FLAT_RATE_MASTER_REFERRAL_URL,
  FLAT_RATE_MASTER_REF_CODE,
  trackShopEvent,
} from '@/lib/analytics';
import { useShopStore } from '@/store/useShopStore';
import { withSpriteVersion } from '@/utils/spriteVersion';

export function FlatRateMasterModal() {
  const openDrawer = useShopStore((s) => s.openDrawer);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isOpen = openDrawer === 'FLAT_RATE_MASTER';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Safari fallback for closedby="any" light dismiss
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const card = dialog.querySelector('[data-frm-card="true"]');
      if (!card) return false;
      const r = card.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
    };

    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, []);

  const handleClose = () => {
    useShopStore.getState().setOpenDrawer(null);
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="flat-rate-master-title"
      onClose={(e) => {
        e.currentTarget.returnValue = '';
        if (useShopStore.getState().openDrawer === 'FLAT_RATE_MASTER') {
          useShopStore.getState().setOpenDrawer(null);
        }
      }}
      className="m-auto max-h-[90dvh] w-[min(94dvw,560px)] overflow-y-auto border-0 bg-transparent p-0 text-black"
    >
      <div
        data-frm-card="true"
        className="rounded-3xl border-4 border-black bg-amber-50 p-5 shadow-[12px_12px_0px_#000]"
      >
        <div className="flex items-start justify-between gap-3 border-b-4 border-black pb-3">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-3 border-black bg-amber-200 shadow-[3px_3px_0px_#000]">
              <Image
                src={withSpriteVersion('/sprites/portraits/dick-stoked.png')}
                alt="Dick backing Flat Rate Master"
                fill
                className="object-contain object-top pt-0.5"
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Technician-First Flat-Rate SaaS
              </p>
              <h1
                id="flat-rate-master-title"
                className="text-2xl font-black uppercase leading-tight"
              >
                Flat Rate Master
              </h1>
            </div>
          </div>

          <button
            type="button"
            autoFocus
            onClick={handleClose}
            aria-label="Back to full shop"
            className="flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1 rounded-xl border-2 border-black bg-amber-300 px-2.5 py-1 text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] hover:bg-amber-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back</span>
          </button>
        </div>

        {/* Dick Endorsement Blurb */}
        <div className="mt-4 rounded-2xl border-3 border-black bg-zinc-900 p-3.5 text-white shadow-[4px_4px_0px_#000]">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
            DICK&apos;S SHOP FLOOR WORD:
          </p>
          <p className="mt-1 text-xs font-bold leading-snug text-zinc-100 sm:text-sm">
            &ldquo;Even I hate when shops shave tenths off a tech&apos;s ticket. Log every RO yourself and catch missing hours before payday.&rdquo;
          </p>
        </div>

        {/* 3 Core Feature Highlights */}
        <div className="mt-3.5 space-y-2">
          <div className="flex items-start gap-2.5 rounded-2xl border-3 border-black bg-white p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-amber-300">
              <Timer className="h-5 w-5 text-black" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase text-black">
                Independent Hour &amp; RO Log
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-zinc-700">
                Track every RO number, job line, and flagged tenths in real time so your own tally never depends on a service writer&apos;s spreadsheet.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border-3 border-black bg-white p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-emerald-300">
              <FileScan className="h-5 w-5 text-black" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase text-black">
                Vision AI RO Scanner &amp; Payday Audit
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-zinc-700">
                Scan repair orders, catch missing hours or forgotten lines, and calculate estimated gross pay before check day.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border-3 border-black bg-white p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-cyan-200">
              <ShieldCheck className="h-5 w-5 text-black" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase text-black">
                100% Local-First Device Privacy
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-zinc-700">
                Your logs stay privately on your own device — zero dealership management snooping on your personal hours.
              </p>
            </div>
          </div>
        </div>

        {/* Primary External CTA */}
        <div className="mt-4 flex flex-col gap-2">
          <a
            href={FLAT_RATE_MASTER_REFERRAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-analytics-event="poster_click_flatratemaster"
            onClick={() =>
              trackShopEvent(
                'poster_click_flatratemaster',
                {
                  ref: FLAT_RATE_MASTER_REF_CODE,
                  targetUrl: FLAT_RATE_MASTER_REFERRAL_URL,
                  source: 'flat_rate_master_modal',
                },
                useShopStore.getState().authAccessToken,
              )
            }
            className="flex items-center justify-center gap-2 rounded-2xl border-4 border-black bg-emerald-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-black shadow-[5px_5px_0px_#000] transition-transform hover:-translate-y-0.5 hover:bg-emerald-300"
          >
            <span>Start Free on Flat Rate Master</span>
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
          <p className="text-center text-[11px] font-bold text-zinc-600">
            flatratemaster.com • Hard R Cycles Partner Referral ({FLAT_RATE_MASTER_REF_CODE})
          </p>
        </div>
      </div>
    </dialog>
  );
}
