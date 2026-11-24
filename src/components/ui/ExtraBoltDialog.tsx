'use client';

import { AlertOctagon, Trash2, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

export function ExtraBoltDialog() {
  const phase = useGameStore((s) => s.phase);
  const pendingExtraBolt = useGameStore((s) => s.pendingExtraBolt);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [cancelNotice, setCancelNotice] = useState(false);

  const isOpen = phase === 'extra_bolt' && pendingExtraBolt;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      setCancelNotice(false);
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      closedby="none"
      aria-labelledby="extra-bolt-title"
      onCancel={(e) => {
        e.preventDefault();
        setCancelNotice(true);
      }}
      onClose={(e) => {
        e.currentTarget.returnValue = '';
      }}
      className="m-auto max-h-[92dvh] w-[min(94dvw,480px)] overflow-y-auto rounded-3xl border-4 border-black bg-amber-50 p-4 text-black shadow-[12px_12px_0px_#111] sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-3 border-black bg-amber-300 shadow-[3px_3px_0px_#000]">
          <AlertOctagon className="h-6 w-6 text-red-700" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-red-700">
            END-OF-SHIFT MYSTERY
          </p>
          <h2 id="extra-bolt-title" className="text-xl font-black leading-tight">
            One Shiny Bolt Left in the Tray!
          </h2>
        </div>
      </div>

      <p className="mt-3 text-sm font-bold leading-relaxed text-zinc-800">
        The Friday 4:45 PM Waiter is buttoned up and the customer has their helmet on...
        Wait—why is there a clean M8 flange bolt still sitting in your magnetic tray?
      </p>

      <p
        aria-live="polite"
        className={`mt-2 min-h-[1.25rem] text-xs font-black text-red-700 ${
          cancelNotice ? 'visible' : 'invisible'
        }`}
      >
        Pick either Tear It Back Down or Toss It before clocking out!
      </p>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          autoFocus
          onClick={() => useGameStore.getState().chooseExtraBolt('teardown')}
          className="flex cursor-pointer flex-col items-start rounded-2xl border-3 border-black bg-emerald-300 p-3 text-left text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-200"
        >
          <span className="flex items-center gap-1.5 text-sm font-black uppercase">
            <Wrench className="h-4 w-4" /> Tear It Back Down
          </span>
          <span className="mt-1 text-xs font-bold text-zinc-800">
            Guaranteed safe, $0 comeback risk, costs +15s on clock.
          </span>
        </button>

        <button
          type="button"
          onClick={() => useGameStore.getState().chooseExtraBolt('toss')}
          className="flex cursor-pointer flex-col items-start rounded-2xl border-3 border-black bg-red-500 p-3 text-left text-white shadow-[4px_4px_0px_#000] hover:bg-red-400"
        >
          <span className="flex items-center gap-1.5 text-sm font-black uppercase">
            <Trash2 className="h-4 w-4" /> Toss It in Trash
          </span>
          <span className="mt-1 text-xs font-bold text-red-50">
            +0s time! 50% glory (+200 pts) / 50% +$320 Comeback!
          </span>
        </button>
      </div>
    </dialog>
  );
}
