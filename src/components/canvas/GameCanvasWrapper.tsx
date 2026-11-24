'use client';

import dynamic from 'next/dynamic';

export const DynamicGameCanvas = dynamic(
  () => import('./GameCanvas').then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-stone-800 text-amber-300">
        <div className="rounded-xl border-4 border-black bg-zinc-900 px-6 py-4 text-center shadow-[6px_6px_0px_#000]">
          <p className="text-lg font-black uppercase tracking-wider">
            Warming Up Air Compressor...
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-400">
            Loading 2.5D Motorcycle Service Bay
          </p>
        </div>
      </div>
    ),
  },
);
