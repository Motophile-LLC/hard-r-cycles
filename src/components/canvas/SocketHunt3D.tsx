'use client';

import { Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { SafeHtml as Html } from './SafeHtml';
import { TOON_GRADIENT_MAP } from './ToonMaterial';

export function SocketHunt3D() {
  const activeHazard = useGameStore((s) => s.activeHazard);
  const socketDropId = useGameStore((s) => s.socketDropId);
  const oilSpills = useGameStore((s) => s.oilSpills);

  const socketBodyRef = useRef<RapierRigidBody>(null);
  const beaconRef = useRef<THREE.Group>(null);
  const [hoveredSpillId, setHoveredSpillId] = useState<number | null>(null);

  useEffect(() => {
    if (activeHazard !== 'MISSING_SOCKET' || !socketBodyRef.current) return;

    const dirX = Math.random() < 0.5 ? -1 : 1;
    socketBodyRef.current.setTranslation({ x: -1.8, y: 1.45, z: 0.45 }, true);
    socketBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    socketBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    socketBodyRef.current.applyImpulse(
      {
        x: dirX * (2.6 + Math.random() * 1.4),
        y: 1.5,
        z: 1.9 + Math.random() * 1.2,
      },
      true,
    );
    socketBodyRef.current.applyTorqueImpulse({ x: 0.4, y: 0.2, z: -0.5 }, true);
  }, [activeHazard, socketDropId]);

  useFrame((state) => {
    if (beaconRef.current && socketBodyRef.current) {
      const t = socketBodyRef.current.translation();
      beaconRef.current.position.set(
        t.x,
        t.y + 0.52 + Math.sin(state.clock.elapsedTime * 9) * 0.08,
        t.z,
      );
      beaconRef.current.rotation.y = state.clock.elapsedTime * 4;
    }
  });

  return (
    <group>
      {/* Fixed shop floor + portrait-friendly perimeter bumpers so socket stays visible on phones */}
      <RigidBody type="fixed" restitution={0.65} friction={0.3}>
        <CuboidCollider args={[6.5, 0.2, 5.5]} position={[0, -0.2, 0]} />
        <CuboidCollider args={[0.2, 1.5, 4.5]} position={[-2.15, 1.2, 0.4]} />
        <CuboidCollider args={[0.2, 1.5, 4.5]} position={[2.45, 1.2, 0.4]} />
        <CuboidCollider args={[6.0, 1.5, 0.2]} position={[0, 1.2, -3.4]} />
        <CuboidCollider args={[6.0, 1.5, 0.2]} position={[0, 1.2, 2.6]} />
      </RigidBody>

      {/* Rolling 10mm Socket when MISSING_SOCKET is active */}
      {activeHazard === 'MISSING_SOCKET' ? (
        <>
          <RigidBody
            key={socketDropId}
            ref={socketBodyRef}
            colliders="ball"
            restitution={0.78}
            friction={0.22}
            linearDamping={0.18}
            angularDamping={0.15}
            position={[-1.8, 1.45, 0.45]}
          >
            <group
              onClick={(e) => {
                e.stopPropagation();
                useGameStore.getState().resolveSocketHunt();
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
              }}
            >
              {/* Generous invisible click sphere around small socket for thumb taps */}
              <mesh>
                <sphereGeometry args={[0.62, 12, 12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.14, 0.14, 0.28, 10]} />
                <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} emissive="#38bdf8" emissiveIntensity={0.45} />
                <Outlines thickness={0.04} color="#0284c7" />
              </mesh>
            </group>
          </RigidBody>

          <group ref={beaconRef} position={[-1.8, 1.9, 0.45]}>
            <mesh rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.15, 0.28, 6]} />
              <meshToonMaterial color="#38bdf8" gradientMap={TOON_GRADIENT_MAP} emissive="#0284c7" emissiveIntensity={0.6} />
              <Outlines thickness={0.035} color="#111111" />
            </mesh>
            <Html center position={[0, 0.42, 0]} zIndexRange={[18, 0]}>
              <button
                type="button"
                onClick={() => useGameStore.getState().resolveSocketHunt()}
                className="animate-bounce cursor-pointer touch-manipulation whitespace-nowrap rounded-lg border-3 border-black bg-sky-300 px-3 py-1 text-[11px] font-black uppercase text-black shadow-[3px_3px_0px_#000]"
              >
                GRAB 10MM SOCKET!
              </button>
            </Html>
          </group>
        </>
      ) : null}

      {/* Dynamic Oil Slick Hazard Puddles */}
      {oilSpills.map((spill) => (
        <group
          key={spill.id}
          position={[spill.x, 0.018, spill.z]}
          onClick={(e) => {
            e.stopPropagation();
            useGameStore.getState().hitOilSlick(spill.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredSpillId(spill.id);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHoveredSpillId(null);
            document.body.style.cursor = 'auto';
          }}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.52, 18]} />
            <meshToonMaterial color="#1e1b18" gradientMap={TOON_GRADIENT_MAP} />
            <Outlines thickness={0.03} color="#78350f" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.14, 0.005, 0.08]}>
            <circleGeometry args={[0.18, 12]} />
            <meshBasicMaterial color="#713f12" />
          </mesh>
          {hoveredSpillId === spill.id ? (
            <Html center position={[0, 0.4, 0]} style={{ pointerEvents: 'none' }}>
              <div className="whitespace-nowrap rounded border-2 border-black bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
                {activeHazard === 'MISSING_SOCKET'
                  ? 'SLIP HAZARD — AVOID!'
                  : 'Oil Slick — Click to Wipe'}
              </div>
            </Html>
          ) : null}
        </group>
      ))}
    </group>
  );
}
