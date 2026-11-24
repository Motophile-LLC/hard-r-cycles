'use client';

import { ClipboardList, MessageSquare, Wrench, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { getStaffGreeting } from '@/data/staffDialogue';
import { useShopStore } from '@/store/useShopStore';

export function ServiceCounterModal() {
  const openDrawer = useShopStore((s) => s.openDrawer);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isOpen = openDrawer === 'SERVICE_COUNTER';

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
      const card = dialog.querySelector('[data-counter-card="true"]');
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
      aria-labelledby="service-counter-title"
      onClose={(e) => {
        e.currentTarget.returnValue = '';
        if (useShopStore.getState().openDrawer === 'SERVICE_COUNTER') {
          useShopStore.getState().setOpenDrawer(null);
        }
      }}
      className="m-auto max-h-[90dvh] w-[min(94dvw,560px)] overflow-y-auto border-0 bg-transparent p-0 text-black"
    >
      <div
        data-counter-card="true"
        className="rounded-3xl border-4 border-black bg-amber-50 p-5 shadow-[12px_12px_0px_#000]"
      >
        <div className="flex items-start justify-between gap-3 border-b-4 border-black pb-3">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-3 border-black bg-amber-200">
              <Image
                src="/sprites/portraits/dick-front.png"
                alt="Dick at the Service Counter"
                fill
                className="object-contain object-top"
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">
                CASH ONLY • NO REFUNDS
              </p>
              <h1 id="service-counter-title" className="text-2xl font-black uppercase leading-tight">
                Service Counter &amp; Rules
              </h1>
            </div>
          </div>

          <button
            type="button"
            autoFocus
            onClick={handleClose}
            aria-label="Close service counter"
            className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-black bg-white p-2 hover:bg-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Labor Rate Gag Sign */}
        <div className="mt-4 rounded-2xl border-3 border-black bg-zinc-900 p-4 text-center text-white shadow-[4px_4px_0px_#000]">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">
            POSTED SHOP LABOR RATE
          </p>
          <p className="mt-1 text-2xl font-black uppercase">
            $100 / HR — $200 IF YOU WATCH
          </p>
          <p className="mt-1 text-xs font-bold text-zinc-400">
            $300 / HR if you already tried fixing it after watching a TikTok video.
          </p>
        </div>

        {/* Upcoming VIN Diagnostics Card */}
        <div className="mt-3 rounded-2xl border-3 border-black bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-sky-800">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            VIN Diagnostic Terminal — Coming Phase 5
          </div>
          <p className="mt-1.5 text-xs font-bold leading-snug text-zinc-700">
            Our working VIN Decoder &amp; Diagnostic engine from <strong>Flat Rate Master</strong> is queued to plug right behind Dick&apos;s counter. Until then, hop onto one of the 3 live hydraulic lifts on the right!
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              const products = useShopStore.getState().products;
              useShopStore.getState().setOpenDrawer(null);
              useShopStore.getState().setActiveDialogue(getStaffGreeting('dick', products));
            }}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-3 border-black bg-amber-300 px-4 py-2.5 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-amber-200"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Talk to Dick
          </button>
          <button
            type="button"
            onClick={() => useShopStore.getState().enterGameBay(1)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-3 border-black bg-emerald-400 px-4 py-2.5 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-300"
          >
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Clock Into Bay 1
          </button>
        </div>

        <nav
          aria-label="Shop legal and fulfillment policies"
          className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t-2 border-black/15 pt-3 text-[11px] font-black uppercase text-zinc-600"
        >
          <Link
            href="/shipping-returns"
            onClick={() => useShopStore.getState().setOpenDrawer(null)}
            className="underline hover:text-black"
          >
            Shipping &amp; Returns
          </Link>
          <span>•</span>
          <Link
            href="/terms"
            onClick={() => useShopStore.getState().setOpenDrawer(null)}
            className="underline hover:text-black"
          >
            Terms of Service
          </Link>
          <span>•</span>
          <Link
            href="/privacy"
            onClick={() => useShopStore.getState().setOpenDrawer(null)}
            className="underline hover:text-black"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </dialog>
  );
}
