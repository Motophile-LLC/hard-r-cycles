import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

export type CharacterId =
  | 'mechanic'
  | 'shop-buddy'
  | 'service-writer'
  | 'v'
  | 'customers'
  | 'dick'
  | 'scooter'
  | 'bay-tech-a'
  | 'bay-tech-b'
  | 'bay-tech-c';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

export function createProceduralSpriteCanvas(
  character: CharacterId,
  pose: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const isElectrocuted = pose === 'electrocuted';
  const isPanicked = pose === 'panicked' || pose === 'pacing';
  const isCelebrate = pose === 'celebrate';
  const isFacepalm = pose === 'facepalm';
  const isWrenching = pose === 'wrenching';

  const shirtColor =
    character === 'mechanic'
      ? isElectrocuted
        ? '#1c1917'
        : '#374151'
      : character === 'shop-buddy'
        ? '#dc2626'
        : character === 'v'
          ? '#18181b'
          : '#1e3a8a';

  const hatColor =
    character === 'mechanic'
      ? '#4b5563'
      : character === 'shop-buddy'
        ? '#f97316'
        : character === 'v'
          ? '#09090b'
          : '#1e293b';

  const pantColor =
    character === 'service-writer'
      ? '#c2b280'
      : character === 'v'
        ? '#334155'
        : '#2563eb';
  const skinColor = isElectrocuted
    ? '#9ca3af'
    : character === 'v'
      ? '#9b6b43'
      : '#f7c59f';

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 7;

  // Legs & boots anchored at bottom-center
  const leanOffset = isWrenching ? 18 : isPanicked ? -6 : 0;

  // Boots
  ctx.fillStyle = '#1f2937';
  drawRoundedRect(ctx, 74, 464, 44, 34, 10);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, 138, 464, 44, 34, 10);
  ctx.fill();
  ctx.stroke();

  // Jeans / Trousers
  ctx.fillStyle = pantColor;
  drawRoundedRect(ctx, 82, 338, 36, 132, 8);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, 138, 338, 36, 132, 8);
  ctx.fill();
  ctx.stroke();

  // Torso
  ctx.save();
  ctx.translate(128 + leanOffset * 0.4, 268);
  if (isWrenching) ctx.rotate(0.16);
  if (isFacepalm) ctx.rotate(-0.08);

  ctx.fillStyle = shirtColor;
  drawRoundedRect(ctx, -56, -78, 112, 152, 20);
  ctx.fill();
  ctx.stroke();

  // Red shop rag or tie/clipboard detail
  if (character === 'mechanic') {
    ctx.fillStyle = '#ef4444';
    drawRoundedRect(ctx, 20, 48, 22, 34, 5);
    ctx.fill();
    ctx.stroke();
  } else if (character === 'shop-buddy') {
    ctx.fillStyle = '#fef3c7';
    drawRoundedRect(ctx, -20, -68, 40, 132, 8);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#e5e7eb';
    drawRoundedRect(ctx, -64, -12, 42, 58, 6);
    ctx.fill();
    ctx.stroke();
  }

  // Arms
  ctx.fillStyle = shirtColor;
  if (isCelebrate) {
    drawRoundedRect(ctx, -90, -135, 30, 88, 12);
    ctx.fill();
    ctx.stroke();
    drawRoundedRect(ctx, 60, -135, 30, 88, 12);
    ctx.fill();
    ctx.stroke();
  } else if (isPanicked) {
    drawRoundedRect(ctx, -84, -108, 28, 78, 12);
    ctx.fill();
    ctx.stroke();
    drawRoundedRect(ctx, 56, -108, 28, 78, 12);
    ctx.fill();
    ctx.stroke();
  } else if (isWrenching) {
    drawRoundedRect(ctx, 36, -54, 72, 26, 10);
    ctx.fill();
    ctx.stroke();
    // Chrome wrench
    ctx.fillStyle = '#cbd5e1';
    drawRoundedRect(ctx, 90, -76, 62, 18, 6);
    ctx.fill();
    ctx.stroke();
  } else {
    drawRoundedRect(ctx, -84, -56, 28, 86, 12);
    ctx.fill();
    ctx.stroke();
    drawRoundedRect(ctx, 56, -56, 28, 86, 12);
    ctx.fill();
    ctx.stroke();
  }

  // Head
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, -126, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair / Hat
  if (isElectrocuted) {
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(-48, -142);
    ctx.lineTo(-64, -184);
    ctx.lineTo(-32, -172);
    ctx.lineTo(-18, -210);
    ctx.lineTo(0, -176);
    ctx.lineTo(24, -206);
    ctx.lineTo(36, -172);
    ctx.lineTo(64, -182);
    ctx.lineTo(48, -142);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = hatColor;
    drawRoundedRect(ctx, -50, -186, 100, 42, 18);
    ctx.fill();
    ctx.stroke();
    drawRoundedRect(ctx, character === 'shop-buddy' ? -72 : 12, -158, 62, 14, 7);
    ctx.fill();
    ctx.stroke();
  }

  // Facial expressions
  ctx.fillStyle = '#ffffff';
  if (isElectrocuted) {
    ctx.beginPath();
    ctx.arc(-16, -128, 12, 0, Math.PI * 2);
    ctx.arc(16, -128, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(-16, -128, 4, 0, Math.PI * 2);
    ctx.arc(16, -128, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (isFacepalm) {
    ctx.fillStyle = skinColor;
    drawRoundedRect(ctx, -18, -150, 44, 34, 10);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-16, -130, isPanicked ? 11 : 7, 0, Math.PI * 2);
    ctx.arc(16, -130, isPanicked ? 11 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(-14, -130, 3.5, 0, Math.PI * 2);
    ctx.arc(18, -130, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 5;
  if (isPanicked) {
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.ellipse(0, -100, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (isCelebrate) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -106, 18, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-14, -102);
    ctx.quadraticCurveTo(0, -94, 16, -104);
    ctx.stroke();
  }

  // Electrocuted lightning accents
  if (isElectrocuted) {
    ctx.fillStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-88, -130);
    ctx.lineTo(-68, -110);
    ctx.lineTo(-80, -106);
    ctx.lineTo(-62, -84);
    ctx.lineTo(-84, -98);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
  return canvas;
}

export function getProceduralSpriteTexture(
  character: CharacterId,
  pose: string,
): THREE.CanvasTexture {
  const key = `${character}:${pose}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = createProceduralSpriteCanvas(character, pose);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}
