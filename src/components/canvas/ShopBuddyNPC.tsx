'use client';

import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { getJobPacing } from '@/data/shiftJobs';
import { useGameStore } from '@/store/useGameStore';
import { SafeHtml as Html } from './SafeHtml';
import { useCharacterSpriteTexture } from './ToonMaterial';

export function ShopBuddyNPC() {
  const active = useGameStore((s) => s.buddy.active);
  const pose = useGameStore((s) => s.buddy.pose);
  const line = useGameStore((s) => s.buddy.line);
  const patience = useGameStore((s) => Math.ceil(s.buddy.patience * 2) / 2);
  const currentJobIndex = useGameStore((s) => s.currentJobIndex);

  const { texture, aspect } = useCharacterSpriteTexture('shop-buddy', pose);
  const groupRef = useRef<THREE.Group>(null);
  const posX = useRef(5.2);
  const posZ = useRef(-0.4);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const isBuddyActive = useGameStore.getState().buddy.active;
    const isPortrait = state.size.width / Math.max(1, state.size.height) < 0.9;
    const targetX = isBuddyActive ? (isPortrait ? 1.45 : 3.2) : 5.2;
    const targetZ = isBuddyActive ? (isPortrait ? 1.15 : 0.88) : -0.4;
    posX.current = THREE.MathUtils.lerp(posX.current, targetX, Math.min(1, delta * 3.8));
    posZ.current = THREE.MathUtils.lerp(posZ.current, targetZ, Math.min(1, delta * 3.8));

    const walkHop = isBuddyActive ? Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.08 : 0;
    groupRef.current.position.set(posX.current, walkHop, posZ.current);
    groupRef.current.visible = isBuddyActive || posX.current < 4.85;
  });

  const spriteHeight = 2.02;
  const spriteWidth = spriteHeight * aspect;
  const maxPatience = getJobPacing(currentJobIndex).buddyPatience;
  const patiencePct = Math.max(0, Math.min(100, (patience / maxPatience) * 100));

  return (
    <group ref={groupRef} position={[5.2, 0, -0.4]} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.52, 18]} />
        <meshBasicMaterial color="#09090b" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      <Billboard follow>
        <mesh
          position={[0, spriteHeight / 2, 0]}
          onClick={(e) => {
            e.stopPropagation();
            useGameStore.getState().dismissBuddy();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <planeGeometry args={[spriteWidth, spriteHeight]} />
          <meshBasicMaterial
            map={texture}
            alphaTest={0.5}
            depthWrite={true}
            side={THREE.DoubleSide}
          />
        </mesh>

        {active ? (
          <Html center position={[0, spriteHeight + 0.55, 0]}>
            <button
              type="button"
              onClick={() => useGameStore.getState().dismissBuddy()}
              className="group hidden w-56 cursor-pointer rounded-xl border-3 border-black bg-amber-50 p-2.5 text-left text-black shadow-[4px_4px_0px_#111] transition-transform hover:-translate-y-0.5 active:translate-y-0 md:block [@media(orientation:portrait)]:hidden"
            >
              <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-orange-700">
                <span>DYNA BRO</span>
                <span className="rounded bg-black px-1.5 py-0.5 text-[10px] text-amber-300">
                  CLICK / [E] SHOO
                </span>
              </div>
              <p className="text-xs font-bold leading-snug text-zinc-900">
                &ldquo;{line}&rdquo;
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full border border-black bg-zinc-200">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${patiencePct}%` }}
                />
              </div>
            </button>
          </Html>
        ) : null}
      </Billboard>
    </group>
  );
}
