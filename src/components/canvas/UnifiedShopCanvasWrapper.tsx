'use client';

import dynamic from 'next/dynamic';

export const UnifiedShopCanvasWrapper = dynamic(
  () => import('./UnifiedShopCanvas').then((mod) => mod.UnifiedShopCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-stone-900 text-amber-300">
        <div className="rounded-2xl border-4 border-black bg-zinc-900 px-6 py-4 text-center shadow-[6px_6px_0px_#000]">
          <p className="text-lg font-black uppercase tracking-wider">
            Opening Hard R Cycles...
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-400">
            Loading 3D Dealership Floor &amp; Service Bays
          </p>
        </div>
      </div>
    ),
  },
);
