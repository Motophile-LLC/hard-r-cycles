import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const LOGO_SRC = path.join(ROOT_DIR, 'planning', 'brand', 'hard_r_cycles_logo.jpg');
const LOGO_OUT = path.join(ROOT_DIR, 'public', 'brand', 'hard-r-cycles-logo.png');
const ICON_OUT = path.join(ROOT_DIR, 'src', 'app', 'icon.png');
const APPLE_ICON_OUT = path.join(ROOT_DIR, 'src', 'app', 'apple-icon.png');
const OG_CARD_OUT = path.join(ROOT_DIR, 'public', 'brand', 'og-card.png');
const V_SHEET_SRC = path.join(ROOT_DIR, 'planning', 'asset-sheets', 'Sheet_02_V_Master.jpg');
const CUSTOMER_ASSETS_DIR = path.resolve(ROOT_DIR, '..', 'HardRToons', 'Assets');
const OUT_V_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'characters', 'v');
const OUT_CUSTOMERS_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'characters', 'customers');
const OUT_PORTRAITS_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'portraits');
const MANIFEST_PATH = path.join(ROOT_DIR, 'public', 'sprites', 'manifest.json');

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

const TARGET_HEIGHT = 512;

function getLum(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getChroma(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function stripBackdrop(rgba, w, h, opts = {}) {
  const {
    borderTol = 44,
    stepTol = 14,
    minBgLum = 175,
    maxChroma = 34,
    innerPocketDist = 28,
    minPocketArea = 90,
    protectHeadEyes = true,
  } = opts;

  const total = w * h;
  const samples = [4 * w + 4, 4 * w + (w - 5)];
  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (const idx of samples) {
    sr += rgba[idx * 4];
    sg += rgba[idx * 4 + 1];
    sb += rgba[idx * 4 + 2];
  }
  sr = Math.round(sr / samples.length);
  sg = Math.round(sg / samples.length);
  sb = Math.round(sb / samples.length);

  const visited = new Uint8Array(total);
  const bgMask = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBorderSeed = (idx) => {
    const off = idx * 4;
    const r = rgba[off];
    const g = rgba[off + 1];
    const b = rgba[off + 2];
    return (
      getLum(r, g, b) >= minBgLum &&
      getChroma(r, g, b) <= maxChroma &&
      colorDist(r, g, b, sr, sg, sb) <= borderTol
    );
  };

  const enqueueSeed = (idx) => {
    if (!visited[idx] && isBorderSeed(idx)) {
      visited[idx] = 1;
      bgMask[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    enqueueSeed(x);
    enqueueSeed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    enqueueSeed(y * w);
    enqueueSeed(y * w + (w - 1));
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    const off = idx * 4;
    const pr = rgba[off];
    const pg = rgba[off + 1];
    const pb = rgba[off + 2];

    const neighbors = [
      x > 0 ? idx - 1 : -1,
      x < w - 1 ? idx + 1 : -1,
      y > 0 ? idx - w : -1,
      y < h - 1 ? idx + w : -1,
    ];

    for (const n of neighbors) {
      if (n < 0 || visited[n]) continue;
      const noff = n * 4;
      const nr = rgba[noff];
      const ng = rgba[noff + 1];
      const nb = rgba[noff + 2];
      if (
        getLum(nr, ng, nb) >= minBgLum &&
        getChroma(nr, ng, nb) <= maxChroma &&
        (colorDist(nr, ng, nb, sr, sg, sb) <= borderTol ||
          colorDist(nr, ng, nb, pr, pg, pb) <= stepTol)
      ) {
        visited[n] = 1;
        bgMask[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  // Enclosed background pockets (between legs, under arms, hanger gap)
  const compVisited = new Uint8Array(total);
  const stack = new Int32Array(total);
  const headLimitY = protectHeadEyes ? Math.floor(h * 0.28) : -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (bgMask[start] || compVisited[start]) continue;

      const off = start * 4;
      if (
        getChroma(rgba[off], rgba[off + 1], rgba[off + 2]) > maxChroma ||
        colorDist(rgba[off], rgba[off + 1], rgba[off + 2], sr, sg, sb) > innerPocketDist
      ) {
        continue;
      }

      let sp = 0;
      stack[sp++] = start;
      compVisited[start] = 1;
      const pixels = [];
      let minY = y;

      while (sp > 0) {
        const idx = stack[--sp];
        pixels.push(idx);
        const cx = idx % w;
        const cy = (idx - cx) / w;
        if (cy < minY) minY = cy;

        const neighbors = [
          cx > 0 ? idx - 1 : -1,
          cx < w - 1 ? idx + 1 : -1,
          cy > 0 ? idx - w : -1,
          cy < h - 1 ? idx + w : -1,
        ];
        for (const n of neighbors) {
          if (n < 0 || bgMask[n] || compVisited[n]) continue;
          const noff = n * 4;
          if (
            getChroma(rgba[noff], rgba[noff + 1], rgba[noff + 2]) <= maxChroma &&
            colorDist(rgba[noff], rgba[noff + 1], rgba[noff + 2], sr, sg, sb) <= innerPocketDist
          ) {
            compVisited[n] = 1;
            stack[sp++] = n;
          }
        }
      }

      if (
        pixels.length >= minPocketArea &&
        !(protectHeadEyes && minY < headLimitY && pixels.length < 900)
      ) {
        for (const p of pixels) {
          bgMask[p] = 1;
        }
      }
    }
  }

  for (let i = 0; i < total; i++) {
    if (bgMask[i]) {
      rgba[i * 4 + 3] = 0;
    }
  }

  // Soften 1px light outline halo
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const off = idx * 4;
      if (rgba[off + 3] === 0) continue;
      const touchesBg =
        bgMask[idx - 1] || bgMask[idx + 1] || bgMask[idx - w] || bgMask[idx + w];
      if (touchesBg && getLum(rgba[off], rgba[off + 1], rgba[off + 2]) > 165) {
        rgba[off + 3] = Math.round(rgba[off + 3] * 0.45);
      }
    }
  }
}

function findTrimBounds(rgba, w, h) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] >= 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function prepareCleanLogo() {
  const { data, info } = await sharp(LOGO_SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  // Mask out the faint bottom-right AI sparkle mark outside the outer white border
  const maskX = Math.floor(info.width * 0.935);
  const maskY = Math.floor(info.height * 0.895);
  for (let y = maskY; y < info.height; y++) {
    for (let x = maskX; x < info.width; x++) {
      const off = (y * info.width + x) * 4;
      // Only wipe pixels outside the white border frame (low brightness corner area)
      if (getLum(rgba[off], rgba[off + 1], rgba[off + 2]) < 210) {
        rgba[off] = 0;
        rgba[off + 1] = 0;
        rgba[off + 2] = 0;
      }
    }
  }

  await fs.mkdir(path.dirname(LOGO_OUT), { recursive: true });
  await sharp(Buffer.from(rgba), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(LOGO_OUT);

  console.log(`[prepare-assets] Cleaned logo saved (${info.width}x${info.height}) -> ${LOGO_OUT}`);
}

async function prepareBrandIconsAndOg() {
  const logo512 = await sharp(LOGO_OUT)
    .resize(448, 448, { fit: 'inside', background: { r: 9, g: 9, b: 11, alpha: 0 } })
    .png()
    .toBuffer();

  await fs.mkdir(path.dirname(ICON_OUT), { recursive: true });
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 255 },
    },
  })
    .composite([{ input: logo512, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(ICON_OUT);

  const logo180 = await sharp(LOGO_OUT)
    .resize(156, 156, { fit: 'inside', background: { r: 9, g: 9, b: 11, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 255 },
    },
  })
    .composite([{ input: logo180, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(APPLE_ICON_OUT);

  const logoOg = await sharp(LOGO_OUT)
    .resize(760, 400, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const logoOgMeta = await sharp(logoOg).metadata();
  const logoOgLeft = Math.floor((1200 - (logoOgMeta.width ?? 734)) / 2);

  const ogFrameSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="22" width="1156" height="586" rx="26" fill="none" stroke="#f59e0b" stroke-width="10"/>
      <rect x="42" y="42" width="1116" height="546" rx="18" fill="none" stroke="#fbbf24" stroke-width="3" stroke-opacity="0.7"/>
      <rect x="42" y="514" width="1116" height="74" fill="#f59e0b"/>
      <text x="600" y="560" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="21" font-weight="900" fill="#111111" letter-spacing="1.5">INTERACTIVE 3D MOTORCYCLE SHOP • APPAREL • FLAT RATE PANIC</text>
    </svg>
  `);

  await fs.mkdir(path.dirname(OG_CARD_OUT), { recursive: true });
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 255 },
    },
  })
    .composite([
      { input: ogFrameSvg, top: 0, left: 0 },
      { input: logoOg, top: 68, left: logoOgLeft },
    ])
    .png({ compressionLevel: 9 })
    .toFile(OG_CARD_OUT);

  console.log(`[prepare-assets] Brand icons + OG card generated -> ${ICON_OUT}, ${APPLE_ICON_OUT}, ${OG_CARD_OUT}`);
}

async function extractCutout(srcPath, region, outPath, opts = {}) {
  const {
    targetHeight = TARGET_HEIGHT,
    anchor = 'bottom-center',
    stripOpts = {},
  } = opts;

  const { data, info } = await sharp(srcPath)
    .extract(region)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  stripBackdrop(rgba, info.width, info.height, stripOpts);

  const trim = findTrimBounds(rgba, info.width, info.height);
  if (!trim) {
    throw new Error(`Empty cutout for ${outPath}`);
  }

  const trimmedBuf = await sharp(Buffer.from(rgba), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract(trim)
    .png()
    .toBuffer();

  const innerH = targetHeight - 16;
  const scale = innerH / Math.max(1, trim.height);
  const resizedW = Math.max(1, Math.round(trim.width * scale));
  const canvasW = Math.max(128, Math.ceil((resizedW + 24) / 2) * 2);
  const leftOffset = Math.floor((canvasW - resizedW) / 2);
  const topOffset =
    anchor === 'center'
      ? Math.floor((targetHeight - innerH) / 2)
      : targetHeight - innerH - 4;

  const resizedPng = await sharp(trimmedBuf)
    .resize(resizedW, innerH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp({
    create: {
      width: canvasW,
      height: targetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedPng, left: leftOffset, top: topOffset }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  return { width: canvasW, height: targetHeight };
}

async function main() {
  await prepareCleanLogo();
  await prepareBrandIconsAndOg();

  const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  // Sheet_02_V_Master.jpg is 1376x768
  const vPoses = [
    ['front', { left: 32, top: 68, width: 274, height: 646 }],
    ['three-quarter', { left: 320, top: 68, width: 288, height: 646 }],
    ['profile', { left: 680, top: 92, width: 182, height: 622 }],
    ['back-three-quarter', { left: 882, top: 88, width: 174, height: 626 }],
    ['action', { left: 1084, top: 62, width: 270, height: 376 }],
  ];

  manifest.characters = manifest.characters || {};
  manifest.characters.v = {};

  for (const [pose, region] of vPoses) {
    const outPath = path.join(OUT_V_DIR, `${pose}.png`);
    const dims = await extractCutout(V_SHEET_SRC, region, outPath, {
      targetHeight: TARGET_HEIGHT,
      anchor: 'bottom-center',
      stripOpts: { borderTol: 44, innerPocketDist: 28, minPocketArea: 80 },
    });
    manifest.characters.v[pose] = {
      frame: `/sprites/characters/v/${pose}.png`,
      width: dims.width,
      height: dims.height,
      anchor: 'bottom-center',
    };
  }

  const customerSpecs = [
    [
      'customer-1',
      path.join(CUSTOMER_ASSETS_DIR, 'Customer_Color_Sheet.jpeg'),
      { left: 730, top: 195, width: 635, height: 1472 },
    ],
    [
      'customer-2',
      path.join(CUSTOMER_ASSETS_DIR, 'Customer_02_Color_Sheet.jpeg'),
      { left: 675, top: 200, width: 710, height: 1470 },
    ],
    [
      'customer-3',
      path.join(CUSTOMER_ASSETS_DIR, 'Customer_03_Color_Sheet.jpeg'),
      { left: 748, top: 205, width: 642, height: 1470 },
    ],
  ];

  manifest.characters.customers = manifest.characters.customers || {};
  for (const [pose, srcPath, region] of customerSpecs) {
    const outPath = path.join(OUT_CUSTOMERS_DIR, `${pose}.png`);
    if (await fileExists(srcPath)) {
      const dims = await extractCutout(srcPath, region, outPath, {
        targetHeight: TARGET_HEIGHT,
        anchor: 'bottom-center',
        stripOpts: { borderTol: 48, innerPocketDist: 30, minPocketArea: 90 },
      });
      manifest.characters.customers[pose] = {
        frame: `/sprites/characters/customers/${pose}.png`,
        width: dims.width,
        height: dims.height,
        anchor: 'bottom-center',
      };
    } else if (await fileExists(outPath)) {
      const meta = await sharp(outPath).metadata();
      manifest.characters.customers[pose] = {
        frame: `/sprites/characters/customers/${pose}.png`,
        width: meta.width ?? 256,
        height: meta.height ?? TARGET_HEIGHT,
        anchor: 'bottom-center',
      };
    }
  }

  const vPortraits = [
    ['v-eyeroll', { left: 1060, top: 492, width: 136, height: 195 }],
    ['v-smirk', { left: 1196, top: 492, width: 150, height: 195 }],
  ];

  manifest.portraits = manifest.portraits || {};
  for (const [id, region] of vPortraits) {
    const outPath = path.join(OUT_PORTRAITS_DIR, `${id}.png`);
    const dims = await extractCutout(V_SHEET_SRC, region, outPath, {
      targetHeight: 256,
      anchor: 'center',
      stripOpts: { borderTol: 48, innerPocketDist: 28, minPocketArea: 90 },
    });
    manifest.portraits[id] = {
      frame: `/sprites/portraits/${id}.png`,
      width: dims.width,
      height: dims.height,
    };
  }

  manifest.generatedAt = new Date().toISOString();
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('[prepare-assets] V + customer sprites & portraits sliced and manifest updated!');
}

main().catch((err) => {
  console.error('[prepare-assets] Failed:', err);
  process.exitCode = 1;
});
