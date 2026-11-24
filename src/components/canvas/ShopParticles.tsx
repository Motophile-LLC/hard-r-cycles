'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import type { ParticleKind } from '@/types/game';

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 140;

const KIND_COLORS: Record<ParticleKind, string> = {
  spark: '#facc15',
  electric: '#38bdf8',
  smoke: '#52525b',
  oil: '#78350f',
};

export function ShopParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const slots = useRef<ParticleSlot[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: -20,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.5,
      size: 0.08,
      gravity: 9,
      color: new THREE.Color('#facc15'),
    })),
  );
  const cursor = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.06);
    const mesh = meshRef.current;
    if (!mesh) return;

    const bursts = useGameStore.getState().consumeParticles();
    for (const burst of bursts) {
      const hex = KIND_COLORS[burst.kind] ?? '#facc15';
      for (let i = 0; i < burst.count; i++) {
        const slot = slots.current[cursor.current];
        cursor.current = (cursor.current + 1) % MAX_PARTICLES;

        slot.active = true;
        slot.x = burst.x + (Math.random() - 0.5) * 0.25;
        slot.y = burst.y + (Math.random() - 0.5) * 0.2;
        slot.z = burst.z + (Math.random() - 0.5) * 0.25;
        const speed = burst.kind === 'smoke' ? 1.8 : 4.2;
        slot.vx = (Math.random() - 0.5) * speed;
        slot.vy =
          burst.kind === 'smoke'
            ? 1.5 + Math.random() * 1.4
            : 2.2 + Math.random() * 3.5;
        slot.vz = (Math.random() - 0.5) * speed;
        slot.maxLife = burst.kind === 'smoke' ? 0.85 : 0.55;
        slot.life = slot.maxLife;
        slot.size = burst.kind === 'smoke' ? 0.14 : 0.075;
        slot.gravity = burst.kind === 'smoke' ? -1.4 : 10.5;
        slot.color.set(hex);
      }
    }

    let colorDirty = bursts.length > 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const slot = slots.current[i];
      if (!slot.active) {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      slot.life -= delta;
      if (slot.life <= 0) {
        slot.active = false;
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      slot.vy -= slot.gravity * delta;
      slot.x += slot.vx * delta;
      slot.y = Math.max(0.04, slot.y + slot.vy * delta);
      slot.z += slot.vz * delta;

      const scale = slot.size * Math.max(0.1, slot.life / slot.maxLife);
      dummy.position.set(slot.x, slot.y, slot.z);
      dummy.rotation.set(slot.life * 8, slot.life * 6, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, slot.color);
      colorDirty = true;
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (colorDirty && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}
