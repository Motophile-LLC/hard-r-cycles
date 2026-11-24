'use client';

import { Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { HOTSPOT_LABELS, HOTSPOT_POSITIONS, TOOL_MAP } from '@/data/shiftJobs';
import { useGameStore } from '@/store/useGameStore';
import type { BikeHotspot, ToolId } from '@/types/game';
import { SafeHtml as Html } from './SafeHtml';
import { TOON_GRADIENT_MAP, useBikeSpriteTexture, usePropSpriteTexture } from './ToonMaterial';

function HotspotBeacon({
  hotspot,
  active,
  showCallout,
  requiredTool,
  hasRightTool,
  size,
}: {
  hotspot: BikeHotspot;
  active: boolean;
  showCallout: boolean;
  requiredTool: ToolId | null;
  hasRightTool: boolean;
  size: [number, number, number];
}) {
  const [hovered, setHovered] = useState(false);
  const beaconRef = useRef<THREE.Mesh>(null);
  const pos = HOTSPOT_POSITIONS[hotspot];
  const toolInfo = requiredTool ? TOOL_MAP[requiredTool] : null;

  useFrame((state) => {
    if (!beaconRef.current) return;
    if (active) {
      const bob = Math.sin(state.clock.elapsedTime * 6.5) * 0.11;
      beaconRef.current.position.y = pos[1] + 0.56 + bob;
      beaconRef.current.rotation.y = state.clock.elapsedTime * 2.5;
    }
  });

  return (
    <group>
      {/* Clickable hit volume */}
      <mesh
        position={pos}
        onClick={(e) => {
          e.stopPropagation();
          useGameStore.getState().interactHotspot(hotspot);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={size} />
        <meshBasicMaterial
          color={active ? (hasRightTool ? '#4ade80' : '#facc15') : '#38bdf8'}
          transparent
          opacity={hovered ? 0.26 : active ? 0.1 : 0}
          depthWrite={false}
        />
      </mesh>

      {active ? (
        <mesh ref={beaconRef} position={[pos[0], pos[1] + 0.56, pos[2]]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.16, 0.3, 6]} />
          <meshToonMaterial
            color={hasRightTool ? '#4ade80' : '#facc15'}
            gradientMap={TOON_GRADIENT_MAP}
            emissive={hasRightTool ? '#16a34a' : '#ca8a04'}
            emissiveIntensity={0.45}
          />
          <Outlines thickness={0.04} color="#111111" />
        </mesh>
      ) : null}

      {active && showCallout ? (
        <Html center position={[pos[0], pos[1] + 0.96, pos[2]]} zIndexRange={[15, 0]}>
          <button
            type="button"
            onClick={() => useGameStore.getState().interactHotspot(hotspot)}
            className={`w-max max-w-[min(84dvw,240px)] cursor-pointer touch-manipulation whitespace-normal rounded-xl border-3 border-black px-3 py-1.5 text-center text-[11px] font-black uppercase leading-tight shadow-[3px_3px_0px_#000] transition-transform hover:scale-105 active:translate-y-0.5 sm:max-w-none sm:whitespace-nowrap ${
              hasRightTool
                ? 'animate-bounce bg-emerald-400 text-black'
                : 'bg-amber-300 text-black'
            }`}
          >
            {hasRightTool
              ? `▼ TAP: ${HOTSPOT_LABELS[hotspot]}`
              : `▼ ${HOTSPOT_LABELS[hotspot]} (Need [${toolInfo?.hotkey ?? '?'}] ${toolInfo?.shortName ?? 'Tool'})`}
          </button>
        </Html>
      ) : null}
    </group>
  );
}

export function MotorcycleMesh() {
  const shiftJobs = useGameStore((s) => s.shiftJobs);
  const currentJobIndex = useGameStore((s) => s.currentJobIndex);
  const currentStepIndex = useGameStore((s) => s.currentStepIndex);
  const phase = useGameStore((s) => s.phase);
  const activeHazard = useGameStore((s) => s.activeHazard);
  const torquePhase = useGameStore((s) => s.torquePhase);
  const torqueActive = useGameStore((s) => s.torqueActive);
  const wiringActive = useGameStore((s) => s.wiringActive);
  const buddyActive = useGameStore((s) => s.buddy.active);
  const equippedTool = useGameStore((s) => s.equippedTool);

  const job = shiftJobs[currentJobIndex] ?? shiftJobs[0];
  const step = job.steps[currentStepIndex];
  const activeHotspot =
    phase === 'playing' && activeHazard !== 'MISSING_SOCKET' && activeHazard !== 'BREAKER_BLOWN'
      ? step?.hotspot
      : null;

  const requiredTool: ToolId | null =
    activeHazard === 'BOLT_STRIPPED'
      ? torquePhase === 'extract_heat'
        ? 'propane_torch'
        : 'ez_out'
      : step?.requiredTool ?? null;

  const showCallout =
    phase === 'playing' &&
    !torqueActive &&
    !wiringActive &&
    !buddyActive &&
    activeHazard !== 'MISSING_SOCKET' &&
    activeHazard !== 'BREAKER_BLOWN';

  const hasRightTool = Boolean(requiredTool && equippedTool === requiredTool);
  const bikeAsset = useBikeSpriteTexture(job.bikeSprite);
  const liftAsset = usePropSpriteTexture('motorcycle-lift');
  const oilPanAsset = usePropSpriteTexture('oil-pan');

  const bikeBounceRef = useRef<THREE.Group>(null);
  const lastSquashId = useRef(0);
  const bounceTime = useRef(0);

  useFrame((_, delta) => {
    const store = useGameStore.getState();
    if (store.squashEvent.id !== lastSquashId.current) {
      lastSquashId.current = store.squashEvent.id;
      bounceTime.current = 0.25;
    }

    if (bikeBounceRef.current) {
      if (bounceTime.current > 0) {
        bounceTime.current = Math.max(0, bounceTime.current - delta);
        const progress = 1 - bounceTime.current / 0.25;
        const jiggle = Math.sin(progress * Math.PI * 2) * (1 - progress) * 0.05;
        bikeBounceRef.current.scale.set(1 + jiggle * 0.5, 1 - jiggle, 1);
      } else {
        bikeBounceRef.current.scale.set(1, 1, 1);
      }
    }
  });

  const liftHeight = 1.62;
  const liftWidth = liftAsset ? Math.max(3.48, liftHeight * liftAsset.aspect * 1.34) : 3.48;
  const deckY = liftHeight * 0.705;

  const rawAspect = bikeAsset ? bikeAsset.aspect : 1.65;
  const bikeHeight = Math.min(1.68, 2.86 / rawAspect);
  const bikeWidth = bikeHeight * rawAspect;
  const chockSlotX = liftWidth * 0.36;
  const bikeLocalX = chockSlotX - 0.41 * bikeWidth;
  const bikeBaseY = deckY - 0.03;

  const oilPanHeight = 0.24;
  const oilPanWidth = oilPanAsset ? oilPanHeight * oilPanAsset.aspect : 0.39;

  return (
    <group position={[0, 0, 0]}>
      <group position={[0.28, 0, 0]}>
        {/* Ground contact shadow under hydraulic lift */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.015, -0.04]}
          scale={[1.95, 0.68, 1]}
          raycast={() => null}
        >
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color="#09090b" transparent opacity={0.38} depthWrite={false} />
        </mesh>

        {/* Hand-Drawn Hydraulic Motorcycle Lift Table */}
        {liftAsset ? (
          <mesh key="lift-sprite" position={[0, liftHeight / 2, -0.06]} raycast={() => null}>
            <planeGeometry args={[liftWidth, liftHeight]} />
            <meshBasicMaterial
              key="lift-sprite-mat"
              map={liftAsset.texture}
              color="#ffffff"
              alphaTest={0.5}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh key="lift-fallback" position={[0, 0.5, 0]} receiveShadow castShadow raycast={() => null}>
            <boxGeometry args={[3.55, 0.14, 1.38]} />
            <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
          </mesh>
        )}

        {/* Tire-to-deck contact shadows */}
        <mesh
          position={[bikeLocalX - bikeWidth * 0.34, bikeBaseY + 0.015, 0.01]}
          scale={[0.38, 0.07, 1]}
          raycast={() => null}
        >
          <circleGeometry args={[1, 20]} />
          <meshBasicMaterial color="#09090b" transparent opacity={0.55} depthWrite={false} />
        </mesh>
        <mesh
          position={[bikeLocalX + bikeWidth * 0.37, bikeBaseY + 0.015, 0.01]}
          scale={[0.38, 0.07, 1]}
          raycast={() => null}
        >
          <circleGeometry args={[1, 20]} />
          <meshBasicMaterial color="#09090b" transparent opacity={0.55} depthWrite={false} />
        </mesh>

        {/* Hand-Drawn Motorcycle Cutout flush on the Lift Deck */}
        <group position={[bikeLocalX, bikeBaseY, 0.03]}>
          <group ref={bikeBounceRef}>
            {bikeAsset ? (
              <mesh key="bike-sprite" position={[0, bikeHeight / 2, 0]} raycast={() => null} castShadow>
                <planeGeometry args={[bikeWidth, bikeHeight]} />
                <meshBasicMaterial
                  key="bike-sprite-mat"
                  map={bikeAsset.texture}
                  color="#ffffff"
                  alphaTest={0.5}
                  depthWrite={true}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ) : (
              <mesh key="bike-fallback" position={[0, 0.75, 0]} castShadow raycast={() => null}>
                <boxGeometry args={[2.2, 0.9, 0.4]} />
                <meshToonMaterial color={job.bikeColor} gradientMap={TOON_GRADIENT_MAP} />
              </mesh>
            )}
          </group>
        </group>

        {/* Oil Drain Pan contact shadow */}
        <mesh
          position={[bikeLocalX + 0.06, bikeBaseY - 0.09, 0.11]}
          scale={[0.24, 0.05, 1]}
          raycast={() => null}
        >
          <circleGeometry args={[1, 18]} />
          <meshBasicMaterial color="#09090b" transparent opacity={0.45} depthWrite={false} />
        </mesh>

        {/* Hand-Drawn Greasy Oil Drain Pan tucked beneath engine frame rails */}
        {oilPanAsset ? (
          <mesh key="oilpan-sprite" position={[bikeLocalX + 0.06, bikeBaseY - 0.02, 0.12]} raycast={() => null}>
            <planeGeometry args={[oilPanWidth, oilPanHeight]} />
            <meshBasicMaterial
              key="oilpan-sprite-mat"
              map={oilPanAsset.texture}
              color="#ffffff"
              alphaTest={0.5}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh key="oilpan-fallback" position={[bikeLocalX + 0.06, bikeBaseY - 0.02, 0.12]} castShadow raycast={() => null}>
            <cylinderGeometry args={[0.25, 0.21, 0.09, 14]} />
            <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
          </mesh>
        )}
      </group>

      {/* Interactive Hotspot Volumes */}
      <HotspotBeacon
        hotspot="engine"
        active={activeHotspot === 'engine'}
        showCallout={showCallout}
        requiredTool={requiredTool}
        hasRightTool={hasRightTool}
        size={[0.92, 0.78, 0.72]}
      />
      <HotspotBeacon
        hotspot="handlebars"
        active={activeHotspot === 'handlebars'}
        showCallout={showCallout}
        requiredTool={requiredTool}
        hasRightTool={hasRightTool}
        size={[0.76, 0.72, 1.05]}
      />
      <HotspotBeacon
        hotspot="exhaust"
        active={activeHotspot === 'exhaust'}
        showCallout={showCallout}
        requiredTool={requiredTool}
        hasRightTool={hasRightTool}
        size={[1.3, 0.48, 0.45]}
      />
      <HotspotBeacon
        hotspot="oil_pan"
        active={activeHotspot === 'oil_pan'}
        showCallout={showCallout}
        requiredTool={requiredTool}
        hasRightTool={hasRightTool}
        size={[0.82, 0.42, 0.82]}
      />
      <HotspotBeacon
        hotspot="rear_wheel"
        active={activeHotspot === 'rear_wheel'}
        showCallout={showCallout}
        requiredTool={requiredTool}
        hasRightTool={hasRightTool}
        size={[0.92, 0.88, 0.48]}
      />
    </group>
  );
}
