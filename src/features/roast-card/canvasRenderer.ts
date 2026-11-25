'use client';

import type { StaffId } from '../../types/shop';
import type { RoastCardAspect, RoastCardPayload } from './types';

export interface RenderedRoastCardAsset {
  blob: Blob;
  dataUrl: string;
  filename: string;
}

interface StaffTheme {
  accentBg: string;
  portraitBg: string;
  moodBg: string;
  moodText: string;
}

const STAFF_THEMES: Record<StaffId, StaffTheme> = {
  dick: {
    accentBg: '#fbbf24',
    portraitBg: '#fde68a',
    moodBg: '#dc2626',
    moodText: '#ffffff',
  },
  v: {
    accentBg: '#34d399',
    portraitBg: '#fed7aa',
    moodBg: '#0f766e',
    moodText: '#ffffff',
  },
  scooter: {
    accentBg: '#38bdf8',
    portraitBg: '#bae6fd',
    moodBg: '#7c3aed',
    moodText: '#ffffff',
  },
};

const FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function loadCanvasImage(src: string, timeoutMs = 4500): Promise<HTMLImageElement | null> {
  if (!src || typeof window === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;

    const finish = (result: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);
    img.crossOrigin = 'anonymous';
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = src;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawComicCard(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    r: number;
    fill: string;
    stroke?: string;
    lineWidth?: number;
    shadowOffset?: number;
  },
): void {
  const shadowOffset = opts.shadowOffset ?? 10;
  if (shadowOffset > 0) {
    ctx.fillStyle = '#000000';
    drawRoundedRectPath(
      ctx,
      opts.x + shadowOffset,
      opts.y + shadowOffset,
      opts.w,
      opts.h,
      opts.r,
    );
    ctx.fill();
  }

  ctx.fillStyle = opts.fill;
  drawRoundedRectPath(ctx, opts.x, opts.y, opts.w, opts.h, opts.r);
  ctx.fill();

  ctx.lineWidth = opts.lineWidth ?? 6;
  ctx.strokeStyle = opts.stroke ?? '#000000';
  ctx.stroke();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';

  const pushOversizedWord = (word: string) => {
    let chunk = '';
    for (const ch of word) {
      const candidate = chunk + ch;
      if (ctx.measureText(candidate).width <= maxWidth || !chunk) {
        chunk = candidate;
      } else {
        lines.push(chunk);
        chunk = ch;
      }
    }
    if (chunk) current = chunk;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else if (ctx.measureText(word).width > maxWidth) {
      if (current) lines.push(current);
      current = '';
      pushOversizedWord(word);
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function fitTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  sizes: number[],
  weight: string,
  lineHeightRatio = 1.24,
): { fontSize: number; lineHeight: number; lines: string[] } {
  for (const size of sizes) {
    ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
    const lineHeight = Math.round(size * lineHeightRatio);
    const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
    const lines = wrapTextLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) {
      return { fontSize: size, lineHeight, lines };
    }
  }

  const fallbackSize = sizes[sizes.length - 1] ?? 24;
  ctx.font = `${weight} ${fallbackSize}px ${FONT_FAMILY}`;
  const lineHeight = Math.round(fallbackSize * lineHeightRatio);
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  const rawLines = wrapTextLines(ctx, text, maxWidth);
  if (rawLines.length <= maxLines) {
    return { fontSize: fallbackSize, lineHeight, lines: rawLines };
  }

  const trimmed = rawLines.slice(0, maxLines);
  const last = trimmed[maxLines - 1] ?? '';
  trimmed[maxLines - 1] =
    last.length > 4 ? `${last.slice(0, Math.max(1, last.length - 3))}...` : '...';
  return { fontSize: fallbackSize, lineHeight, lines: trimmed };
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  alignTop = false,
): void {
  const scale = Math.min(boxW / img.width, boxH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = boxX + (boxW - drawW) / 2;
  const drawY = alignTop
    ? boxY + Math.max(4, (boxH - drawH) * 0.16)
    : boxY + (boxH - drawH) / 2;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawBadgePill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  bg: string,
  fg: string,
  fontSize = 20,
): number {
  const text = label.toUpperCase();
  ctx.font = `900 ${fontSize}px ${FONT_FAMILY}`;
  const textW = ctx.measureText(text).width;
  const padX = 18;
  const h = fontSize + 18;
  const w = Math.ceil(textW + padX * 2);

  ctx.fillStyle = bg;
  drawRoundedRectPath(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  return w;
}

export function buildRoastShareCaption(payload: RoastCardPayload): string {
  if (payload.source === 'diagnostics') {
    return `${payload.speakerName} just diagnosed & roasted "${payload.promptText}" at the Hard R Cycles Service Counter. Decode yours free: https://hardrcycles.com/?dept=service`;
  }
  return `${payload.speakerName} dropped some shop floor wisdom at Hard R Cycles. Walk the 3D shop: https://hardrcycles.com/`;
}

export async function renderRoastCardAsset(
  payload: RoastCardPayload,
  aspect: RoastCardAspect = 'square',
): Promise<RenderedRoastCardAsset> {
  const width = 1080;
  const height = aspect === 'story' ? 1920 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas rendering is unavailable.');
  }

  const [logoImg, portraitImg] = await Promise.all([
    loadCanvasImage('/brand/hard-r-cycles-logo.png'),
    loadCanvasImage(payload.portraitSrc),
  ]);

  const theme = STAFF_THEMES[payload.staffId] ?? STAFF_THEMES.dick;

  // 1. Warm comic parchment backdrop + subtle halftone dots
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(24, 24, 27, 0.055)';
  for (let gx = 24; gx < width; gx += 36) {
    for (let gy = 24; gy < height; gy += 36) {
      ctx.beginPath();
      ctx.arc(gx, gy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Heavy outer comic frame
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // 2. Top Shop Banner
  const pad = 48;
  const bannerH = aspect === 'story' ? 154 : 128;
  drawComicCard(ctx, {
    x: pad,
    y: pad,
    w: width - pad * 2,
    h: bannerH,
    r: 22,
    fill: '#18181b',
    shadowOffset: 8,
  });

  if (logoImg) {
    drawContainedImage(ctx, logoImg, pad + 20, pad + 14, 180, bannerH - 28, false);
  } else {
    ctx.fillStyle = '#fbbf24';
    ctx.font = `900 32px ${FONT_FAMILY}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('HARD R CYCLES', pad + 26, pad + bannerH / 2);
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = theme.accentBg;
  ctx.font = `900 ${aspect === 'story' ? 24 : 20}px ${FONT_FAMILY}`;
  ctx.fillText(
    payload.source === 'diagnostics'
      ? 'SERVICE COUNTER DIAGNOSTIC ROAST'
      : 'SHOP FLOOR Q&A ROAST CARD',
    pad + 220,
    pad + (aspect === 'story' ? 62 : 52),
  );

  ctx.fillStyle = '#f4f4f5';
  ctx.font = `800 ${aspect === 'story' ? 30 : 25}px ${FONT_FAMILY}`;
  ctx.fillText(
    `${payload.speakerName.toUpperCase()} • ${payload.speakerRole.toUpperCase()}`,
    pad + 220,
    pad + (aspect === 'story' ? 108 : 92),
  );

  // 3. Prompt / Rider Ticket Strip
  const promptY = pad + bannerH + 28;
  const promptH = aspect === 'story' ? 190 : 148;
  drawComicCard(ctx, {
    x: pad,
    y: promptY,
    w: width - pad * 2,
    h: promptH,
    r: 20,
    fill: '#ffffff',
    shadowOffset: 8,
  });

  ctx.fillStyle = '#b45309';
  ctx.font = `900 20px ${FONT_FAMILY}`;
  ctx.textBaseline = 'top';
  ctx.fillText(payload.promptHeading.toUpperCase(), pad + 24, promptY + 18);

  const promptFitted = fitTextBlock(
    ctx,
    payload.promptText,
    width - pad * 2 - 48,
    promptH - 64,
    [34, 30, 26, 22],
    '800',
    1.22,
  );
  ctx.fillStyle = '#09090b';
  ctx.font = `800 ${promptFitted.fontSize}px ${FONT_FAMILY}`;
  promptFitted.lines.forEach((line, idx) => {
    ctx.fillText(line, pad + 24, promptY + 50 + idx * promptFitted.lineHeight);
  });

  // 4. Footer Strip Coordinates
  const footerH = 98;
  const footerY = height - pad - footerH;

  // 5. Middle Section: Portrait + Comic Speech Bubble
  const midY = promptY + promptH + 30;
  const midH = footerY - midY - 28;

  if (aspect === 'square') {
    const leftW = 356;
    const rightX = pad + leftW + 30;
    const rightW = width - rightX - pad;

    // Portrait card
    drawComicCard(ctx, {
      x: pad,
      y: midY,
      w: leftW,
      h: midH,
      r: 24,
      fill: theme.portraitBg,
      shadowOffset: 10,
    });

    if (portraitImg) {
      ctx.save();
      drawRoundedRectPath(ctx, pad + 8, midY + 8, leftW - 16, midH - 134, 18);
      ctx.clip();
      drawContainedImage(ctx, portraitImg, pad + 10, midY + 10, leftW - 20, midH - 138, true);
      ctx.restore();
    }

    // Speaker nameplate inside bottom of portrait card
    ctx.fillStyle = '#18181b';
    drawRoundedRectPath(ctx, pad + 16, midY + midH - 116, leftW - 32, 98, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    ctx.fillStyle = theme.accentBg;
    ctx.font = `900 30px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';
    ctx.fillText(payload.speakerName.toUpperCase(), pad + 32, midY + midH - 102);

    drawBadgePill(
      ctx,
      pad + 30,
      midY + midH - 60,
      payload.moodLabel.slice(0, 22),
      theme.moodBg,
      theme.moodText,
      17,
    );

    // Speech bubble on right
    drawComicCard(ctx, {
      x: rightX,
      y: midY,
      w: rightW,
      h: midH,
      r: 28,
      fill: '#ffffff',
      shadowOffset: 10,
    });

    // Leftward speech pointer into portrait
    const tipY = midY + 146;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(rightX + 2, tipY - 26);
    ctx.lineTo(rightX - 30, tipY);
    ctx.lineTo(rightX + 2, tipY + 26);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(rightX, tipY - 26);
    ctx.lineTo(rightX - 30, tipY);
    ctx.lineTo(rightX, tipY + 26);
    ctx.stroke();

    // Cover seam line slightly with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rightX - 1, tipY - 22, 8, 44);

    // Tier pill inside bubble header
    let badgeCursorX = rightX + 28;
    const badgeY = midY + 26;
    if (payload.tierBadge) {
      const wUsed = drawBadgePill(
        ctx,
        badgeCursorX,
        badgeY,
        payload.tierBadge,
        theme.accentBg,
        '#000000',
        18,
      );
      badgeCursorX += wUsed + 12;
    }
    drawBadgePill(
      ctx,
      badgeCursorX,
      badgeY,
      payload.source === 'diagnostics' ? 'VIN COUNTER' : 'SHOP FLOOR',
      '#e4e4e7',
      '#18181b',
      18,
    );

    const roastTop = badgeY + 62;
    const roastAvailH = midH - (roastTop - midY) - 62;
    const quoted = `"${payload.roastText.replace(/^["“]+|["”]+$/g, '')}"`;
    const roastFit = fitTextBlock(
      ctx,
      quoted,
      rightW - 56,
      roastAvailH,
      [44, 38, 34, 30, 26],
      '900',
      1.26,
    );

    ctx.fillStyle = '#09090b';
    ctx.font = `900 ${roastFit.fontSize}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';
    roastFit.lines.forEach((line, idx) => {
      ctx.fillText(line, rightX + 28, roastTop + idx * roastFit.lineHeight);
    });

    if (payload.footerNote) {
      ctx.fillStyle = '#52525b';
      ctx.font = `800 18px ${FONT_FAMILY}`;
      ctx.fillText(payload.footerNote, rightX + 28, midY + midH - 40);
    }
  } else {
    // Vertical Story 9:16 (1080x1920): portrait header + huge stacked comic speech bubble
    const portraitCardH = 520;
    drawComicCard(ctx, {
      x: pad,
      y: midY,
      w: width - pad * 2,
      h: portraitCardH,
      r: 26,
      fill: theme.portraitBg,
      shadowOffset: 10,
    });

    if (portraitImg) {
      ctx.save();
      drawRoundedRectPath(ctx, pad + 8, midY + 8, 430, portraitCardH - 16, 20);
      ctx.clip();
      drawContainedImage(ctx, portraitImg, pad + 14, midY + 12, 420, portraitCardH - 24, true);
      ctx.restore();
    }

    const metaX = pad + 458;
    const metaW = width - pad - metaX - 26;
    ctx.fillStyle = '#18181b';
    drawRoundedRectPath(ctx, metaX, midY + 42, metaW, portraitCardH - 84, 22);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    ctx.fillStyle = theme.accentBg;
    ctx.font = `900 48px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';
    ctx.fillText(payload.speakerName.toUpperCase(), metaX + 28, midY + 78);

    ctx.fillStyle = '#e4e4e7';
    ctx.font = `800 24px ${FONT_FAMILY}`;
    ctx.fillText(payload.speakerRole.toUpperCase(), metaX + 28, midY + 142);

    drawBadgePill(
      ctx,
      metaX + 28,
      midY + 206,
      payload.moodLabel.slice(0, 22),
      theme.moodBg,
      theme.moodText,
      22,
    );

    if (payload.tierBadge) {
      drawBadgePill(
        ctx,
        metaX + 28,
        midY + 272,
        payload.tierBadge,
        theme.accentBg,
        '#000000',
        20,
      );
    }

    ctx.fillStyle = '#a1a1aa';
    ctx.font = `800 20px ${FONT_FAMILY}`;
    ctx.fillText('NO FREE ADVICE AFTER DARK', metaX + 28, midY + portraitCardH - 96);

    const bubbleY = midY + portraitCardH + 34;
    const bubbleH = footerY - bubbleY - 28;
    drawComicCard(ctx, {
      x: pad,
      y: bubbleY,
      w: width - pad * 2,
      h: bubbleH,
      r: 28,
      fill: '#ffffff',
      shadowOffset: 10,
    });

    // Upward pointer toward character portrait
    const tipX = pad + 230;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tipX - 30, bubbleY + 2);
    ctx.lineTo(tipX, bubbleY - 30);
    ctx.lineTo(tipX + 30, bubbleY + 2);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(tipX - 30, bubbleY);
    ctx.lineTo(tipX, bubbleY - 30);
    ctx.lineTo(tipX + 30, bubbleY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tipX - 24, bubbleY - 1, 48, 8);

    const quoted = `"${payload.roastText.replace(/^["“]+|["”]+$/g, '')}"`;
    const roastFit = fitTextBlock(
      ctx,
      quoted,
      width - pad * 2 - 64,
      bubbleH - 110,
      [56, 48, 42, 36, 32],
      '900',
      1.26,
    );

    ctx.fillStyle = '#09090b';
    ctx.font = `900 ${roastFit.fontSize}px ${FONT_FAMILY}`;
    roastFit.lines.forEach((line, idx) => {
      ctx.fillText(line, pad + 32, bubbleY + 46 + idx * roastFit.lineHeight);
    });

    if (payload.footerNote) {
      ctx.fillStyle = '#52525b';
      ctx.font = `800 22px ${FONT_FAMILY}`;
      ctx.fillText(payload.footerNote, pad + 32, bubbleY + bubbleH - 48);
    }
  }

  // 6. Bottom Watermark Bar
  drawComicCard(ctx, {
    x: pad,
    y: footerY,
    w: width - pad * 2,
    h: footerH,
    r: 18,
    fill: '#18181b',
    shadowOffset: 8,
  });

  ctx.fillStyle = theme.accentBg;
  ctx.font = `900 28px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('HARDRCYCLES.COM', pad + 26, footerY + footerH / 2);

  ctx.fillStyle = '#f4f4f5';
  ctx.font = `800 22px ${FONT_FAMILY}`;
  const ctaText =
    payload.source === 'diagnostics'
      ? 'FREE NHTSA VIN CHECK • SERVICE COUNTER'
      : '3D MOTORCYCLE SHOP • FLAT RATE PANIC';
  const ctaW = ctx.measureText(ctaText).width;
  ctx.fillText(ctaText, width - pad - 26 - ctaW, footerY + footerH / 2);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((generated) => {
      if (generated) resolve(generated);
      else reject(new Error('Failed to export PNG image.'));
    }, 'image/png');
  });

  const dataUrl = canvas.toDataURL('image/png');
  const slug = payload.speakerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `hard-r-roast-${slug}-${aspect}.png`;

  return { blob, dataUrl, filename };
}

export function downloadRoastCardAsset(
  asset: Pick<RenderedRoastCardAsset, 'blob' | 'filename'>,
): void {
  if (typeof window === 'undefined') return;
  const objectUrl = URL.createObjectURL(asset.blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = asset.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export async function shareRoastCardAsset(
  asset: Pick<RenderedRoastCardAsset, 'blob' | 'filename'>,
  payload: RoastCardPayload,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (typeof window === 'undefined') return 'cancelled';

  const file = new File([asset.blob], asset.filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (
    typeof nav.share === 'function' &&
    typeof nav.canShare === 'function' &&
    nav.canShare({ files: [file] })
  ) {
    try {
      await nav.share({
        title: `${payload.speakerName} Roast Card — Hard R Cycles`,
        text: buildRoastShareCaption(payload),
        files: [file],
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall through cleanly to local PNG download if OS share fails.
    }
  }

  downloadRoastCardAsset(asset);
  return 'downloaded';
}
