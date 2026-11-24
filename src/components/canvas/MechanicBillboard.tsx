'use client';

import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { HOTSPOT_POSITIONS } from '@/data/shiftJobs';
import { useGameStore } from '@/store/useGameStore';
import { useCharacterSpriteTexture } from './ToonMaterial';

const FOCUS_STAND_POSITIONS: Record<string, [number, number]> = {
  engine: [2.22, 0.56],
  handlebars: [2.35, 0.58],
  exhaust: [-1.22, 0.88],
  oil_pan: [2.28, 0.62],
  rear_wheel: [-1.34, 0.85],
  tool_chest: [-1.42, 0.42],
  breaker: [2.88, -0.48],
};

export function MechanicBillboard() {
  const pose = useGameStore((s) => s.mechanicPose);
  const { texture, aspect } = useCharacterSpriteTexture('mechanic', pose);

  const rootRef = useRef<THREE.Group>(null);
  const squashRef = useRef<THREE.Group>(null);
  const currentPos = useRef(new THREE.Vector3(2.28, 0, 0.62));
  const lastSquashId = useRef(0);
  const squashTimer = useRef(0);

  const spriteHeight = 2.08;
  const spriteWidth = spriteHeight * aspect;

  useFrame((state, delta) => {
    const store = useGameStore.getState();
    const targetCoords = FOCUS_STAND_POSITIONS[store.activeHotspotFocus] ?? [-0.2, 1.05];

    if (rootRef.current) {
      currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, targetCoords[0], Math.min(1, delta * 7));
      currentPos.current.z = THREE.MathUtils.lerp(currentPos.current.z, targetCoords[1], Math.min(1, delta * 7));
      rootRef.current.position.set(currentPos.current.x, 0, currentPos.current.z);
    }

    if (store.squashEvent.id !== lastSquashId.current) {
      lastSquashId.current = store.squashEvent.id;
      squashTimer.current = 0.28;
    }

    if (squashRef.current) {
      let sx = 1;
      let sy = 1;

      if (squashTimer.current > 0) {
        squashTimer.current = Math.max(0, squashTimer.current - delta);
        const progress = 1 - squashTimer.current / 0.28;
        const wave = Math.sin(progress * Math.PI * 2) * (1 - progress);
        if (store.squashEvent.type === 'slam') {
          sx = 1 + wave * 0.26;
          sy = 1 - wave * 0.22;
        } else if (store.squashEvent.type === 'zap') {
          sx = 1 + Math.sin(state.clock.elapsedTime * 65) * 0.15;
          sy = 1 + Math.cos(state.clock.elapsedTime * 55) * 0.12;
        } else {
          sx = 1 - wave * 0.18;
          sy = 1 + wave * 0.22;
        }
      } else {
        const breathe = Math.sin(state.clock.elapsedTime * (store.frenzyActive ? 10 : 3.8)) * 0.025;
        sy = 1 + breathe;
        sx = 1 - breathe * 0.6;
      }

      squashRef.current.scale.set(sx, sy, 1);
    }

    // Also allow clicking hotspot reference cleanly
    void HOTSPOT_POSITIONS;
  });

  return (
    <group ref={rootRef} position={[2.28, 0, 0.62]}>
      {/* Ground anchor shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color="#09090b" transparent opacity={0.35} depthWrite={false} />
      </mesh>

      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <group ref={squashRef}>
          <mesh position={[0, spriteHeight / 2, 0]} raycast={() => null}>
            <planeGeometry args={[spriteWidth, spriteHeight]} />
            <meshBasicMaterial
              map={texture}
              alphaTest={0.5}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </Billboard>
    </group>
  );
}
