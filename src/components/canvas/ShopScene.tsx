'use client';

import { useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { useCoarsePointer } from '@/utils/useCoarsePointer';
import { CameraRig } from './CameraRig';
import { MechanicBillboard } from './MechanicBillboard';
import { MotorcycleMesh } from './MotorcycleMesh';
import { SafeHtml as Html } from './SafeHtml';
import { ServiceWriterNPC } from './ServiceWriterNPC';
import { ShopBuddyNPC } from './ShopBuddyNPC';
import { ShopParticles } from './ShopParticles';
import { SocketHunt3D } from './SocketHunt3D';
import { ToolChest } from './ToolChest';
import {
  TOON_GRADIENT_MAP,
  getConcreteFloorTexture,
  usePropSpriteTexture,
  useShopBackgroundTexture,
} from './ToonMaterial';

function GameLoopTicker() {
  useFrame((_, delta) => {
    useGameStore.getState().tick(delta);
  });
  return null;
}

function BreakerPanel() {
  const breakerBlown = useGameStore((s) => s.breakerBlown);
  const breakerAsset = usePropSpriteTexture('breaker-box');
  const flashRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (flashRef.current && breakerBlown) {
      const pulse = 0.9 + Math.sin(state.clock.elapsedTime * 14) * 0.25;
      flashRef.current.scale.setScalar(pulse);
    }
  });

  const breakerHeight = 1.24;
  const breakerWidth = breakerAsset ? breakerHeight * breakerAsset.aspect : 0.67;

  return (
    <group
      position={[3.38, 1.98, -3.72]}
      onClick={(e) => {
        e.stopPropagation();
        useGameStore.getState().resetBreaker();
      }}
      onPointerOver={(e) => {
        if (breakerBlown) {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {breakerAsset ? (
        <mesh>
          <planeGeometry args={[breakerWidth, breakerHeight]} />
          <meshBasicMaterial
            map={breakerAsset.texture}
            alphaTest={0.5}
            depthWrite={true}
            color={breakerBlown ? '#94a3b8' : '#ffffff'}
          />
        </mesh>
      ) : (
        <mesh castShadow>
          <boxGeometry args={[0.68, 1.05, 0.16]} />
          <meshToonMaterial color="#64748b" gradientMap={TOON_GRADIENT_MAP} />
        </mesh>
      )}
      <mesh ref={flashRef} position={[0.14, 0.28, 0.04]}>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshBasicMaterial color={breakerBlown ? '#ef4444' : '#22c55e'} />
      </mesh>
      {breakerBlown ? (
        <Html center position={[0, 0.82, 0.08]}>
          <button
            type="button"
            onClick={() => useGameStore.getState().resetBreaker()}
            className="hidden animate-bounce cursor-pointer whitespace-nowrap rounded-lg border-3 border-black bg-red-500 px-3 py-1 text-xs font-black uppercase text-white shadow-[3px_3px_0px_#000] sm:block"
          >
            CLICK TO RESET BREAKER!
          </button>
        </Html>
      ) : null}
    </group>
  );
}

export function ShopScene() {
  const breakerBlown = useGameStore((s) => s.breakerBlown);
  const isTouch = useCoarsePointer();
  const stageBackdropTex = useShopBackgroundTexture('/backgrounds/shop-stage-wide.jpg');
  const concreteFloorTex = useMemo(() => getConcreteFloorTexture(), []);

  return (
    <>
      <color attach="background" args={[breakerBlown ? '#0f172a' : '#57534e']} />

      <GameLoopTicker />
      <CameraRig />

      {/* Warm workshop tungsten + bay daylight illumination */}
      <ambientLight
        intensity={breakerBlown ? 0.28 : 0.78}
        color={breakerBlown ? '#93c5fd' : '#fffbeb'}
      />
      <directionalLight
        position={[5.5, 9.5, 6]}
        intensity={breakerBlown ? 0.45 : 2.15}
        color={breakerBlown ? '#fca5a5' : '#fff7ed'}
        castShadow
        shadow-mapSize={isTouch ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />

      {/* Seamless framing extensions behind backdrop for tall portrait & ultrawide phones */}
      <mesh position={[0, 8.2, -4.15]} raycast={() => null}>
        <planeGeometry args={[30, 6]} />
        <meshBasicMaterial color={breakerBlown ? '#0f172a' : '#2b1e15'} />
      </mesh>
      <mesh position={[0, -5.2, -4.15]} raycast={() => null}>
        <planeGeometry args={[30, 6]} />
        <meshBasicMaterial color={breakerBlown ? '#1e293b' : '#676259'} />
      </mesh>
      <mesh position={[-12.2, 1.55, -4.15]} raycast={() => null}>
        <planeGeometry args={[6.2, 18]} />
        <meshBasicMaterial color={breakerBlown ? '#0f172a' : '#261c15'} />
      </mesh>
      <mesh position={[12.2, 1.55, -4.15]} raycast={() => null}>
        <planeGeometry args={[6.2, 18]} />
        <meshBasicMaterial color={breakerBlown ? '#0f172a' : '#261c15'} />
      </mesh>

      {/* Full-bleed Widescreen Hand-Inked Workshop Stage Backdrop */}
      {stageBackdropTex ? (
        <mesh position={[0, 1.55, -4.05]} raycast={() => null}>
          <planeGeometry args={[18.6, 10.4625]} />
          <meshBasicMaterial
            map={stageBackdropTex}
            color={breakerBlown ? '#475569' : '#ffffff'}
          />
        </mesh>
      ) : null}

      {/* Full-shop shadow catcher over illustrated floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow raycast={() => null}>
        <planeGeometry args={[16, 10]} />
        <shadowMaterial transparent opacity={breakerBlown ? 0.22 : 0.36} />
      </mesh>

      {/* Cracked & Oil-Stained Concrete Bay Floor Patch centered under the Lift */}
      {concreteFloorTex ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0.35]} raycast={() => null}>
          <planeGeometry args={[7.4, 4.8]} />
          <meshBasicMaterial
            map={concreteFloorTex}
            transparent
            opacity={breakerBlown ? 0.42 : 0.72}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      <BreakerPanel />
      <MotorcycleMesh />
      <ToolChest />
      <MechanicBillboard />
      <ShopBuddyNPC />
      <ServiceWriterNPC />
      <ShopParticles />

      <Physics gravity={[0, -14, 0]}>
        <SocketHunt3D />
      </Physics>
    </>
  );
}
