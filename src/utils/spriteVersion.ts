export const SPRITE_ASSET_VERSION = '2026-11-24-v3';

export function withSpriteVersion(url: string): string {
  if (!url || /[?&]v=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${SPRITE_ASSET_VERSION}`;
}
