'use client';

import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { useCharacterSpriteTexture } from './ToonMaterial';

const COUNTER_X = -5.45;
const COUNTER_Y = 0.72;
const COUNTER_Z = -3.65;
const TORSO_UV_BOTTOM = 0.44;
const TORSO_UV_SPAN = 1 - TORSO_UV_BOTTOM;

export function ServiceWriterNPC() {
  const pose = useGameStore((s) => s.serviceWriterPose);
  const { texture, aspect } = useCharacterSpriteTexture('service-writer', pose);
  const rootRef = useRef<THREE.Group>(null);

  const torsoGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const v = uv.getY(i);
      uv.setY(i, TORSO_UV_BOTTOM + v * TORSO_UV_SPAN);
    }
    uv.needsUpdate = true;
    return geo;
  }, []);

  useFrame((state) => {
    if (!rootRef.current) return;
    const isPacing = useGameStore.getState().serviceWriterPose === 'pacing';
    const xOffset = isPacing ? Math.sin(state.clock.elapsedTime * 5.2) * 0.36 : 0;
    const yBob = isPacing ? Math.abs(Math.sin(state.clock.elapsedTime * 10.4)) * 0.04 : 0;
    rootRef.current.position.set(COUNTER_X + xOffset, COUNTER_Y + yBob, COUNTER_Z);
  });

  const torsoHeight = 1.58;
  const spriteWidth = torsoHeight * (aspect / TORSO_UV_SPAN);

  return (
    <group ref={rootRef} position={[COUNTER_X, COUNTER_Y, COUNTER_Z]}>
      <Billboard lockX lockZ>
        <mesh position={[0, torsoHeight / 2, 0]} scale={[spriteWidth, torsoHeight, 1]} geometry={torsoGeo}>
          <meshBasicMaterial
            map={texture}
            color="#ffffff"
            alphaTest={0.5}
            depthWrite={true}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
