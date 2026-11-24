import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

function createCachedCanvas(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  draw(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Two-tone aged cream plaster upper + olive-sage wainscoting lower garage walls */
export function getGarageWallTexture(variant: 'left' | 'back'): THREE.CanvasTexture | null {
  return createCachedCanvas(`wall:${variant}`, 1024, 512, (ctx, w, h) => {
    const splitY = Math.round(h * 0.56);

    // Upper warm plaster (#cfc4af)
    ctx.fillStyle = '#cfc4af';
    ctx.fillRect(0, 0, w, splitY);

    // Subtle vertical plaster stains & grime streaks near ceiling
    for (let i = 0; i < 42; i++) {
      const x = hash01(i * 3.1 + (variant === 'left' ? 1 : 9)) * w;
      const len = 30 + hash01(i * 7.4) * 140;
      const alpha = 0.04 + hash01(i * 2.3) * 0.06;
      ctx.fillStyle = `rgba(62, 52, 38, ${alpha.toFixed(3)})`;
      ctx.fillRect(x, 0, 8 + hash01(i * 5.2) * 28, len);
    }

    // Subtle vertical plaster panel ink lines
    ctx.strokeStyle = 'rgba(24, 24, 27, 0.28)';
    ctx.lineWidth = 3;
    const panels = variant === 'back' ? 6 : 4;
    for (let i = 1; i < panels; i++) {
      const px = Math.round((w / panels) * i);
      ctx.beginPath();
      ctx.moveTo(px, 14);
      ctx.lineTo(px, splitY - 6);
      ctx.stroke();
    }

    // Lower muted industrial olive-sage wainscoting (#6e7463)
    ctx.fillStyle = '#6e7463';
    ctx.fillRect(0, splitY, w, h - splitY);

    // Oil scuffs & darker industrial wash along bottom half
    for (let i = 0; i < 36; i++) {
      const x = hash01(i * 4.7 + 19) * w;
      const y = splitY + 18 + hash01(i * 6.3) * (h - splitY - 40);
      const r = 18 + hash01(i * 8.1) * 48;
      ctx.fillStyle = `rgba(28, 32, 24, ${(0.05 + hash01(i) * 0.08).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Comic ink chair rail strip
    ctx.fillStyle = '#4a4e42';
    ctx.fillRect(0, splitY - 8, w, 16);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, splitY - 8);
    ctx.lineTo(w, splitY - 8);
    ctx.moveTo(0, splitY + 8);
    ctx.lineTo(w, splitY + 8);
    ctx.stroke();

    // Dark baseboard kickplate (#2d3028)
    ctx.fillStyle = '#2d3028';
    ctx.fillRect(0, h - 32, w, 32);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, h - 32);
    ctx.lineTo(w, h - 32);
    ctx.stroke();

    // Vintage framed V-twin poster graphic on left apparel wall
    if (variant === 'left') {
      const px = Math.round(w * 0.68);
      const py = 54;
      const pw = 160;
      const ph = 186;
      ctx.fillStyle = '#e7dcc4';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 6;
      ctx.strokeRect(px, py, pw, ph);

      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(px + 10, py + 12, pw - 20, 32);
      ctx.fillStyle = '#fef3c7';
      ctx.font = '900 18px Impact, Arial Black, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HARD R IRON', px + pw / 2, py + 28);

      // Stylized minimalist cartoon wheel & piston emblem
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(px + pw / 2 - 28, py + 118, 22, 0, Math.PI * 2);
      ctx.arc(px + pw / 2 + 28, py + 118, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(px + pw / 2 - 30, py + 76, 60, 26, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111111';
      ctx.font = '900 13px Bahnschrift, Arial, sans-serif';
      ctx.fillText('V-TWIN GARAGE', px + pw / 2, py + 162);
    }

    // Crisp dark ink outer border
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
  });
}

/** Option A hi-res split floor: weathered plank showroom + riveted steel threshold + bay zones */
export function getShopFloorTexture(): THREE.CanvasTexture | null {
  return createCachedCanvas('shop-floor-v3', 2048, 1408, (ctx, w, h) => {
    // Slab base: weathered shop concrete (#8a877e)
    ctx.fillStyle = '#8a877e';
    ctx.fillRect(0, 0, w, h);

    // Subtle concrete mottling & aggregate texture
    for (let i = 0; i < 320; i++) {
      const x = hash01(i * 2.7) * w;
      const y = hash01(i * 5.9) * h;
      const r = 16 + hash01(i * 9.1) * 72;
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(60, 58, 52, 0.085)' : 'rgba(186, 182, 170, 0.075)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.58, hash01(i) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine aggregate grit speckles across concrete
    for (let i = 0; i < 900; i++) {
      const gx = (0.315 + hash01(i * 1.7 + 3) * 0.685) * w;
      const gy = hash01(i * 3.9 + 11) * h;
      const sz = 1.5 + hash01(i * 6.1) * 3;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(24, 24, 22, 0.16)' : 'rgba(220, 214, 200, 0.14)';
      ctx.fillRect(gx, gy, sz, sz);
    }

    // Concrete slab expansion joints
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.34)';
    ctx.lineWidth = 4;
    for (let x = Math.round(w * 0.38); x < w; x += 256) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 234; y < h; y += 234) {
      ctx.beginPath();
      ctx.moveTo(w * 0.315, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Apparel Showroom Wood Planks (Left 31.5% strip)
    const thresholdX = Math.round(w * 0.315);
    ctx.fillStyle = '#a48762';
    ctx.fillRect(0, 0, thresholdX, h);

    const plankW = 54;
    for (let px = 0; px < thresholdX; px += plankW) {
      const colIdx = Math.floor(px / plankW);
      const toneShift = (colIdx % 3 === 0 ? '#aa8d68' : colIdx % 3 === 1 ? '#9d805c' : '#b0936f');
      ctx.fillStyle = toneShift;
      ctx.fillRect(px, 0, Math.min(plankW, thresholdX - px), h);

      // Hand-inked vertical seam
      ctx.strokeStyle = '#3f2e1d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();

      // Subtle vertical wood grain streaks
      ctx.strokeStyle = 'rgba(58, 38, 20, 0.14)';
      ctx.lineWidth = 2;
      for (let g = 0; g < 3; g++) {
        const gx = px + 10 + g * 16;
        if (gx >= thresholdX - 4) continue;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + (hash01(px + g) - 0.5) * 6, h);
        ctx.stroke();
      }

      // Staggered horizontal plank seams & nail pairs
      const jointY = 110 + Math.round(hash01(px * 0.17) * 260);
      for (let y = jointY; y < h; y += 340) {
        const pw = Math.min(plankW, thresholdX - px);
        ctx.strokeStyle = '#3f2e1d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(px + pw, y);
        ctx.stroke();

        if (pw > 28) {
          ctx.fillStyle = '#261a10';
          ctx.beginPath();
          ctx.arc(px + 12, y - 10, 2.5, 0, Math.PI * 2);
          ctx.arc(px + pw - 12, y - 10, 2.5, 0, Math.PI * 2);
          ctx.arc(px + 12, y + 10, 2.5, 0, Math.PI * 2);
          ctx.arc(px + pw - 12, y + 10, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Subtle showroom walkway scuff & satin sheen near front entry & apparel aisle
    const sheen = ctx.createRadialGradient(w * 0.2, h * 0.62, 40, w * 0.2, h * 0.62, 320);
    sheen.addColorStop(0, 'rgba(255, 240, 210, 0.16)');
    sheen.addColorStop(1, 'rgba(255, 240, 210, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, thresholdX, h);

    // Riveted diamond-plate steel divider threshold at u = 0.315
    ctx.fillStyle = '#475569';
    ctx.fillRect(thresholdX - 16, 0, 32, h);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(thresholdX - 16, 0);
    ctx.lineTo(thresholdX - 16, h);
    ctx.moveTo(thresholdX + 16, 0);
    ctx.lineTo(thresholdX + 16, h);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.lineWidth = 2;
    for (let y = 18; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(thresholdX - 8, y - 6);
      ctx.lineTo(thresholdX + 8, y + 6);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(thresholdX - 9, y, 2.5, 0, Math.PI * 2);
      ctx.arc(thresholdX + 9, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Curving rubber tire roll-in tracks from Bay Roll-Up Door (u=0.808, v=0.02) to Bays 1-3
    const doorX = w * 0.808;
    const doorY = h * 0.02;
    const trackTargets: [number, number][] = [
      [w * 0.796, h * 0.226],
      [w * 0.796, h * 0.53],
      [w * 0.796, h * 0.834],
    ];
    ctx.strokeStyle = 'rgba(22, 20, 18, 0.22)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    for (const [tx, ty] of trackTargets) {
      for (const offset of [-18, 18]) {
        ctx.beginPath();
        ctx.moveTo(doorX + offset, doorY);
        ctx.quadraticCurveTo(doorX - 90 + offset, ty * 0.6, tx - 140, ty + offset * 0.6);
        ctx.stroke();
      }
    }

    // Anti-fatigue rubber mat behind Dick's Counter (u = 0.470, v = 0.131)
    const matW = 280;
    const matH = 128;
    const matX = Math.round(w * 0.47 - matW / 2);
    const matY = Math.round(h * 0.131 - matH / 2);
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.roundRect(matX, matY, matW, matH, 14);
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(matX + 10, matY + 10, matW - 20, matH - 20, 8);
    ctx.stroke();

    // Diagonal yellow & black safety hazard line at u = 0.641 + Techs Only Stencil
    const hazardX = Math.round(w * 0.641);
    const hazardW = 28;
    ctx.save();
    ctx.beginPath();
    ctx.rect(hazardX - hazardW / 2, 0, hazardW, h);
    ctx.clip();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(hazardX - hazardW / 2, 0, hazardW, h);
    ctx.fillStyle = '#18181b';
    for (let sy = -40; sy < h + 40; sy += 44) {
      ctx.beginPath();
      ctx.moveTo(hazardX - hazardW / 2 - 8, sy);
      ctx.lineTo(hazardX + hazardW / 2 + 8, sy + 24);
      ctx.lineTo(hazardX + hazardW / 2 + 8, sy + 46);
      ctx.lineTo(hazardX - hazardW / 2 - 8, sy + 22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 3;
    ctx.strokeRect(hazardX - hazardW / 2, 0, hazardW, h);

    ctx.save();
    ctx.translate(hazardX - 30, h * 0.52);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(24, 24, 27, 0.56)';
    ctx.font = '900 22px Bahnschrift, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SERVICE BAYS  •  TECHS ONLY', 0, 0);
    ctx.restore();

    // 3 Painted Service Bay Boxes + Floor Drain Grates + Stenciled Bay Numbers
    const bayZones: { label: string; u: number; v: number }[] = [
      { label: 'BAY 1', u: 0.796, v: 0.226 },
      { label: 'BAY 2', u: 0.796, v: 0.53 },
      { label: 'BAY 3', u: 0.796, v: 0.834 },
    ];
    const boxW = 460;
    const boxH = 278;

    for (const bay of bayZones) {
      const bx = Math.round(w * bay.u - boxW / 2);
      const by = Math.round(h * bay.v - boxH / 2);

      // Lift footprint oil shadow
      ctx.fillStyle = 'rgba(24, 22, 18, 0.24)';
      ctx.beginPath();
      ctx.ellipse(w * bay.u, h * bay.v + 6, 178, 86, 0, 0, Math.PI * 2);
      ctx.fill();

      // Weathered yellow corner brackets
      const arm = 54;
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.84)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'square';
      const corners: [number, number, number, number][] = [
        [bx, by, 1, 1],
        [bx + boxW, by, -1, 1],
        [bx, by + boxH, 1, -1],
        [bx + boxW, by + boxH, -1, -1],
      ];
      for (const [cx, cy, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * arm, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * arm);
        ctx.stroke();
      }

      // Dashed bay side borders
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.42)';
      ctx.lineWidth = 4;
      ctx.setLineDash([24, 16]);
      ctx.strokeRect(bx + 6, by + 6, boxW - 12, boxH - 12);
      ctx.setLineDash([]);

      // Recessed slotted floor drain grate at left of bay
      const gx = bx + 28;
      const gy = Math.round(h * bay.v - 34);
      ctx.fillStyle = '#334155';
      ctx.fillRect(gx, gy, 54, 68);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx, gy, 54, 68);
      ctx.fillStyle = '#0f172a';
      for (let slot = 8; slot < 62; slot += 11) {
        ctx.fillRect(gx + 8, gy + slot, 38, 5);
      }

      // Bold stenciled BAY 1 / 2 / 3 floor label on lower-left corner
      ctx.fillStyle = 'rgba(24, 24, 27, 0.65)';
      ctx.font = '900 32px Impact, Arial Black, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(bay.label, bx + 20, by + boxH - 14);
    }

    // Hand-inked floor cracks & oil puddles across concrete shop floor
    const oilSpots: [number, number, number, number][] = [
      [0.44, 0.44, 52, 26],
      [0.52, 0.72, 60, 30],
      [0.72, 0.34, 48, 22],
      [0.84, 0.66, 56, 26],
      [0.75, 0.9, 44, 20],
      [0.58, 0.86, 42, 22],
    ];
    for (const [nx, ny, rx, ry] of oilSpots) {
      const cx = nx * w;
      const cy = ny * h;
      ctx.fillStyle = 'rgba(24, 24, 20, 0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    const cracks: number[][][] = [
      [[0.38, 0.4], [0.44, 0.46], [0.51, 0.44], [0.58, 0.52]],
      [[0.66, 0.16], [0.71, 0.23], [0.77, 0.21]],
      [[0.67, 0.7], [0.73, 0.77], [0.79, 0.85], [0.85, 0.88]],
      [[0.89, 0.42], [0.94, 0.48], [0.98, 0.46]],
    ];
    ctx.strokeStyle = 'rgba(17, 17, 17, 0.56)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const crack of cracks) {
      ctx.beginPath();
      crack.forEach(([nx, ny], idx) => {
        if (idx === 0) ctx.moveTo(nx * w, ny * h);
        else ctx.lineTo(nx * w, ny * h);
      });
      ctx.stroke();
    }

    // Soft ambient occlusion vignette along back (top) & left wall edges
    const leftAo = ctx.createLinearGradient(0, 0, 96, 0);
    leftAo.addColorStop(0, 'rgba(17, 17, 17, 0.42)');
    leftAo.addColorStop(1, 'rgba(17, 17, 17, 0)');
    ctx.fillStyle = leftAo;
    ctx.fillRect(0, 0, 96, h);

    const backAo = ctx.createLinearGradient(0, 0, 0, 96);
    backAo.addColorStop(0, 'rgba(17, 17, 17, 0.42)');
    backAo.addColorStop(1, 'rgba(17, 17, 17, 0)');
    ctx.fillStyle = backAo;
    ctx.fillRect(0, 0, w, 96);
  });
}

/** Weathered diamond-plate service counter front with rust trim & rivets */
export function getWeatheredCounterTexture(): THREE.CanvasTexture | null {
  return createCachedCanvas('weathered-counter', 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8b9297';
    ctx.fillRect(0, 0, w, h);

    // Subtle diamond-plate crosshatch ticks
    ctx.strokeStyle = 'rgba(30, 35, 40, 0.28)';
    ctx.lineWidth = 2;
    for (let y = 20; y < h - 24; y += 22) {
      for (let x = 20; x < w - 20; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 3);
        ctx.lineTo(x + 4, y + 3);
        ctx.stroke();
      }
    }

    // Center dark expanded mesh / kick grille band
    ctx.fillStyle = '#646b70';
    ctx.fillRect(36, 48, w - 72, h - 98);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 48, w - 72, h - 98);

    // Rust & oil smudge patches along bottom kickplate
    ctx.fillStyle = 'rgba(122, 73, 41, 0.45)';
    ctx.fillRect(0, h - 42, w, 42);
    for (let i = 0; i < 16; i++) {
      const cx = hash01(i * 4.1) * w;
      const cy = 60 + hash01(i * 7.3) * (h - 80);
      ctx.fillStyle = 'rgba(92, 54, 28, 0.22)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18 + hash01(i) * 24, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rivets around border
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    for (let x = 22; x <= w - 22; x += 46) {
      for (const y of [22, h - 22]) {
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  });
}

/** Parts pegboard with gaskets, wrenches, chains & oil bottles */
export function getPartsPegboardTexture(): THREE.CanvasTexture | null {
  return createCachedCanvas('parts-pegboard', 512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#6c757a';
    ctx.fillRect(0, 0, w, h);

    // Pegboard holes grid
    ctx.fillStyle = 'rgba(17, 17, 17, 0.45)';
    for (let y = 18; y < h - 14; y += 20) {
      for (let x = 18; x < w - 14; x += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4;

    // Hanging orange & yellow gaskets/belts on top left
    ctx.fillStyle = '#d97706';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(68 + i * 52, 88, 16, 46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Chrome box-end wrenches in middle
    ctx.fillStyle = '#cbd5e1';
    for (let i = 0; i < 5; i++) {
      const wx = 290 + i * 36;
      const len = 82 + (i % 3) * 20;
      ctx.fillRect(wx, 44, 12, len);
      ctx.strokeRect(wx, 44, 12, len);
      ctx.beginPath();
      ctx.arc(wx + 6, 44, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Bottom shelf oil & fluid bottles (amber, red, charcoal)
    const shelfY = 235;
    ctx.fillStyle = '#334155';
    ctx.fillRect(14, shelfY + 95, w - 28, 18);
    ctx.strokeRect(14, shelfY + 95, w - 28, 18);

    const bottleColors = ['#dc2626', '#f59e0b', '#2563eb', '#dc2626', '#eab308', '#1e293b', '#ea580c'];
    bottleColors.forEach((col, i) => {
      const bx = 36 + i * 64;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(bx, shelfY + 20, 42, 74, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111111';
      ctx.fillRect(bx + 12, shelfY + 8, 18, 12);
    });

    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  });
}

/** Wood pegboard holding cartoon biker hats & vinyl slap patches */
export function getHatPegboardTexture(): THREE.CanvasTexture | null {
  return createCachedCanvas('hat-pegboard', 512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#a48155';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(40, 24, 12, 0.38)';
    for (let y = 20; y < h - 16; y += 22) {
      for (let x = 20; x < w - 16; x += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const capColors = ['#18181b', '#7f1d1d', '#334155', '#475569', '#92400e', '#1e293b'];
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#111111';
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = 105 + col * 150;
        const cy = 92 + row * 124;
        ctx.fillStyle = capColors[(row * 3 + col) % capColors.length];
        // Crown
        ctx.beginPath();
        ctx.arc(cx, cy, 42, Math.PI, 0);
        ctx.lineTo(cx + 42, cy + 12);
        ctx.lineTo(cx - 42, cy + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Brim
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 18, 44, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        // Patch emblem
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx - 16, cy - 22, 32, 16);
        ctx.strokeRect(cx - 16, cy - 22, 32, 16);
      }
    }

    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
  });
}

/** Corrugated roll-up steel garage door texture */
export function getRollupBayDoorTexture(): THREE.CanvasTexture | null {
  return createCachedCanvas('rollup-bay-door', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#78828a';
    ctx.fillRect(0, 0, w, h);

    const slats = 10;
    const slatH = h / slats;
    for (let i = 0; i < slats; i++) {
      const y = i * slatH;
      ctx.fillStyle = i % 2 === 0 ? '#818b94' : '#69737c';
      ctx.fillRect(0, y, w, slatH);
      // Top highlight & bottom shadow bevel
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(0, y + 3, w, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, y + slatH - 8, w, 8);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, y + slatH);
      ctx.lineTo(w, y + slatH);
      ctx.stroke();
    }

    // Bottom rubber weather strip
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, h - 22, w, 22);

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, w - 10, h - 10);
  });
}

/** Classic red rolling mechanic tool chest with inked drawer handles */
export function getToolChestFrontTexture(): THREE.CanvasTexture | null {
  return createCachedCanvas('tool-chest-front', 256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#c82828';
    ctx.fillRect(0, 0, w, h);

    const drawerHeights = [30, 34, 38, 44, 52, 68];
    let y = 18;
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4;
    for (const dh of drawerHeights) {
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(16, y, w - 32, dh);
      ctx.strokeRect(16, y, w - 32, dh);
      // Chrome pull strip
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(28, y + 6, w - 56, 8);
      ctx.strokeRect(28, y + 6, w - 56, 8);
      y += dh + 6;
    }

    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  });
}

/** Printed biker graphic tee texture for hanging shirts on V's apparel racks */
export function getHangingTeeTexture(
  baseColor: string,
  motif: 'skull' | 'wrench' | 'stencil' | 'braap',
): THREE.CanvasTexture | null {
  return createCachedCanvas(`tee:${baseColor}:${motif}`, 128, 192, (ctx, w, h) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    // Collar cutout & fold shadow
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.ellipse(w / 2, 12, 22, 10, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    // Vertical fabric creases
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, 34);
    ctx.lineTo(26, h - 18);
    ctx.moveTo(w - 22, 34);
    ctx.lineTo(w - 26, h - 18);
    ctx.stroke();

    // Distressed chest print motif
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (motif === 'skull') {
      ctx.fillStyle = '#e7e5e4';
      ctx.beginPath();
      ctx.arc(w / 2, 78, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(w / 2 - 8, 76, 4.5, 0, Math.PI * 2);
      ctx.arc(w / 2 + 8, 76, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 13px Impact, Arial Black, sans-serif';
      ctx.fillText('HARD R', w / 2, 118);
    } else if (motif === 'braap') {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(24, 58, w - 48, 34);
      ctx.fillStyle = '#fef3c7';
      ctx.font = '900 15px Impact, Arial Black, sans-serif';
      ctx.fillText('BRAAP', w / 2, 76);
    } else if (motif === 'stencil') {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 58, w - 48, 36);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 14px Impact, Arial Black, sans-serif';
      ctx.fillText('DYNA', w / 2, 77);
    } else {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(w / 2, 78, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.font = '900 12px Impact, Arial Black, sans-serif';
      ctx.fillText('WRENCH', w / 2, 78);
    }
  });
}

/** Weathered cream comic tin sign plaque */
export function getComicSignPlaqueTexture(
  key: string,
  lines: string[],
  accentHeader?: string,
  bg = '#ece0c8',
  fg = '#111111',
): THREE.CanvasTexture | null {
  return createCachedCanvas(`sign:${key}`, 512, 256, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle grime vignette
    for (let i = 0; i < 18; i++) {
      const x = hash01(i * 5.2) * w;
      const y = hash01(i * 3.7) * h;
      ctx.fillStyle = 'rgba(65, 50, 35, 0.08)';
      ctx.beginPath();
      ctx.arc(x, y, 12 + hash01(i) * 20, 0, Math.PI * 2);
      ctx.fill();
    }

    if (accentHeader) {
      ctx.fillStyle = accentHeader;
      ctx.fillRect(16, 16, w - 32, 62);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const startY = lines.length === 1 ? 128 : lines.length === 2 ? 96 : 64;
    const gap = lines.length === 2 ? 72 : 58;

    lines.forEach((line, idx) => {
      ctx.font =
        idx === 0
          ? '900 44px Impact, Arial Black, sans-serif'
          : '900 34px Bahnschrift, Arial, sans-serif';
      ctx.fillStyle = accentHeader && idx === 0 ? '#ffffff' : fg;
      ctx.fillText(line, w / 2, startY + idx * gap, w - 48);
    });

    // Corner mounting screws
    ctx.fillStyle = '#475569';
    for (const [sx, sy] of [
      [24, 24],
      [w - 24, 24],
      [24, h - 24],
      [w - 24, h - 24],
    ]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, w - 18, h - 18);
  });
}
