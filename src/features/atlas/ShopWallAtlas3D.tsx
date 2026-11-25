'use client';

import { Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { SafeHtml as Html } from '@/components/canvas/SafeHtml';
import { TOON_GRADIENT_MAP } from '@/components/canvas/ToonMaterial';
import { trackShopEvent } from '@/lib/analytics';
import { useShopStore } from '@/store/useShopStore';
import { projectLatLngToMapXY } from './geo';
import type { AtlasPinDot } from './types';

const TEX_W = 512;
const TEX_H = 340;
const BOARD_W = 2.36;
const BOARD_H = 1.56;

const CONTINENT_SILHOUETTES: Array<Array<[number, number]>> = [
  [
    [-166, 66], [-136, 70], [-95, 70], [-56, 52], [-70, 42], [-80, 25],
    [-97, 26], [-104, 18], [-82, 9], [-88, 16], [-105, 22], [-117, 32],
    [-125, 48], [-152, 59],
  ],
  [
    [-79, 10], [-61, 10], [-36, -6], [-40, -22], [-56, -38], [-68, -54],
    [-75, -44], [-71, -18], [-81, -4],
  ],
  [
    [-9, 37], [3, 43], [-4, 51], [8, 58], [26, 70], [42, 66], [34, 46],
    [22, 39], [10, 44], [2, 41],
  ],
  [
    [-17, 16], [-6, 35], [12, 36], [33, 31], [43, 12], [49, 10], [40, -18],
    [28, -33], [18, -34], [12, -16], [8, 4], [-10, 6],
  ],
  [
    [28, 42], [60, 69], [135, 69], [168, 64], [142, 44], [121, 31], [108, 15],
    [102, 2], [90, 21], [77, 9], [68, 24], [52, 25], [36, 31],
  ],
  [
    [114, -22], [132, -12], [146, -18], [153, -28], [146, -38], [130, -33],
    [115, -34],
  ],
];

const FALLBACK_IDLE_DOTS: AtlasPinDot[] = [
  { lat: 30.3, lng: -97.7, city: 'Austin' },
  { lat: 41.9, lng: -87.6, city: 'Chicago' },
  { lat: 34.1, lng: -118.2, city: 'Los Angeles' },
  { lat: 51.5, lng: -0.1, city: 'London' },
  { lat: 35.7, lng: 139.7, city: 'Tokyo' },
];

function buildAtlasBoardTexture(totalPins: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Slate comic backdrop
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Outer comic border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, TEX_W - 10, TEX_H - 10);

  // Header strip
  ctx.fillStyle = '#18181b';
  ctx.fillRect(10, 10, TEX_W - 20, 56);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(10, 64, TEX_W - 20, 4);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHOP WALL ATLAS', 22, 32);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '900 11px Bahnschrift, Arial Black, sans-serif';
  ctx.fillText('RIDER GUEST BOOK • TAP TO PIN', 22, 52);

  // Live Pin Count Badge
  const badgeText = totalPins > 0 ? `${totalPins} PINNED` : 'SIGN BOOK';
  ctx.fillStyle = '#065f46';
  ctx.beginPath();
  ctx.roundRect(TEX_W - 134, 20, 112, 32, 8);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#ecfdf5';
  ctx.font = '900 14px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, TEX_W - 78, 37);

  // Map Area Inset
  const mapX = 20;
  const mapY = 80;
  const mapW = TEX_W - 40;
  const mapH = TEX_H - 118;

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 10);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle lat/lng grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  for (let gx = 1; gx < 6; gx++) {
    const x = mapX + (mapW * gx) / 6;
    ctx.beginPath();
    ctx.moveTo(x, mapY);
    ctx.lineTo(x, mapY + mapH);
    ctx.stroke();
  }
  for (let gy = 1; gy < 4; gy++) {
    const y = mapY + (mapH * gy) / 4;
    ctx.beginPath();
    ctx.moveTo(mapX, y);
    ctx.lineTo(mapX + mapW, y);
    ctx.stroke();
  }

  // Stylized landmasses
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  for (const poly of CONTINENT_SILHOUETTES) {
    ctx.beginPath();
    poly.forEach(([lng, lat], idx) => {
      const pt = projectLatLngToMapXY(lat, lng, mapW, mapH);
      if (idx === 0) ctx.moveTo(mapX + pt.x, mapY + pt.y);
      else ctx.lineTo(mapX + pt.x, mapY + pt.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Footer strip
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '900 12px Bahnschrift, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SSO GUEST CHECK-IN • ~11KM PRIVACY GRID', TEX_W / 2, TEX_H - 18);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function ShopWallAtlas3D({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const atlasDots = useShopStore((s) => s.atlasDots);
  const atlasTotalPins = useShopStore((s) => s.atlasTotalPins);
  const ledsGroupRef = useRef<THREE.Group>(null);

  const boardTexture = useMemo(
    () => buildAtlasBoardTexture(atlasTotalPins),
    [atlasTotalPins],
  );

  useEffect(() => {
    return () => {
      boardTexture?.dispose();
    };
  }, [boardTexture]);

  const dotsToRender = useMemo(() => {
    const src = atlasDots.length > 0 ? atlasDots : FALLBACK_IDLE_DOTS;
    return src.slice(0, 28).map((dot, idx) => {
      const planeW = 2.18;
      const planeH = 1.38;
      const mapLeft = (20 / TEX_W - 0.5) * planeW;
      const mapRight = ((TEX_W - 20) / TEX_W - 0.5) * planeW;
      const mapTop = (0.5 - 80 / TEX_H) * planeH;
      const mapBottom = (0.5 - (TEX_H - 38) / TEX_H) * planeH;
      const localW = mapRight - mapLeft;
      const localH = mapTop - mapBottom;
      const pt = projectLatLngToMapXY(dot.lat, dot.lng, localW, localH);
      return {
        key: `atlas-led-${idx}-${dot.city}`,
        x: mapLeft + pt.x,
        y: mapTop - pt.y,
        isLive: atlasDots.length > 0,
      };
    });
  }, [atlasDots]);

  useFrame((state) => {
    if (!ledsGroupRef.current) return;
    const t = state.clock.elapsedTime;
    ledsGroupRef.current.children.forEach((child, idx) => {
      const scale = 0.85 + Math.sin(t * 3.8 + idx * 0.9) * 0.25;
      child.scale.setScalar(scale);
    });
  });

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        const store = useShopStore.getState();
        trackShopEvent(
          'atlas_open',
          { source: '3d_wall_board' },
          store.authAccessToken,
        );
        store.setOpenDrawer('ATLAS');
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
      {/* Heavy industrial framed board */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[BOARD_W, BOARD_H, 0.08]} />
        <meshToonMaterial
          color={hovered ? '#f59e0b' : '#27272a'}
          gradientMap={TOON_GRADIENT_MAP}
        />
        <Edges color="#111111" />
      </mesh>

      {/* Corner mounting bolts */}
      {(
        [
          [-1.08, 0.68],
          [1.08, 0.68],
          [-1.08, -0.68],
          [1.08, -0.68],
        ] as [number, number][]
      ).map(([bx, by], i) => (
        <mesh
          key={`atlas-bolt-${i}`}
          position={[bx, by, 0.044]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.035, 0.035, 0.02, 8]} />
          <meshToonMaterial color="#d97706" gradientMap={TOON_GRADIENT_MAP} />
        </mesh>
      ))}

      {/* Stylized comic world map graphic */}
      {boardTexture ? (
        <mesh position={[0, 0, 0.044]}>
          <planeGeometry args={[2.18, 1.38]} />
          <meshBasicMaterial
            key={boardTexture.uuid}
            map={boardTexture}
            color={hovered ? '#fef08a' : '#ffffff'}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ) : null}

      {/* Volumetric glowing push-pin LEDs */}
      <group ref={ledsGroupRef} position={[0, 0, 0.055]}>
        {dotsToRender.map((dot) => (
          <mesh key={dot.key} position={[dot.x, dot.y, 0]}>
            <sphereGeometry args={[dot.isLive ? 0.032 : 0.022, 8, 8]} />
            <meshBasicMaterial color={dot.isLive ? '#34d399' : '#fbbf24'} />
          </mesh>
        ))}
      </group>

      {hovered ? (
        <Html center position={[0, 0.96, 0.08]} distanceFactor={12}>
          <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-emerald-300 px-2.5 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
            Shop Wall Atlas • Sign Guest Book
          </span>
        </Html>
      ) : null}
    </group>
  );
}
