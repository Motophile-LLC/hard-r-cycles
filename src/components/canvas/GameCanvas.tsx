'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useCoarsePointer } from '@/utils/useCoarsePointer';
import { SafeHtmlHost } from './SafeHtml';
import { ShopScene } from './ShopScene';

export function GameCanvas() {
  const isTouch = useCoarsePointer();

  return (
    <div className="touch-hold-surface relative h-full w-full overflow-hidden">
      <Canvas
        shadows="percentage"
        dpr={isTouch ? [1, 1.5] : [1, 2]}
        camera={{ position: [0.15, 4.35, 7.65], fov: 42, near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <ShopScene />
        </Suspense>
      </Canvas>
      <SafeHtmlHost />
    </div>
  );
}
