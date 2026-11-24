'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import { useLiveBayPresence } from '@/hooks/useLiveBayPresence';
import { useShopStore } from '@/store/useShopStore';
import { useCoarsePointer } from '@/utils/useCoarsePointer';
import { DealershipScene } from './DealershipScene';
import { SafeHtmlHost } from './SafeHtml';
import { ShopScene } from './ShopScene';

export function UnifiedShopCanvas() {
  const isTouch = useCoarsePointer();
  const viewMode = useShopStore((s) => s.viewMode);
  const dragStateRef = useRef<{ active: boolean; lastX: number }>({
    active: false,
    lastX: 0,
  });

  useLiveBayPresence();

  return (
    <div
      className="touch-hold-surface relative h-full w-full overflow-hidden"
      onPointerDown={(e) => {
        if (viewMode !== 'FLOOR') return;
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, a, input')) return;
        dragStateRef.current = { active: true, lastX: e.clientX };
      }}
      onPointerMove={(e) => {
        if (viewMode !== 'FLOOR' || !dragStateRef.current.active) return;
        const dx = e.clientX - dragStateRef.current.lastX;
        if (Math.abs(dx) >= 2) {
          useShopStore.getState().nudgeCameraYaw(-dx * 0.0028);
          dragStateRef.current.lastX = e.clientX;
        }
      }}
      onPointerUp={() => {
        dragStateRef.current.active = false;
      }}
      onPointerCancel={() => {
        dragStateRef.current.active = false;
      }}
      onWheel={(e) => {
        if (viewMode !== 'FLOOR') return;
        useShopStore.getState().nudgeCameraZoom(e.deltaY > 0 ? 0.45 : -0.45);
      }}
    >
      <Canvas
        shadows="percentage"
        dpr={isTouch ? [1, 1.5] : [1, 2]}
        camera={{ position: [7.4, 9.2, 10.6], fov: 35, near: 0.1, far: 80 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          {viewMode === 'GAME_BAY' ? <ShopScene /> : <DealershipScene />}
        </Suspense>
      </Canvas>
      <SafeHtmlHost />
    </div>
  );
}
