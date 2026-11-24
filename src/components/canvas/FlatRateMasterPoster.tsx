'use client';

import { Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShopStore } from '@/store/useShopStore';
import { SafeHtml as Html } from './SafeHtml';
import { TOON_GRADIENT_MAP } from './ToonMaterial';

const CANVAS_W = 512;
const CANVAS_H = 640;

function drawPosterFrame(ctx: CanvasRenderingContext2D, t: number): void {
  const slideIndex = Math.floor(t / 3.5) % 3;
  const slideProgress = (t % 3.5) / 3.5;

  // Dark slate comic dashboard background
  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle shop grid accent lines in background
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 2;
  for (let x = 32; x < CANVAS_W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x, CANVAS_H - 96);
    ctx.stroke();
  }
  for (let y = 148; y < CANVAS_H - 96; y += 48) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(CANVAS_W - 20, y);
    ctx.stroke();
  }

  // Outer thick comic frame
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, CANVAS_W - 14, CANVAS_H - 14);
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, CANVAS_W - 36, CANVAS_H - 36);

  // Header Banner
  ctx.fillStyle = '#18181b';
  ctx.fillRect(22, 22, CANVAS_W - 44, 108);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(22, 124, CANVAS_W - 44, 6);

  // Corner mounting rivets
  ctx.fillStyle = '#9ca3af';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  for (const [rx, ry] of [
    [34, 34],
    [CANVAS_W - 34, 34],
    [34, CANVAS_H - 34],
    [CANVAS_W - 34, CANVAS_H - 34],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Blinking LIVE indicator pill
  const liveOn = Math.floor(t * 2) % 2 === 0;
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.roundRect(CANVAS_W - 134, 34, 92, 28, 8);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = liveOn ? '#34d399' : '#10b981';
  ctx.beginPath();
  ctx.arc(CANVAS_W - 114, 48, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ecfdf5';
  ctx.font = '900 15px Bahnschrift, Arial Black, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIVE', CANVAS_W - 101, 49);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FLAT RATE', 48, 56);
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 40px Impact, Arial Black, sans-serif';
  ctx.fillText('MASTER', 48, 98);

  // Header Subtitle Pill
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.roundRect(CANVAS_W - 222, 82, 180, 28, 6);
  ctx.fill();
  ctx.fillStyle = '#fcd34d';
  ctx.font = '900 13px Bahnschrift, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUILT FOR FLAT-RATE TECHS', CANVAS_W - 132, 97);

  // Dynamic Center Screen Panel
  ctx.fillStyle = '#181c24';
  ctx.beginPath();
  ctx.roundRect(34, 152, CANVAS_W - 68, 336, 18);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.stroke();

  if (slideIndex === 0) {
    // Slide 0: Flagged Hours Ticker + Payday Audit
    ctx.fillStyle = '#9ca3af';
    ctx.font = '900 18px Bahnschrift, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WEEKLY FLAGGED HOURS', CANVAS_W / 2, 194);

    const hours = (54.2 + ((Math.floor(t * 2) % 16) * 0.2)).toFixed(1);
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.roundRect(64, 218, CANVAS_W - 128, 108, 14);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 64px Impact, Arial Black, sans-serif';
    ctx.fillText(`${hours} HRS`, CANVAS_W / 2, 276);

    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.roundRect(98, 344, CANVAS_W - 196, 48, 12);
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#6ee7b7';
    ctx.font = '900 24px Impact, Arial Black, sans-serif';
    ctx.fillText('+6.4 HRS CAUGHT', CANVAS_W / 2, 369);

    ctx.fillStyle = '#f4f4f5';
    ctx.font = '900 18px Bahnschrift, Arial Black, sans-serif';
    ctx.fillText('STOP GETTING SHORTED ON PAYDAY', CANVAS_W / 2, 434);
  } else if (slideIndex === 1) {
    // Slide 1: Vision AI RO Scanner
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 20px Bahnschrift, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VISION AI REPAIR ORDER AUDIT', CANVAS_W / 2, 192);

    // Stylized Repair Order card
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.roundRect(82, 218, CANVAS_W - 164, 174, 12);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#18181b';
    ctx.font = '900 26px Impact, Arial Black, sans-serif';
    ctx.fillText('RO #4819  •  3.4 HRS', CANVAS_W / 2, 258);

    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(114, 286, CANVAS_W - 228, 10);
    ctx.fillRect(114, 310, CANVAS_W - 258, 10);
    ctx.fillRect(114, 334, CANVAS_W - 210, 10);

    ctx.fillStyle = '#065f46';
    ctx.font = '900 18px Bahnschrift, Arial Black, sans-serif';
    ctx.fillText('MATCHED + AUDITED ✓', CANVAS_W / 2, 368);

    // Animated amber scanner beam sweeping up and down the RO card
    const scanY = 228 + Math.round((Math.sin(slideProgress * Math.PI * 2) * 0.5 + 0.5) * 144);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.88)';
    ctx.fillRect(72, scanY, CANVAS_W - 144, 7);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.fillRect(72, scanY - 10, CANVAS_W - 144, 26);

    ctx.fillStyle = '#f4f4f5';
    ctx.font = '900 19px Bahnschrift, Arial Black, sans-serif';
    ctx.fillText('SCAN & AUDIT EVERY RO', CANVAS_W / 2, 434);
  } else {
    // Slide 2: 100% Tech-Private Shield
    ctx.fillStyle = '#34d399';
    ctx.font = '900 20px Bahnschrift, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ZERO DEALERSHIP TRACKING', CANVAS_W / 2, 194);

    // Bold comic shield icon
    const cx = CANVAS_W / 2;
    const cy = 286;
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 64);
    ctx.lineTo(cx + 68, cy - 38);
    ctx.lineTo(cx + 56, cy + 32);
    ctx.lineTo(cx, cy + 72);
    ctx.lineTo(cx - 56, cy + 32);
    ctx.lineTo(cx - 68, cy - 38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#ecfdf5';
    ctx.font = '900 30px Impact, Arial Black, sans-serif';
    ctx.fillText('100%', cx, cy - 4);
    ctx.font = '900 16px Bahnschrift, Arial Black, sans-serif';
    ctx.fillText('PRIVATE', cx, cy + 26);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 24px Impact, Arial Black, sans-serif';
    ctx.fillText('LOCAL-FIRST PRIVACY', CANVAS_W / 2, 394);

    ctx.fillStyle = '#f4f4f5';
    ctx.font = '900 18px Bahnschrift, Arial Black, sans-serif';
    ctx.fillText("BOSS CAN'T SEE YOUR LOGS", CANVAS_W / 2, 436);
  }

  // Slide progress dots
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === slideIndex ? '#fbbf24' : '#52525b';
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2 - 28 + i * 28, 470, i === slideIndex ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Footer CTA Bar
  ctx.fillStyle = '#18181b';
  ctx.fillRect(22, CANVAS_H - 134, CANVAS_W - 44, 112);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(22, CANVAS_H - 134);
  ctx.lineTo(CANVAS_W - 22, CANVAS_H - 134);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 25px Bahnschrift, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WWW.FLATRATEMASTER.COM', CANVAS_W / 2, CANVAS_H - 96);

  const pulseScale = Math.floor(t * 2.5) % 2 === 0;
  ctx.fillStyle = pulseScale ? '#f59e0b' : '#fbbf24';
  ctx.beginPath();
  ctx.roundRect(102, CANVAS_H - 70, CANVAS_W - 204, 38, 10);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#111111';
  ctx.font = '900 18px Impact, Arial Black, sans-serif';
  ctx.fillText('TAP TO LAUNCH ↗', CANVAS_W / 2, CANVAS_H - 50);
}

export function FlatRateMasterPoster({
  position,
}: {
  position: [number, number, number];
}) {
  const [hovered, setHovered] = useState(false);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const posterRef = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);
  const elapsedRef = useRef(0);
  const accumRef = useRef(0);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawPosterFrame(ctx, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    posterRef.current = { canvas, ctx, texture };
    if (matRef.current) {
      matRef.current.map = texture;
      matRef.current.needsUpdate = true;
    }

    return () => {
      posterRef.current = null;
      texture.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    elapsedRef.current += delta;
    accumRef.current += delta;

    if (ledRef.current) {
      const pulse = 0.88 + Math.sin(state.clock.elapsedTime * 5) * 0.22;
      ledRef.current.scale.setScalar(pulse);
    }

    if (accumRef.current >= 0.25 && posterRef.current) {
      accumRef.current = 0;
      drawPosterFrame(posterRef.current.ctx, elapsedRef.current);
      posterRef.current.texture.needsUpdate = true;
    }
  });

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        useShopStore.getState().setOpenDrawer('FLAT_RATE_MASTER');
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
      {/* Heavy industrial metal comic frame mounted flush on back wall */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.78, 2.24, 0.08]} />
        <meshToonMaterial
          color={hovered ? '#f59e0b' : '#27272a'}
          gradientMap={TOON_GRADIENT_MAP}
        />
        <Edges color="#111111" />
      </mesh>

      {/* Top bezel glowing emerald LIVE status LED */}
      <mesh ref={ledRef} position={[0.68, 1.03, 0.05]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>

      {/* Animated dynamic canvas screen */}
      <mesh position={[0, 0, 0.046]}>
        <planeGeometry args={[1.64, 2.08]} />
        <meshBasicMaterial
          ref={matRef}
          color={hovered ? '#fef08a' : '#ffffff'}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      {hovered ? (
        <Html center position={[0, 1.28, 0.06]} distanceFactor={12}>
          <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2.5 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
            Flat Rate Master SaaS • Tap to Open
          </span>
        </Html>
      ) : null}
    </group>
  );
}
