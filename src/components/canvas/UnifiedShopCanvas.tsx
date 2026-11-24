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
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistRef = useRef<number | null>(null);
  const lastDragXRef = useRef(0);

  useLiveBayPresence();

  const getPinchDistance = () => {
    const pts = [...activePointersRef.current.values()];
    if (pts.length < 2) return null;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.hypot(dx, dy);
  };

  return (
    <div
      className="touch-hold-surface relative h-full w-full overflow-hidden"
      onPointerDown={(e) => {
        if (viewMode !== 'FLOOR') return;
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, a, input')) return;
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointersRef.current.size === 1) {
          lastDragXRef.current = e.clientX;
          lastPinchDistRef.current = null;
        } else if (activePointersRef.current.size === 2) {
          lastPinchDistRef.current = getPinchDistance();
        }
      }}
      onPointerMove={(e) => {
        if (viewMode !== 'FLOOR') return;
        if (!activePointersRef.current.has(e.pointerId)) return;
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointersRef.current.size === 2) {
          const dist = getPinchDistance();
          if (dist !== null && lastPinchDistRef.current !== null) {
            const delta = dist - lastPinchDistRef.current;
            if (Math.abs(delta) >= 2) {
              useShopStore.getState().nudgeCameraZoom(-delta * 0.018);
              lastPinchDistRef.current = dist;
            }
          } else {
            lastPinchDistRef.current = dist;
          }
          return;
        }

        if (activePointersRef.current.size === 1) {
          const dx = e.clientX - lastDragXRef.current;
          if (Math.abs(dx) >= 2) {
            useShopStore.getState().nudgeCameraYaw(-dx * 0.0028);
            lastDragXRef.current = e.clientX;
          }
        }
      }}
      onPointerUp={(e) => {
        activePointersRef.current.delete(e.pointerId);
        if (activePointersRef.current.size < 2) {
          lastPinchDistRef.current = null;
        }
        if (activePointersRef.current.size === 1) {
          const remaining = [...activePointersRef.current.values()][0];
          lastDragXRef.current = remaining.x;
        }
      }}
      onPointerCancel={(e) => {
        activePointersRef.current.delete(e.pointerId);
        lastPinchDistRef.current = null;
      }}
      onWheel={(e) => {
        if (viewMode !== 'FLOOR') return;
        useShopStore.getState().nudgeCameraZoom(e.deltaY > 0 ? 0.45 : -0.45);
      }}
    >
      <Canvas
        shadows="percentage"
        dpr={isTouch ? [1, 1.5] : [1, 2]}
        camera={{ position: [9.4, 11.2, 13.6], fov: 35, near: 0.1, far: 85 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => {
          if (useShopStore.getState().viewMode !== 'FLOOR') return;
          const store = useShopStore.getState();
          if (store.activeDialogue) {
            store.setActiveDialogue(null);
          } else if (store.cameraFocus !== 'OVERVIEW') {
            store.setCameraFocus('OVERVIEW');
          }
        }}
      >
        <Suspense fallback={null}>
          {viewMode === 'GAME_BAY' ? <ShopScene /> : <DealershipScene />}
        </Suspense>
      </Canvas>
      <SafeHtmlHost />
    </div>
  );
}
