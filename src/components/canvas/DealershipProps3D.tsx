'use client';

import { Edges } from '@react-three/drei';
import { useMemo, useState } from 'react';
import * as THREE from 'three';
import {
  getDoor18PlusDecalTexture,
  getHangingTeeTexture,
  getHatPegboardTexture,
  getOilDrumLabelTexture,
  getToolChestFrontTexture,
  getWeatheredCounterTexture,
} from '@/utils/dealershipTextures';
import { SafeHtml as Html } from './SafeHtml';
import { TOON_GRADIENT_MAP } from './ToonMaterial';

export interface RackShirtSpec {
  color: string;
  motif: 'skull' | 'wrench' | 'stencil' | 'braap';
}

export function CartoonMotorcycle3D({
  variant,
}: {
  variant: 'track-bagger' | 'bigwheel-bagger' | 'club-dyna';
}) {
  const isTrack = variant === 'track-bagger';
  const isBigWheel = variant === 'bigwheel-bagger';
  const isClub = variant === 'club-dyna';

  const bodyColor = isTrack ? '#ea580c' : isBigWheel ? '#b91c1c' : '#27272a';
  const accentColor = isTrack ? '#18181b' : isBigWheel ? '#fef3c7' : '#f59e0b';
  const metalColor = isClub ? '#334155' : '#cbd5e1';
  const forkColor = isTrack ? '#eab308' : isBigWheel ? '#e2e8f0' : '#1e293b';

  const frontMajorR = isBigWheel ? 0.285 : 0.2;
  const frontTubeR = isBigWheel ? 0.075 : 0.08;
  const frontHubY = frontMajorR + frontTubeR;
  const frontHubX = isBigWheel ? 0.84 : 0.8;

  return (
    <group>
      {/* Rear Tire & Rim (XY plane = rolls along +X) */}
      <group position={[-0.78, 0.275, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.19, 0.085, 8, 16]} />
          <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#09090b" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.14, 12]} />
          <meshToonMaterial color={metalColor} gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      </group>

      {/* Front Tire & Rim */}
      <group position={[frontHubX, frontHubY, 0]}>
        <mesh castShadow>
          <torusGeometry args={[frontMajorR, frontTubeR, 8, 18]} />
          <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#09090b" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[isBigWheel ? 0.24 : 0.155, isBigWheel ? 0.24 : 0.155, 0.11, 14]} />
          <meshToonMaterial color={metalColor} gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      </group>

      {/* Front Fender */}
      <mesh
        position={[frontHubX - 0.02, frontHubY + (isBigWheel ? 0.24 : 0.22), 0]}
        rotation={[0, 0, -0.35]}
        castShadow
      >
        <boxGeometry args={[isBigWheel ? 0.56 : 0.44, 0.07, 0.19]} />
        <meshToonMaterial color={bodyColor} gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>

      {/* Rear Swingarm & Lower Cradle Frame */}
      <mesh position={[-0.08, 0.29, 0]} castShadow>
        <boxGeometry args={[1.05, 0.09, 0.24]} />
        <meshToonMaterial color="#1f2937" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      {[-0.13, 0.13].map((zSide) => (
        <mesh key={`swing-${zSide}`} position={[-0.45, 0.28, zSide]} castShadow>
          <boxGeometry args={[0.72, 0.07, 0.05]} />
          <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      ))}
      <mesh position={[0.38, 0.58, 0]} rotation={[0, 0, 0.42]} castShadow>
        <boxGeometry args={[0.1, 0.58, 0.14]} />
        <meshToonMaterial color="#1f2937" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>

      {/* V-Twin Crankcase, 45° Cylinders, Rocker Boxes, Primary & Air Cleaner */}
      <group position={[0.02, 0.43, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.36, 0.2, 0.26]} />
          <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {/* Front Cylinder + Rocker Cover */}
        <group position={[0.11, 0.18, 0]} rotation={[0, 0, -0.38]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.085, 0.085, 0.24, 10]} />
            <meshToonMaterial color="#1e293b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, 0.14, 0]} castShadow>
            <boxGeometry args={[0.19, 0.06, 0.2]} />
            <meshToonMaterial color={metalColor} gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        </group>
        {/* Rear Cylinder + Rocker Cover */}
        <group position={[-0.11, 0.18, 0]} rotation={[0, 0, 0.38]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.085, 0.085, 0.24, 10]} />
            <meshToonMaterial color="#1e293b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, 0.14, 0]} castShadow>
            <boxGeometry args={[0.19, 0.06, 0.2]} />
            <meshToonMaterial color={metalColor} gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        </group>
        {/* Air Cleaner Housing */}
        <mesh position={[0.02, 0.14, 0.17]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.09, 12]} />
          <meshToonMaterial color={isClub ? '#f59e0b' : metalColor} gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {/* Primary Chain Case Cover */}
        <mesh position={[-0.08, -0.02, -0.15]} castShadow>
          <boxGeometry args={[0.42, 0.16, 0.06]} />
          <meshToonMaterial color={metalColor} gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      </group>

      {/* Sculpted Fuel Tank + Graphic Accent Stripe */}
      <group position={[0.16, 0.77, 0]} rotation={[0, 0, -0.14]}>
        <mesh castShadow>
          <boxGeometry args={[0.48, 0.21, 0.29]} />
          <meshToonMaterial color={bodyColor} gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.38, 0.05, 0.31]} />
          <meshToonMaterial color={accentColor} gradientMap={TOON_GRADIENT_MAP} />
        </mesh>
      </group>

      {/* Stepped Rider + Passenger Seat */}
      <mesh position={[-0.25, 0.65, 0]} castShadow>
        <boxGeometry args={[0.42, 0.11, 0.25]} />
        <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#09090b" />
      </mesh>
      <mesh position={[-0.5, 0.72, 0]} rotation={[0, 0, 0.18]} castShadow>
        <boxGeometry args={[0.26, 0.1, 0.21]} />
        <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#09090b" />
      </mesh>

      {/* Rear Fender & Taillight */}
      <mesh position={[-0.78, 0.56, 0]} rotation={[0, 0, 0.22]} castShadow>
        <boxGeometry args={[0.46, 0.12, 0.22]} />
        <meshToonMaterial color={bodyColor} gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[-0.99, 0.51, 0]}>
        <boxGeometry args={[0.06, 0.09, 0.12]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Raked Twin Front Forks & Triple Clamps */}
      {[-0.1, 0.1].map((zSide) => (
        <mesh
          key={`fork-${zSide}`}
          position={[0.62, 0.61, zSide]}
          rotation={[0, 0, 0.46]}
          castShadow
        >
          <cylinderGeometry args={[0.03, 0.03, 0.72, 8]} />
          <meshToonMaterial color={forkColor} gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      ))}
      <mesh position={[0.48, 0.87, 0]} rotation={[0, 0, 0.46]} castShadow>
        <boxGeometry args={[0.14, 0.06, 0.26]} />
        <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>

      {/* Track Bagger Signature: Road-Glide Shark-Nose Fairing, Hard Bags, 2-into-1 Pipe */}
      {isTrack ? (
        <group>
          <group position={[0.63, 0.9, 0]}>
            <mesh rotation={[0, 0, -0.22]} castShadow>
              <boxGeometry args={[0.38, 0.34, 0.4]} />
              <meshToonMaterial color={bodyColor} gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
            {/* Dark smoked windshield */}
            <mesh position={[-0.08, 0.22, 0]} rotation={[0, 0, 0.5]} castShadow>
              <boxGeometry args={[0.05, 0.24, 0.36]} />
              <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#09090b" />
            </mesh>
            {/* Twin headlights */}
            {[-0.09, 0.09].map((hz) => (
              <mesh key={`hd-${hz}`} position={[0.2, 0.02, hz]}>
                <boxGeometry args={[0.04, 0.09, 0.09]} />
                <meshBasicMaterial color="#fef08a" />
              </mesh>
            ))}
          </group>
          {/* Low moto handlebars */}
          <mesh position={[0.42, 0.96, 0]} castShadow>
            <boxGeometry args={[0.08, 0.06, 0.56]} />
            <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#09090b" />
          </mesh>
          {/* Angular Race Saddlebags */}
          {[-0.22, 0.22].map((bz) => (
            <mesh key={`tbag-${bz}`} position={[-0.68, 0.47, bz]} castShadow>
              <boxGeometry args={[0.5, 0.28, 0.17]} />
              <meshToonMaterial color={bodyColor} gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
          ))}
          {/* Upswept 2-into-1 stainless pipe */}
          <mesh position={[-0.36, 0.28, 0.19]} rotation={[0, 0, -0.14]} castShadow>
            <cylinderGeometry args={[0.04, 0.055, 0.78, 8]} />
            <meshToonMaterial color="#cbd5e1" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        </group>
      ) : null}

      {/* Big-Wheel Bagger Signature: Batwing Fairing, Tall Apes, Stretched Bags, Fishtails */}
      {isBigWheel ? (
        <group>
          <group position={[0.53, 0.95, 0]}>
            <mesh rotation={[0, 0, 0.16]} castShadow>
              <boxGeometry args={[0.26, 0.36, 0.5]} />
              <meshToonMaterial color={bodyColor} gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
            <mesh position={[-0.04, 0.22, 0]} rotation={[0, 0, 0.42]} castShadow>
              <boxGeometry args={[0.04, 0.18, 0.42]} />
              <meshToonMaterial color="#334155" transparent opacity={0.75} gradientMap={TOON_GRADIENT_MAP} />
            </mesh>
            <mesh position={[0.14, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.08, 0.08, 0.05, 10]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
          </group>
          {/* Tall chrome ape-hangers */}
          {[-0.21, 0.21].map((az) => (
            <mesh key={`ape-${az}`} position={[0.38, 1.06, az]} castShadow>
              <boxGeometry args={[0.05, 0.34, 0.05]} />
              <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
          ))}
          <mesh position={[0.38, 1.22, 0]} castShadow>
            <boxGeometry args={[0.06, 0.05, 0.56]} />
            <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          {/* Long Stretched Hard Bags */}
          {[-0.23, 0.23].map((bz) => (
            <mesh
              key={`bwbag-${bz}`}
              position={[-0.72, 0.42, bz]}
              rotation={[0, 0, -0.08]}
              castShadow
            >
              <boxGeometry args={[0.64, 0.32, 0.18]} />
              <meshToonMaterial color={bodyColor} gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
          ))}
          {/* Dual chrome fishtail mufflers */}
          {[-0.21, 0.21].map((pz) => (
            <mesh
              key={`pipe-${pz}`}
              position={[-0.56, 0.22, pz]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.036, 0.044, 0.92, 8]} />
              <meshToonMaterial color="#f8fafc" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
          ))}
        </group>
      ) : null}

      {/* Club-Style Dyna Signature: Quarter Fairing, Tall T-Bars, Twin Shocks, Sissy Bar */}
      {isClub ? (
        <group>
          <group position={[0.53, 0.95, 0]}>
            <mesh rotation={[0, 0, 0.18]} castShadow>
              <boxGeometry args={[0.22, 0.26, 0.26]} />
              <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#09090b" />
            </mesh>
            <mesh position={[-0.04, 0.17, 0]} rotation={[0, 0, 0.35]} castShadow>
              <boxGeometry args={[0.04, 0.18, 0.24]} />
              <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
            <mesh position={[0.12, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 0.04, 10]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
          </group>
          {/* Tall Black T-Bar Risers & Bar */}
          {[-0.08, 0.08].map((tz) => (
            <mesh key={`triser-${tz}`} position={[0.42, 1.04, tz]} castShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.36, 6]} />
              <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
            </mesh>
          ))}
          <mesh position={[0.42, 1.21, 0]} castShadow>
            <boxGeometry args={[0.06, 0.05, 0.56]} />
            <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#09090b" />
          </mesh>
          {/* Exposed Twin Rear Coil Shocks */}
          {[-0.14, 0.14].map((sz) => (
            <mesh
              key={`shock-${sz}`}
              position={[-0.58, 0.45, sz]}
              rotation={[0, 0, -0.38]}
              castShadow
            >
              <cylinderGeometry args={[0.028, 0.028, 0.34, 8]} />
              <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
          ))}
          {/* Tall Black Sissy Bar */}
          <mesh position={[-0.68, 0.96, 0]} rotation={[0, 0, 0.18]} castShadow>
            <boxGeometry args={[0.05, 0.48, 0.16]} />
            <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#09090b" />
          </mesh>
          {/* Upswept megaphone exhaust */}
          <mesh position={[-0.36, 0.3, 0.19]} rotation={[0, 0, Math.PI / 2 - 0.18]} castShadow>
            <cylinderGeometry args={[0.052, 0.032, 0.78, 8]} />
            <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#09090b" />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

const DEFAULT_SHIRT_SPECS: RackShirtSpec[] = [
  { color: '#18181b', motif: 'skull' },
  { color: '#7f1d1d', motif: 'wrench' },
  { color: '#1e293b', motif: 'stencil' },
  { color: '#27272a', motif: 'braap' },
  { color: '#334155', motif: 'skull' },
  { color: '#18181b', motif: 'wrench' },
];

export function ApparelRack3D({
  position,
  rotationY = 0,
  label,
  shirtSpecs = DEFAULT_SHIRT_SPECS,
  onClick,
}: {
  position: [number, number, number];
  rotationY?: number;
  label: string;
  shirtSpecs?: RackShirtSpec[];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
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
      {/* Black Iron Pipe Base Rails & Flange Feet */}
      {[-0.95, 0.95].map((fx) => (
        <group key={`foot-${fx}`} position={[fx, 0, 0]}>
          <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.14, 0.07, 0.68]} />
            <meshToonMaterial color={hovered ? '#fbbf24' : '#334155'} gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, 0.88, 0]} castShadow>
            <cylinderGeometry args={[0.042, 0.042, 1.7, 8]} />
            <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 1.9, 8]} />
        <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
      </mesh>
      <mesh position={[0, 1.72, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 2.08, 8]} />
        <meshToonMaterial color={hovered ? '#f59e0b' : '#64748b'} gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>

      {/* 6 Volumetric 3D Hanging Tees/Hoodies */}
      {shirtSpecs.map((spec, idx) => {
        const x = -0.68 + idx * 0.27;
        const teeTex = getHangingTeeTexture(spec.color, spec.motif);
        return (
          <group key={`${spec.color}-${spec.motif}-${idx}`} position={[x, 1.2, 0]}>
            <mesh position={[0, 0.46, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.14, 6]} />
              <meshBasicMaterial color="#111111" />
            </mesh>
            {/* Hanger shoulder bar */}
            <mesh position={[0, 0.37, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.06, 0.54, 0.04]} />
              <meshToonMaterial color="#92400e" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.1, 0.76, 0.52]} />
              {teeTex ? (
                <meshBasicMaterial
                  map={teeTex}
                  color={hovered ? '#fef08a' : '#ffffff'}
                />
              ) : (
                <meshToonMaterial color={spec.color} gradientMap={TOON_GRADIENT_MAP} />
              )}
              <Edges color="#111111" />
            </mesh>
          </group>
        );
      })}

      {hovered ? (
        <Html center position={[0, 2.15, 0]} distanceFactor={13}>
          <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
            {label}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

export function ServiceCounter3D({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const counterFrontTex = useMemo(() => getWeatheredCounterTexture(), []);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
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
      {/* Weathered Diamond-Plate 3D Counter Cabinet */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.35, 1.1, 0.94]} />
        <meshToonMaterial
          color={hovered ? '#94a3b8' : '#7b8288'}
          gradientMap={TOON_GRADIENT_MAP}
        />
        <Edges color="#111111" />
      </mesh>
      {counterFrontTex ? (
        <mesh position={[0, 0.55, 0.478]} raycast={() => null}>
          <planeGeometry args={[3.26, 1.02]} />
          <meshBasicMaterial
            map={counterFrontTex}
            color={hovered ? '#fef08a' : '#ffffff'}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ) : null}

      {/* Brushed Stainless Overhanging Countertop */}
      <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 0.1, 1.04]} />
        <meshToonMaterial
          color={hovered ? '#fde68a' : '#cbd5e1'}
          gradientMap={TOON_GRADIENT_MAP}
        />
        <Edges color="#111111" />
      </mesh>

      {/* 3D Vintage Cash Register (Right Side) */}
      <group position={[0.98, 1.2, 0.02]}>
        {/* Cash drawer base */}
        <mesh position={[0, 0.09, 0]} castShadow>
          <boxGeometry args={[0.62, 0.18, 0.52]} />
          <meshToonMaterial color="#78716c" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0, 0.09, 0.27]}>
          <boxGeometry args={[0.16, 0.04, 0.04]} />
          <meshToonMaterial color="#e5e7eb" gradientMap={TOON_GRADIENT_MAP} />
        </mesh>
        {/* Sloped Register Body & Keypad */}
        <mesh position={[0, 0.29, -0.02]} castShadow>
          <boxGeometry args={[0.52, 0.24, 0.42]} />
          <meshToonMaterial color="#d6d3d1" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0, 0.25, 0.18]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.38, 0.08, 0.18]} />
          <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {/* Raised Price Readout Display */}
        <mesh position={[0, 0.47, -0.1]} castShadow>
          <boxGeometry args={[0.32, 0.14, 0.14]} />
          <meshToonMaterial color="#a8a29e" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0, 0.47, -0.02]}>
          <planeGeometry args={[0.24, 0.08]} />
          <meshBasicMaterial color="#065f46" />
        </mesh>
      </group>

      {/* 3D Brass Service Bell (Left Side) */}
      <group position={[-1.08, 1.2, 0.12]}>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.05, 14]} />
          <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#09090b" />
        </mesh>
        <mesh position={[0, 0.09, 0]} castShadow>
          <sphereGeometry args={[0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshToonMaterial color="#f59e0b" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0, 0.21, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.04, 8]} />
          <meshToonMaterial color="#fde047" gradientMap={TOON_GRADIENT_MAP} />
        </mesh>
      </group>

      {/* 3D Diagnostic Clipboard (Center-Left) */}
      <group position={[-0.36, 1.22, 0.12]} rotation={[0, 0.2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.03, 0.56]} />
          <meshToonMaterial color="#92400e" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0, 0.02, 0.02]}>
          <boxGeometry args={[0.34, 0.015, 0.44]} />
          <meshToonMaterial color="#fef3c7" gradientMap={TOON_GRADIENT_MAP} />
        </mesh>
        <mesh position={[0, 0.035, -0.22]}>
          <boxGeometry args={[0.16, 0.03, 0.06]} />
          <meshToonMaterial color="#cbd5e1" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      </group>

      {hovered ? (
        <Html center position={[0, 1.85, 0]} distanceFactor={13}>
          <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2.5 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
            Service Counter &amp; Policies
          </span>
        </Html>
      ) : null}
    </group>
  );
}

export function FrontEntryDoors3D({
  position,
  welcomeMatTex,
  onClick,
}: {
  position: [number, number, number];
  welcomeMatTex: THREE.Texture | null;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const decalTex = useMemo(() => getDoor18PlusDecalTexture(), []);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
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
      {/* Heavy Steel Threshold & Outer Jamb Frame */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[2.36, 0.06, 0.24]} />
        <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[-1.1, 1.15, 0]} castShadow>
        <boxGeometry args={[0.16, 2.3, 0.2]} />
        <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[1.1, 1.15, 0]} castShadow>
        <boxGeometry args={[0.16, 2.3, 0.2]} />
        <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[0, 2.26, 0]} castShadow>
        <boxGeometry args={[2.36, 0.16, 0.22]} />
        <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>

      {/* Left Door Leaf (pivoted open inward on left hinge) */}
      <group position={[-1.0, 1.1, 0]} rotation={[0, 0.48, 0]}>
        <group position={[0.48, 0, 0]}>
          {/* Perimeter aluminum rails */}
          <mesh position={[-0.43, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 2.1, 0.08]} />
            <meshToonMaterial color={hovered ? '#fbbf24' : '#64748b'} gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0.43, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 2.1, 0.08]} />
            <meshToonMaterial color={hovered ? '#fbbf24' : '#64748b'} gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, 0.98, 0]} castShadow>
            <boxGeometry args={[0.96, 0.14, 0.08]} />
            <meshToonMaterial color="#64748b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, -0.94, 0]} castShadow>
            <boxGeometry args={[0.96, 0.22, 0.08]} />
            <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          {/* Sky-tinted glass pane */}
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.76, 1.76, 0.03]} />
            <meshToonMaterial
              color="#7dd3fc"
              transparent
              opacity={0.34}
              gradientMap={TOON_GRADIENT_MAP}
            />
          </mesh>
          {/* Chrome door handles */}
          <mesh position={[0.35, -0.04, 0.08]}>
            <boxGeometry args={[0.04, 0.26, 0.05]} />
            <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0.35, -0.04, -0.08]}>
            <boxGeometry args={[0.04, 0.26, 0.05]} />
            <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        </group>
      </group>

      {/* Right Door Leaf (pivoted open inward + 18+ Explicit Humor Decal) */}
      <group position={[1.0, 1.1, 0]} rotation={[0, -0.48, 0]}>
        <group position={[-0.48, 0, 0]}>
          <mesh position={[-0.43, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 2.1, 0.08]} />
            <meshToonMaterial color={hovered ? '#fbbf24' : '#64748b'} gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0.43, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 2.1, 0.08]} />
            <meshToonMaterial color={hovered ? '#fbbf24' : '#64748b'} gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, 0.98, 0]} castShadow>
            <boxGeometry args={[0.96, 0.14, 0.08]} />
            <meshToonMaterial color="#64748b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, -0.94, 0]} castShadow>
            <boxGeometry args={[0.96, 0.22, 0.08]} />
            <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.76, 1.76, 0.03]} />
            <meshToonMaterial
              color="#7dd3fc"
              transparent
              opacity={0.34}
              gradientMap={TOON_GRADIENT_MAP}
            />
          </mesh>
          {decalTex ? (
            <mesh position={[0, 0.18, 0]}>
              <boxGeometry args={[0.56, 0.56, 0.04]} />
              <meshBasicMaterial map={decalTex} />
            </mesh>
          ) : null}
          <mesh position={[-0.35, -0.04, 0.08]}>
            <boxGeometry args={[0.04, 0.26, 0.05]} />
            <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[-0.35, -0.04, -0.08]}>
            <boxGeometry args={[0.04, 0.26, 0.05]} />
            <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        </group>
      </group>

      {welcomeMatTex ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -0.78]}>
          <planeGeometry args={[1.65, 0.85]} />
          <meshBasicMaterial map={welcomeMatTex} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      ) : null}
    </group>
  );
}

const CAP_COLORS = ['#7f1d1d', '#1e293b', '#334155', '#3f6212', '#92400e', '#18181b'];

export function HatWallAndStickerTable3D({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hatPegTex = useMemo(() => getHatPegboardTexture(), []);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
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
      {/* Wall-Mounted Wood-Framed Hat Pegboard + 6 Protruding 3D Biker Caps */}
      <group position={[0, 2.38, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2.22, 1.38, 0.1]} />
          <meshToonMaterial
            color={hovered ? '#f59e0b' : '#6b4f32'}
            gradientMap={TOON_GRADIENT_MAP}
          />
          <Edges color="#111111" />
        </mesh>
        {hatPegTex ? (
          <mesh position={[0, 0, 0.056]} raycast={() => null}>
            <planeGeometry args={[2.1, 1.26]} />
            <meshBasicMaterial map={hatPegTex} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        ) : null}
        {[0, 1].map((row) =>
          [0, 1, 2].map((col) => {
            const cx = -0.68 + col * 0.68;
            const cy = 0.28 - row * 0.56;
            const clr = CAP_COLORS[row * 3 + col];
            return (
              <group key={`cap-${row}-${col}`} position={[cx, cy, 0.14]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.16, 10, 8]} />
                  <meshToonMaterial color={clr} gradientMap={TOON_GRADIENT_MAP} />
                  <Edges color="#111111" />
                </mesh>
                <mesh position={[0, -0.06, 0.14]} rotation={[0.2, 0, 0]} castShadow>
                  <boxGeometry args={[0.26, 0.03, 0.18]} />
                  <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
                  <Edges color="#09090b" />
                </mesh>
                <mesh position={[0, 0.03, 0.15]}>
                  <boxGeometry args={[0.1, 0.07, 0.03]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
              </group>
            );
          }),
        )}
      </group>

      {/* Standing 3D Wooden Sticker & Hoodie Feature Table */}
      <group position={[0.15, 0, 1.35]}>
        {[
          [-0.86, -0.34],
          [0.86, -0.34],
          [-0.86, 0.34],
          [0.86, 0.34],
        ].map(([lx, lz], i) => (
          <mesh key={`tleg-${i}`} position={[lx, 0.4, lz]} castShadow>
            <boxGeometry args={[0.12, 0.8, 0.12]} />
            <meshToonMaterial color="#5c4028" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        ))}
        <mesh position={[0, 0.84, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.05, 0.1, 0.92]} />
          <meshToonMaterial
            color={hovered ? '#f59e0b' : '#855e3c'}
            gradientMap={TOON_GRADIENT_MAP}
          />
          <Edges color="#111111" />
        </mesh>
        {/* Display sticker trays & folded hoodie stacks */}
        <mesh position={[-0.56, 0.95, 0.04]} castShadow>
          <boxGeometry args={[0.56, 0.12, 0.48]} />
          <meshToonMaterial color="#dc2626" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.04, 0.92, -0.06]} castShadow>
          <boxGeometry args={[0.48, 0.06, 0.42]} />
          <meshToonMaterial color="#fef3c7" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.62, 0.95, 0.04]} castShadow>
          <boxGeometry args={[0.52, 0.12, 0.46]} />
          <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#09090b" />
        </mesh>
      </group>

      {hovered ? (
        <Html center position={[0.15, 1.55, 1.35]} distanceFactor={13}>
          <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2.5 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
            Hats &amp; Sticker Table
          </span>
        </Html>
      ) : null}
    </group>
  );
}

export function PartsZone3D({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const toolChestTex = useMemo(() => getToolChestFrontTexture(), []);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
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
      {/* 4-Post Open Industrial 3D Parts Rack */}
      <group>
        {[
          [-0.86, -0.32],
          [0.86, -0.32],
          [-0.86, 0.32],
          [0.86, 0.32],
        ].map(([px, pz], i) => (
          <mesh key={`rpost-${i}`} position={[px, 0.98, pz]} castShadow>
            <boxGeometry args={[0.08, 1.96, 0.08]} />
            <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        ))}
        {[0.18, 0.76, 1.34, 1.9].map((sy, idx) => (
          <mesh key={`rshelf-${idx}`} position={[0, sy, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.82, 0.07, 0.72]} />
            <meshToonMaterial
              color={hovered ? '#fbbf24' : '#64748b'}
              gradientMap={TOON_GRADIENT_MAP}
            />
            <Edges color="#111111" />
          </mesh>
        ))}

        {/* Top shelf: sculpted 3D Yellow & Red Motor Oil Jugs */}
        {[-0.62, -0.22, 0.22, 0.62].map((ox, i) => (
          <group key={`jug-${ox}`} position={[ox, 2.09, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.24, 0.32, 0.24]} />
              <meshToonMaterial
                color={i < 2 ? '#eab308' : '#dc2626'}
                gradientMap={TOON_GRADIENT_MAP}
              />
              <Edges color="#111111" />
            </mesh>
            <mesh position={[0.05, 0.19, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
              <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
            </mesh>
          </group>
        ))}

        {/* 3rd shelf: Taped Cardboard Parts Shipping Boxes */}
        {[-0.44, 0.44].map((bx, i) => (
          <group key={`box-${bx}`} position={[bx, 1.56, 0]}>
            <mesh castShadow>
              <boxGeometry args={[i === 0 ? 0.7 : 0.64, 0.36, 0.48]} />
              <meshToonMaterial color={i === 0 ? '#b48a5a' : '#9a7248'} gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
            <mesh position={[0, 0.185, 0]}>
              <boxGeometry args={[i === 0 ? 0.68 : 0.62, 0.015, 0.1]} />
              <meshToonMaterial color="#fef3c7" gradientMap={TOON_GRADIENT_MAP} />
            </mesh>
          </group>
        ))}

        {/* 2nd shelf: Metal Parts Crates & Oil Filter Cans */}
        <mesh position={[-0.44, 0.96, 0]} castShadow>
          <boxGeometry args={[0.68, 0.32, 0.48]} />
          <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {[0.24, 0.56].map((fx, i) => (
          <mesh key={`can-${fx}`} position={[fx, 0.94, 0.06]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.28, 10]} />
            <meshToonMaterial
              color={i === 0 ? '#2563eb' : '#991b1b'}
              gradientMap={TOON_GRADIENT_MAP}
            />
            <Edges color="#111111" />
          </mesh>
        ))}

        {/* Bottom shelf: Heavy Axle Box & Fluid Jugs */}
        <mesh position={[-0.36, 0.36, 0]} castShadow>
          <boxGeometry args={[0.74, 0.28, 0.5]} />
          <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.48, 0.38, 0]} castShadow>
          <boxGeometry args={[0.52, 0.32, 0.44]} />
          <meshToonMaterial color="#92400e" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      </group>

      {/* Offset Left: 3D Classic Red 6-Drawer Rolling Mechanic Tool Chest */}
      <group position={[-1.58, 0, 0.28]}>
        {[
          [-0.36, -0.22],
          [0.36, -0.22],
          [-0.36, 0.22],
          [0.36, 0.22],
        ].map(([wx, wz], i) => (
          <mesh key={`wheel-${i}`} position={[wx, 0.07, wz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.06, 8]} />
            <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
          </mesh>
        ))}
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.98, 1.04, 0.62]} />
          <meshToonMaterial
            color={hovered ? '#ef4444' : '#c82828'}
            gradientMap={TOON_GRADIENT_MAP}
          />
          <Edges color="#111111" />
        </mesh>
        {toolChestTex ? (
          <mesh position={[0, 0.65, 0.316]} raycast={() => null}>
            <planeGeometry args={[0.9, 0.98]} />
            <meshBasicMaterial map={toolChestTex} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        ) : null}
        {/* Chrome side push bar */}
        <mesh position={[-0.55, 0.96, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
          <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {/* Top Socket Organizer Rail & Chrome Wrench */}
        <mesh position={[-0.12, 1.21, -0.06]} castShadow>
          <boxGeometry args={[0.56, 0.07, 0.14]} />
          <meshToonMaterial color="#cbd5e1" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.1, 1.2, 0.14]} rotation={[0, -0.22, 0]} castShadow>
          <boxGeometry args={[0.48, 0.04, 0.08]} />
          <meshToonMaterial color="#e2e8f0" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      </group>

      {/* Offset Right: 3D Stack of 3 Motorcycle Tires */}
      <group position={[1.55, 0, 0.28]}>
        {[
          [0, 0.12, 0],
          [0.04, 0.36, -0.03],
          [-0.03, 0.6, 0.04],
        ].map(([tx, ty, tz], i) => (
          <mesh
            key={`tire-${i}`}
            position={[tx, ty, tz]}
            rotation={[Math.PI / 2, 0, i * 0.25]}
            castShadow
          >
            <torusGeometry args={[0.31, 0.12, 10, 18]} />
            <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#09090b" />
          </mesh>
        ))}
      </group>

      {hovered ? (
        <Html center position={[0, 2.35, 0]} distanceFactor={13}>
          <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2.5 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
            Parts, Oil &amp; Tool Chest
          </span>
        </Html>
      ) : null}
    </group>
  );
}

export function BreakerBox3D({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
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
      {/* Heavy Steel Wall Enclosure */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.84, 1.24, 0.28]} />
        <meshToonMaterial
          color={hovered ? '#94a3b8' : '#64748b'}
          gradientMap={TOON_GRADIENT_MAP}
        />
        <Edges color="#111111" />
      </mesh>
      {/* Hinged Front Door Panel */}
      <mesh position={[0, 0, 0.15]} castShadow>
        <boxGeometry args={[0.72, 1.08, 0.04]} />
        <meshToonMaterial color="#94a3b8" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      {/* High-Voltage Yellow Hazard Triangle (Rotated flat onto front XY door, apex up) */}
      <mesh position={[0, 0.08, 0.178]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.015, 3]} />
        <meshBasicMaterial color="#facc15" />
        <Edges color="#111111" />
      </mesh>
      {/* Black Lightning Bolt */}
      <mesh position={[-0.01, 0.09, 0.195]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.045, 0.18, 0.01]} />
        <meshBasicMaterial color="#111111" />
      </mesh>
      {/* Side Shutoff Lever + Red Ball Knob */}
      <mesh position={[0.46, 0.14, 0.02]} castShadow>
        <boxGeometry args={[0.08, 0.28, 0.12]} />
        <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[0.54, 0.3, 0.04]} rotation={[0, 0, -0.45]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.28, 6]} />
        <meshToonMaterial color="#cbd5e1" gradientMap={TOON_GRADIENT_MAP} />
      </mesh>
      <mesh position={[0.6, 0.42, 0.04]} castShadow>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshToonMaterial color="#dc2626" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
    </group>
  );
}

export function OilDrumAndCone3D({
  position,
}: {
  position: [number, number, number];
}) {
  const labelTex = useMemo(() => getOilDrumLabelTexture(), []);

  return (
    <group position={position}>
      {/* Ribbed 55-Gallon Red Waste Oil Barrel */}
      <group>
        <mesh position={[0, 0.52, 0]} rotation={[0, Math.PI * 0.88, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.36, 0.36, 1.04, 16]} />
          {labelTex ? (
            <meshBasicMaterial map={labelTex} />
          ) : (
            <meshToonMaterial color="#991b1b" gradientMap={TOON_GRADIENT_MAP} />
          )}
          <Edges color="#111111" />
        </mesh>
        {/* Top Rim & Raised Rolling Hoops */}
        {[0.32, 0.72, 1.04].map((ry) => (
          <mesh key={`hoop-${ry}`} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.365, 0.022, 6, 16]} />
            <meshToonMaterial color="#7f1d1d" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        ))}
        {/* Bung Caps on Lid */}
        <mesh position={[-0.14, 1.06, 0.06]}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 8]} />
          <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.15, 1.06, -0.06]}>
          <cylinderGeometry args={[0.028, 0.028, 0.04, 8]} />
          <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
        </mesh>
      </group>

      {/* Highway Safety Traffic Cone Beside Drum */}
      <group position={[0.64, 0, 0.16]}>
        <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.06, 0.42]} />
          <meshToonMaterial color="#c2410c" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0, 0.39, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.17, 0.7, 12]} />
          <meshToonMaterial color="#f97316" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.095, 0.115, 0.11, 12]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.132, 0.152, 0.1, 12]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      </group>
    </group>
  );
}
