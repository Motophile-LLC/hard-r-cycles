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
  tex.anisotropy = 8;
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

/** Option A split floor: warm wood planks in left apparel corner + cracked greasy concrete in bays */
export function getShopFloorTexture(): THREE.CanvasTexture | null {
  return createCachedCanvas('shop-floor-v2', 1024, 768, (ctx, w, h) => {
    // Slab base: weathered shop concrete (#8c8a82)
    ctx.fillStyle = '#8c8a82';
    ctx.fillRect(0, 0, w, h);

    // Subtle concrete mottling
    for (let i = 0; i < 140; i++) {
      const x = hash01(i * 2.7) * w;
      const y = hash01(i * 5.9) * h;
      const r = 18 + hash01(i * 9.1) * 55;
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(65, 63, 56, 0.08)' : 'rgba(180, 176, 164, 0.07)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, hash01(i) * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Concrete expansion grid lines
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.32)';
    ctx.lineWidth = 3;
    for (let x = 256; x < w; x += 192) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 192; y < h; y += 192) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Apparel Zone Wood Planks (Left ~30% strip)
    const woodWidth = Math.round(w * 0.3);
    ctx.fillStyle = '#a68b67';
    ctx.fillRect(0, 0, woodWidth, h);

    const plankW = 34;
    for (let px = 0; px < woodWidth; px += plankW) {
      ctx.fillStyle =
        Math.floor(px / plankW) % 2 === 0 ? '#a88c68' : '#9c805d';
      ctx.fillRect(px, 0, plankW, h);
      ctx.strokeStyle = '#3f2e1d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();

      // Horizontal board joints + grain
      const jointY = 80 + Math.round(hash01(px * 0.13) * 180);
      for (let y = jointY; y < h; y += 260) {
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(px + plankW, y);
        ctx.stroke();
      }
    }

    // Bold comic ink divider threshold between wood retail floor and concrete shop
    ctx.fillStyle = '#334155';
    ctx.fillRect(woodWidth - 6, 0, 12, h);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(woodWidth - 6, 0);
    ctx.lineTo(woodWidth - 6, h);
    ctx.moveTo(woodWidth + 6, 0);
    ctx.lineTo(woodWidth + 6, h);
    ctx.stroke();

    // Hand-inked floor cracks & oil puddles around center counter & bay lifts
    const oilSpots: [number, number, number, number][] = [
      [0.44, 0.25, 36, 18],
      [0.48, 0.56, 44, 24],
      [0.72, 0.3, 52, 26],
      [0.78, 0.55, 62, 32],
      [0.74, 0.8, 56, 28],
      [0.62, 0.69, 34, 18],
    ];
    for (const [nx, ny, rx, ry] of oilSpots) {
      const cx = nx * w;
      const cy = ny * h;
      ctx.fillStyle = 'rgba(24, 24, 20, 0.34)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.48)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const cracks: number[][][] = [
      [[0.4, 0.42], [0.46, 0.47], [0.51, 0.45], [0.57, 0.53]],
      [[0.63, 0.19], [0.68, 0.26], [0.74, 0.24]],
      [[0.64, 0.72], [0.7, 0.78], [0.76, 0.86], [0.83, 0.89]],
      [[0.86, 0.4], [0.91, 0.46], [0.95, 0.44]],
    ];
    ctx.strokeStyle = 'rgba(17, 17, 17, 0.62)';
    ctx.lineWidth = 2.5;
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
