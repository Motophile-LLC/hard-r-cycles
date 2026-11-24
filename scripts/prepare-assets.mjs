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
const SHEET_03_SRC = path.join(ROOT_DIR, 'planning', 'asset-sheets', 'Sheet_03_Dick_Expansion.jpg');
const SHEET_04_SRC = path.join(ROOT_DIR, 'planning', 'asset-sheets', 'Sheet_04_Scooter_Expansion.jpg');
const SHEET_05_SRC = path.join(ROOT_DIR, 'planning', 'asset-sheets', 'Sheet_05_Live_Bay_Techs.jpg');
const SHEET_06_SRC = path.join(ROOT_DIR, 'planning', 'asset-sheets', 'Sheet_06_Props_Signage_Kit.jpg');
const SHEET_07_SRC = path.join(ROOT_DIR, 'planning', 'asset-sheets', 'Sheet_07_Isometric_Bikes_VFX_UI.jpg');
const SHEET_08_SRC = path.join(ROOT_DIR, 'planning', 'asset-sheets', 'Sheet_08_Parts_Garage_Props.jpg');
const CUSTOMER_ASSETS_DIR = path.resolve(ROOT_DIR, '..', 'HardRToons', 'Assets');
const OUT_CHARACTERS_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'characters');
const OUT_V_DIR = path.join(OUT_CHARACTERS_DIR, 'v');
const OUT_CUSTOMERS_DIR = path.join(OUT_CHARACTERS_DIR, 'customers');
const OUT_PORTRAITS_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'portraits');
const OUT_PROPS_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'props');
const OUT_SIGNS_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'props', 'signs');
const OUT_BIKES_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'bikes');
const OUT_VFX_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'vfx');
const OUT_UI_DIR = path.join(ROOT_DIR, 'public', 'sprites', 'ui');
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
    skipInnerPockets = false,
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
  if (!skipInnerPockets) {
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

function isolateComponents(rgba, w, h, opts = {}) {
  const { keepLargest = false, keepComponents = null, minCompPixels = 40 } = opts;
  if (!keepLargest && (!Array.isArray(keepComponents) || keepComponents.length === 0)) {
    return;
  }

  const total = w * h;
  const labels = new Int32Array(total);
  const stack = new Int32Array(total);
  const comps = [];
  let nextLabel = 1;

  for (let i = 0; i < total; i++) {
    if (labels[i] !== 0 || rgba[i * 4 + 3] < 24) continue;
    const label = nextLabel++;
    let sp = 0;
    stack[sp++] = i;
    labels[i] = label;
    let count = 0;

    while (sp > 0) {
      const cur = stack[--sp];
      count++;
      const cx = cur % w;
      const cy = (cur - cx) / w;
      if (cx > 0 && labels[cur - 1] === 0 && rgba[(cur - 1) * 4 + 3] >= 24) {
        labels[cur - 1] = label;
        stack[sp++] = cur - 1;
      }
      if (cx < w - 1 && labels[cur + 1] === 0 && rgba[(cur + 1) * 4 + 3] >= 24) {
        labels[cur + 1] = label;
        stack[sp++] = cur + 1;
      }
      if (cy > 0 && labels[cur - w] === 0 && rgba[(cur - w) * 4 + 3] >= 24) {
        labels[cur - w] = label;
        stack[sp++] = cur - w;
      }
      if (cy < h - 1 && labels[cur + w] === 0 && rgba[(cur + w) * 4 + 3] >= 24) {
        labels[cur + w] = label;
        stack[sp++] = cur + w;
      }
    }
    comps.push({ label, count });
  }

  if (comps.length === 0) return;

  const keepIds = new Set();
  if (keepLargest) {
    let best = comps[0];
    for (const c of comps) {
      if (c.count > best.count) best = c;
    }
    keepIds.add(best.label);
  }

  if (Array.isArray(keepComponents) && keepComponents.length > 0) {
    const valid = new Set(comps.filter((c) => c.count >= minCompPixels).map((c) => c.label));
    for (const [nx, ny] of keepComponents) {
      const sx = Math.max(0, Math.min(w - 1, Math.round(nx * (w - 1))));
      const sy = Math.max(0, Math.min(h - 1, Math.round(ny * (h - 1))));
      const direct = labels[sy * w + sx];
      if (direct > 0 && valid.has(direct)) {
        keepIds.add(direct);
        continue;
      }
      let bestLabel = 0;
      let bestDist2 = Infinity;
      for (let y = 0; y < h; y++) {
        const dy = y - sy;
        const dy2 = dy * dy;
        if (dy2 > bestDist2) continue;
        for (let x = 0; x < w; x++) {
          const lbl = labels[y * w + x];
          if (lbl === 0 || !valid.has(lbl)) continue;
          const dx = x - sx;
          const d2 = dx * dx + dy2;
          if (d2 < bestDist2) {
            bestDist2 = d2;
            bestLabel = lbl;
          }
        }
      }
      if (bestLabel > 0) {
        keepIds.add(bestLabel);
      }
    }
  }

  if (keepIds.size > 0) {
    for (let i = 0; i < total; i++) {
      if (!keepIds.has(labels[i])) {
        rgba[i * 4 + 3] = 0;
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
    keepLargest = false,
    keepComponents = null,
    minCompPixels = 40,
    maskRects = null,
  } = opts;

  const { data, info } = await sharp(srcPath)
    .extract(region)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (Array.isArray(maskRects)) {
    for (const [nx0, ny0, nx1, ny1] of maskRects) {
      const x0 = Math.max(0, Math.floor(nx0 * info.width));
      const y0 = Math.max(0, Math.floor(ny0 * info.height));
      const x1 = Math.min(info.width, Math.ceil(nx1 * info.width));
      const y1 = Math.min(info.height, Math.ceil(ny1 * info.height));
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const off = (y * info.width + x) * 4;
          rgba[off] = 245;
          rgba[off + 1] = 241;
          rgba[off + 2] = 230;
        }
      }
    }
  }
  stripBackdrop(rgba, info.width, info.height, stripOpts);
  isolateComponents(rgba, info.width, info.height, {
    keepLargest,
    keepComponents,
    minCompPixels,
  });

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

  const charStrip = { borderTol: 44, innerPocketDist: 28, minPocketArea: 85 };

  // Sheet 03 (Dick Expansion) + Sheet 04 (Scooter Expansion) + Sheet 05 (Bay Tech Variants)
  const extraCharacters = [
    [
      'dick',
      SHEET_03_SRC,
      [
        ['back-three-quarter', { left: 48, top: 84, width: 242, height: 636 }, { keepLargest: true }],
        [
          'leaning',
          { left: 280, top: 102, width: 348, height: 618 },
          {
            keepComponents: [[0.42, 0.5]],
            maskRects: [
              [0, 0.49, 0.14, 0.56],
              [0.855, 0.49, 1, 0.56],
            ],
          },
        ],
        ['clipboard', { left: 582, top: 102, width: 230, height: 618 }, { keepComponents: [[0.52, 0.5]] }],
        ['get-out', { left: 806, top: 98, width: 220, height: 622 }, { keepLargest: true }],
      ],
    ],
    [
      'scooter',
      SHEET_04_SRC,
      [
        ['back-three-quarter', { left: 64, top: 84, width: 216, height: 636 }, { keepLargest: true }],
        ['sweeping', { left: 292, top: 100, width: 314, height: 620 }, { keepComponents: [[0.38, 0.5]] }],
        [
          'dropped-it',
          { left: 530, top: 106, width: 242, height: 612 },
          { keepComponents: [[0.55, 0.45], [0.8, 0.56]] },
        ],
        ['parts-pitch', { left: 768, top: 100, width: 236, height: 618 }, { keepLargest: true }],
      ],
    ],
    [
      'bay-tech-a',
      SHEET_05_SRC,
      [
        ['wrenching', { left: 70, top: 160, width: 182, height: 526 }, { keepLargest: true }],
        ['at-lift', { left: 248, top: 160, width: 214, height: 524 }, { keepLargest: true }],
      ],
    ],
    [
      'bay-tech-b',
      SHEET_05_SRC,
      [
        ['wrenching', { left: 482, top: 156, width: 208, height: 530 }, { keepLargest: true }],
        ['at-lift', { left: 690, top: 156, width: 216, height: 526 }, { keepLargest: true }],
      ],
    ],
    [
      'bay-tech-c',
      SHEET_05_SRC,
      [
        ['wrenching', { left: 938, top: 156, width: 198, height: 530 }, { keepLargest: true }],
        ['at-lift', { left: 1130, top: 160, width: 210, height: 524 }, { keepLargest: true }],
      ],
    ],
  ];

  for (const [charId, srcPath, specs] of extraCharacters) {
    if (!(await fileExists(srcPath))) continue;
    manifest.characters[charId] = {};
    for (const [pose, region, extraOpts] of specs) {
      const outPath = path.join(OUT_CHARACTERS_DIR, charId, `${pose}.png`);
      const dims = await extractCutout(srcPath, region, outPath, {
        targetHeight: TARGET_HEIGHT,
        anchor: 'bottom-center',
        stripOpts: charStrip,
        ...extraOpts,
      });
      manifest.characters[charId][pose] = {
        frame: `/sprites/characters/${charId}/${pose}.png`,
        width: dims.width,
        height: dims.height,
        anchor: 'bottom-center',
      };
    }
  }

  // Sheets 03 & 04 Extra Mood Portraits
  const extraPortraits = [
    ['dick-glaring', SHEET_03_SRC, { left: 1022, top: 68, width: 158, height: 176 }],
    ['dick-smartass', SHEET_03_SRC, { left: 1184, top: 68, width: 154, height: 176 }],
    ['dick-furious', SHEET_03_SRC, { left: 1018, top: 278, width: 164, height: 196 }],
    ['dick-eyeroll', SHEET_03_SRC, { left: 1186, top: 278, width: 154, height: 196 }],
    ['dick-wtf', SHEET_03_SRC, { left: 1014, top: 504, width: 170, height: 212 }],
    ['dick-stoked', SHEET_03_SRC, { left: 1184, top: 506, width: 160, height: 210 }],
    ['scooter-duh', SHEET_04_SRC, { left: 1024, top: 82, width: 146, height: 190 }],
    ['scooter-hyped', SHEET_04_SRC, { left: 1182, top: 82, width: 146, height: 190 }],
    ['scooter-busted', SHEET_04_SRC, { left: 1026, top: 300, width: 146, height: 194 }],
    ['scooter-clueless', SHEET_04_SRC, { left: 1188, top: 300, width: 146, height: 194 }],
    ['scooter-pop', SHEET_04_SRC, { left: 1028, top: 526, width: 150, height: 192 }],
    ['scooter-whoa', SHEET_04_SRC, { left: 1190, top: 526, width: 146, height: 192 }],
  ];

  for (const [id, srcPath, region] of extraPortraits) {
    if (!(await fileExists(srcPath))) continue;
    const outPath = path.join(OUT_PORTRAITS_DIR, `${id}.png`);
    const dims = await extractCutout(srcPath, region, outPath, {
      targetHeight: 256,
      anchor: 'center',
      stripOpts: { borderTol: 48, innerPocketDist: 28, minPocketArea: 90 },
      keepLargest: true,
    });
    manifest.portraits[id] = {
      frame: `/sprites/portraits/${id}.png`,
      width: dims.width,
      height: dims.height,
    };
  }

  // Sheet 06 Wall Signs
  if (await fileExists(SHEET_06_SRC)) {
    manifest.props = manifest.props || {};
    const signSpecs = [
      ['sign-labor-rate', { left: 390, top: 150, width: 360, height: 164 }],
      ['sign-no-refunds', { left: 770, top: 122, width: 172, height: 112 }],
      ['sign-cash-only', { left: 770, top: 234, width: 172, height: 112 }],
      ['sign-safety-3rd', { left: 958, top: 150, width: 180, height: 156 }],
      ['sign-oil-leaks', { left: 1138, top: 150, width: 196, height: 156 }],
    ];
    for (const [id, region] of signSpecs) {
      const outPath = path.join(OUT_SIGNS_DIR, `${id}.png`);
      const dims = await extractCutout(SHEET_06_SRC, region, outPath, {
        targetHeight: 256,
        anchor: 'center',
        stripOpts: { skipInnerPockets: true, borderTol: 42 },
        keepLargest: true,
      });
      manifest.props[id] = {
        frame: `/sprites/props/signs/${id}.png`,
        width: dims.width,
        height: dims.height,
      };
    }

    const heroPropSpecs = [
      [
        'prop-hanging-logo',
        { left: 49, top: 74, width: 326, height: 274 },
        {
          anchor: 'center',
          stripOpts: { skipInnerPockets: true, borderTol: 42 },
          keepLargest: true,
        },
      ],
      [
        'prop-apparel-rack',
        { left: 37, top: 392, width: 288, height: 332 },
        {
          anchor: 'bottom-center',
          stripOpts: {
            skipInnerPockets: false,
            borderTol: 42,
            innerPocketDist: 28,
            minPocketArea: 60,
            protectHeadEyes: false,
          },
          keepLargest: true,
        },
      ],
      [
        'prop-hat-pegboard',
        { left: 340, top: 343, width: 206, height: 268 },
        {
          anchor: 'center',
          stripOpts: { skipInnerPockets: true, borderTol: 42 },
          keepComponents: [[0.5, 0.45]],
        },
      ],
      [
        'prop-sticker-table',
        { left: 370, top: 549, width: 192, height: 171 },
        {
          anchor: 'bottom-center',
          stripOpts: {
            skipInnerPockets: false,
            borderTol: 42,
            innerPocketDist: 28,
            minPocketArea: 60,
            protectHeadEyes: false,
          },
          keepComponents: [[0.55, 0.55]],
          maskRects: [[0, 0, 0.18, 0.08]],
        },
      ],
      [
        'prop-service-counter',
        { left: 581, top: 409, width: 292, height: 300 },
        {
          anchor: 'bottom-center',
          stripOpts: { skipInnerPockets: true, borderTol: 42 },
          keepLargest: true,
        },
      ],
      [
        'prop-front-door',
        { left: 892, top: 358, width: 228, height: 353 },
        {
          anchor: 'bottom-center',
          stripOpts: { skipInnerPockets: true, borderTol: 42 },
          keepLargest: true,
        },
      ],
      [
        'prop-breaker-box',
        { left: 1148, top: 393, width: 191, height: 309 },
        {
          anchor: 'center',
          stripOpts: { skipInnerPockets: true, borderTol: 42 },
          keepLargest: true,
        },
      ],
    ];

    for (const [id, region, opts] of heroPropSpecs) {
      const outPath = path.join(OUT_PROPS_DIR, `${id}.png`);
      const dims = await extractCutout(SHEET_06_SRC, region, outPath, {
        targetHeight: TARGET_HEIGHT,
        ...opts,
      });
      manifest.props[id] = {
        frame: `/sprites/props/${id}.png`,
        width: dims.width,
        height: dims.height,
        anchor: opts.anchor,
      };
    }
  }

  // Sheet 07 Isometric Bikes + VFX + HUD UI Icons
  if (await fileExists(SHEET_07_SRC)) {
    manifest.bikes = manifest.bikes || {};
    const isoBikeSpecs = [
      ['track-bagger-iso', { left: 64, top: 145, width: 280, height: 244 }, [[0.42, 0.5]]],
      ['track-bagger-iso-rear', { left: 252, top: 138, width: 236, height: 250 }, [[0.58, 0.55]]],
      ['bigwheel-bagger-iso', { left: 488, top: 134, width: 272, height: 254 }, [[0.4, 0.52]]],
      ['bigwheel-bagger-iso-rear', { left: 662, top: 142, width: 248, height: 246 }, [[0.58, 0.55]]],
      ['club-dyna-iso', { left: 904, top: 146, width: 232, height: 242 }, [[0.42, 0.52]]],
      ['club-dyna-iso-rear', { left: 1094, top: 138, width: 226, height: 250 }, [[0.58, 0.55]]],
    ];
    for (const [id, region, seeds] of isoBikeSpecs) {
      const outPath = path.join(OUT_BIKES_DIR, `${id}.png`);
      const dims = await extractCutout(SHEET_07_SRC, region, outPath, {
        targetHeight: TARGET_HEIGHT,
        anchor: 'bottom-center',
        stripOpts: {
          borderTol: 36,
          innerPocketDist: 18,
          minPocketArea: 90,
          protectHeadEyes: false,
        },
        keepComponents: seeds,
      });
      manifest.bikes[id] = {
        frame: `/sprites/bikes/${id}.png`,
        width: dims.width,
        height: dims.height,
        anchor: 'bottom-center',
      };
    }

    manifest.vfx = manifest.vfx || {};
    const vfxSpecs = [
      ['sparks', { left: 50, top: 516, width: 188, height: 170 }, { skipInnerPockets: false }],
      ['smoke', { left: 230, top: 520, width: 180, height: 172 }, { skipInnerPockets: true }],
      ['zap', { left: 406, top: 516, width: 128, height: 180 }, { skipInnerPockets: true }],
    ];
    for (const [id, region, stripOpts] of vfxSpecs) {
      const outPath = path.join(OUT_VFX_DIR, `${id}.png`);
      const dims = await extractCutout(SHEET_07_SRC, region, outPath, {
        targetHeight: 256,
        anchor: 'center',
        stripOpts: { borderTol: 42, ...stripOpts },
        keepLargest: true,
      });
      manifest.vfx[id] = {
        frame: `/sprites/vfx/${id}.png`,
        width: dims.width,
        height: dims.height,
      };
    }

    manifest.ui = manifest.ui || {};
    const uiSpecs = [
      ['icon-apparel', { left: 822, top: 570, width: 108, height: 108 }],
      ['icon-parts', { left: 926, top: 570, width: 104, height: 108 }],
      ['icon-service', { left: 1026, top: 570, width: 104, height: 108 }],
      ['icon-bays', { left: 1126, top: 570, width: 104, height: 108 }],
      ['icon-cart', { left: 1226, top: 570, width: 104, height: 108 }],
    ];
    for (const [id, region] of uiSpecs) {
      const outPath = path.join(OUT_UI_DIR, `${id}.png`);
      const dims = await extractCutout(SHEET_07_SRC, region, outPath, {
        targetHeight: 128,
        anchor: 'center',
        stripOpts: { skipInnerPockets: true, borderTol: 42 },
        keepLargest: true,
      });
      manifest.ui[id] = {
        frame: `/sprites/ui/${id}.png`,
        width: dims.width,
        height: dims.height,
      };
    }
  }

  // Sheet 08 Parts & Garage Props
  if (await fileExists(SHEET_08_SRC)) {
    manifest.props = manifest.props || {};
    const garagePropSpecs = [
      [
        'prop-parts-shelf',
        { left: 65, top: 33, width: 347, height: 404 },
        {
          anchor: 'bottom-center',
          stripOpts: {
            skipInnerPockets: false,
            borderTol: 42,
            innerPocketDist: 28,
            minPocketArea: 45,
            protectHeadEyes: false,
          },
          keepLargest: true,
        },
      ],
      [
        'prop-back-parts-rack',
        { left: 526, top: 56, width: 326, height: 357 },
        {
          anchor: 'center',
          stripOpts: { skipInnerPockets: true, borderTol: 42 },
          keepLargest: true,
        },
      ],
      [
        'prop-rollup-door',
        { left: 904, top: 35, width: 412, height: 372 },
        {
          anchor: 'center',
          stripOpts: { skipInnerPockets: true, borderTol: 42 },
          minCompPixels: 18,
        },
      ],
      [
        'prop-tool-chest',
        { left: 112, top: 416, width: 258, height: 324 },
        {
          anchor: 'bottom-center',
          stripOpts: { skipInnerPockets: true, borderTol: 42 },
          keepLargest: true,
        },
      ],
      [
        'prop-tire-stack',
        { left: 612, top: 446, width: 257, height: 276 },
        {
          anchor: 'bottom-center',
          stripOpts: {
            skipInnerPockets: false,
            borderTol: 42,
            innerPocketDist: 28,
            minPocketArea: 60,
            protectHeadEyes: false,
          },
          keepLargest: true,
        },
      ],
      [
        'prop-oil-drum-cone',
        { left: 1020, top: 432, width: 302, height: 308 },
        {
          anchor: 'bottom-center',
          stripOpts: { skipInnerPockets: true, borderTol: 42 },
          keepComponents: [[0.25, 0.5], [0.82, 0.72]],
        },
      ],
    ];

    for (const [id, region, opts] of garagePropSpecs) {
      const outPath = path.join(OUT_PROPS_DIR, `${id}.png`);
      const dims = await extractCutout(SHEET_08_SRC, region, outPath, {
        targetHeight: TARGET_HEIGHT,
        ...opts,
      });
      manifest.props[id] = {
        frame: `/sprites/props/${id}.png`,
        width: dims.width,
        height: dims.height,
        anchor: opts.anchor,
      };
    }
  }

  manifest.generatedAt = new Date().toISOString();
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('[prepare-assets] Sheets 02-08 + customers sliced and manifest updated!');
}

main().catch((err) => {
  console.error('[prepare-assets] Failed:', err);
  process.exitCode = 1;
});
