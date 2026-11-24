'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import type { BikeSpriteId } from '@/types/game';
import { getProceduralSpriteTexture, type CharacterId } from '@/utils/proceduralSprites';

// Shared 3-tone cel-shading gradient map (#ffffff, #989898, #282828)
const gradientData = new Uint8Array([
  40, 40, 40, 255,
  152, 152, 152, 255,
  255, 255, 255, 255,
]);

export const TOON_GRADIENT_MAP = (() => {
  const tex = new THREE.DataTexture(gradientData, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
})();

interface ManifestFrame {
  frame: string;
  width: number;
  height: number;
}

interface SpriteManifest {
  characters?: Record<string, Record<string, ManifestFrame>>;
  bikes?: Record<string, ManifestFrame>;
  props?: Record<string, ManifestFrame>;
  tools?: Record<string, ManifestFrame>;
}

export interface LoadedSpriteAsset {
  texture: THREE.Texture;
  aspect: number;
}

let manifestPromise: Promise<SpriteManifest | null> | null = null;
const spriteAssetCache = new Map<string, LoadedSpriteAsset>();
const rawTextureCache = new Map<string, THREE.Texture>();
const pendingLoads = new Set<string>();
let concreteFloorTexture: THREE.CanvasTexture | null = null;

function fetchSpriteManifest(): Promise<SpriteManifest | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!manifestPromise) {
    manifestPromise = fetch('/sprites/manifest.json')
      .then((res) => (res.ok ? (res.json() as Promise<SpriteManifest>) : null))
      .catch(() => null);
  }
  return manifestPromise;
}

function loadTextureEntry(key: string, framePath: string, aspectHint: number): void {
  if (spriteAssetCache.has(key) || pendingLoads.has(key)) return;
  pendingLoads.add(key);

  const loader = new THREE.TextureLoader();
  loader.load(
    framePath,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 16;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      const img = texture.image as { width?: number; height?: number } | undefined;
      const computedAspect =
        img?.width && img?.height ? img.width / img.height : aspectHint;
      spriteAssetCache.set(key, { texture, aspect: computedAspect });
      pendingLoads.delete(key);
    },
    undefined,
    () => {
      pendingLoads.delete(key);
    },
  );
}

export function preloadAllManifestSprites(): void {
  void fetchSpriteManifest().then((manifest) => {
    if (!manifest) return;
    if (manifest.characters) {
      for (const [charId, poses] of Object.entries(manifest.characters)) {
        for (const [poseName, entry] of Object.entries(poses)) {
          const aspect = entry.height > 0 ? entry.width / entry.height : 0.7;
          loadTextureEntry(`characters:${charId}:${poseName}`, entry.frame, aspect);
        }
      }
    }
    if (manifest.bikes) {
      for (const [bikeId, entry] of Object.entries(manifest.bikes)) {
        const aspect = entry.height > 0 ? entry.width / entry.height : 1.65;
        loadTextureEntry(`bikes:${bikeId}`, entry.frame, aspect);
      }
    }
    if (manifest.props) {
      for (const [propId, entry] of Object.entries(manifest.props)) {
        const aspect = entry.height > 0 ? entry.width / entry.height : 1;
        loadTextureEntry(`props:${propId}`, entry.frame, aspect);
      }
    }
    if (manifest.tools) {
      for (const [toolId, entry] of Object.entries(manifest.tools)) {
        const aspect = entry.height > 0 ? entry.width / entry.height : 1;
        loadTextureEntry(`tools:${toolId}`, entry.frame, aspect);
      }
    }
  });
}

export function useCharacterSpriteTexture(
  character: CharacterId,
  pose: string,
): LoadedSpriteAsset {
  const key = `characters:${character}:${pose}`;
  const [, setTick] = useState(0);

  useEffect(() => {
    preloadAllManifestSprites();
    let active = true;

    if (spriteAssetCache.has(key)) {
      return;
    }

    void fetchSpriteManifest().then((manifest) => {
      if (!active) return;
      const entry = manifest?.characters?.[character]?.[pose];
      if (!entry) return;

      const aspectHint = entry.height > 0 ? entry.width / entry.height : 0.7;
      if (spriteAssetCache.has(key)) {
        setTick((t) => t + 1);
        return;
      }

      const loader = new THREE.TextureLoader();
      loader.load(
        entry.frame,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 16;
          texture.needsUpdate = true;
          const img = texture.image as { width?: number; height?: number } | undefined;
          const aspect = img?.width && img?.height ? img.width / img.height : aspectHint;
          spriteAssetCache.set(key, { texture, aspect });
          if (active) setTick((t) => t + 1);
        },
        undefined,
        () => {
          // Keep procedural fallback if file fails
        },
      );
    });

    return () => {
      active = false;
    };
  }, [character, pose, key]);

  const cached = spriteAssetCache.get(key);
  if (cached) return cached;

  return {
    texture: getProceduralSpriteTexture(character, pose),
    aspect: 0.55,
  };
}

type ManifestCategory = 'bikes' | 'props' | 'tools';

function useManifestSpriteAsset(
  category: ManifestCategory,
  itemId: string,
  fallbackUrl: string,
  defaultAspect: number,
): LoadedSpriteAsset | null {
  const key = `${category}:${itemId}`;
  const [, setTick] = useState(0);

  useEffect(() => {
    preloadAllManifestSprites();
    let active = true;

    if (spriteAssetCache.has(key)) {
      return;
    }

    void fetchSpriteManifest().then((manifest) => {
      if (!active) return;
      const entry = manifest?.[category]?.[itemId];
      const frameUrl = entry?.frame ?? fallbackUrl;
      const aspectHint =
        entry && entry.height > 0 ? entry.width / entry.height : defaultAspect;

      if (spriteAssetCache.has(key)) {
        if (active) setTick((t) => t + 1);
        return;
      }

      const loader = new THREE.TextureLoader();
      loader.load(
        frameUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 16;
          texture.needsUpdate = true;
          const img = texture.image as { width?: number; height?: number } | undefined;
          const aspect = img?.width && img?.height ? img.width / img.height : aspectHint;
          spriteAssetCache.set(key, { texture, aspect });
          if (active) setTick((t) => t + 1);
        },
        undefined,
        () => {
          // Allow graceful fallback if sprite asset fails to load
        },
      );
    });

    return () => {
      active = false;
    };
  }, [category, itemId, fallbackUrl, defaultAspect, key]);

  return spriteAssetCache.get(key) ?? null;
}

export function useBikeSpriteTexture(bikeId: BikeSpriteId): LoadedSpriteAsset | null {
  return useManifestSpriteAsset('bikes', bikeId, `/sprites/bikes/${bikeId}.png`, 1.65);
}

export function usePropSpriteTexture(propId: string): LoadedSpriteAsset | null {
  return useManifestSpriteAsset('props', propId, `/sprites/props/${propId}.png`, 1.2);
}

export function useToolSpriteTexture(toolId: string): LoadedSpriteAsset | null {
  return useManifestSpriteAsset('tools', toolId, `/sprites/props/tools/${toolId}.png`, 0.9);
}

/**
 * Generates and caches a comic-inked cracked & oil-stained concrete bay floor texture
 * with soft feathered outer alpha so the foreground blends seamlessly into shop-stage-wide.
 */
export function getConcreteFloorTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (concreteFloorTexture) return concreteFloorTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  // Soft concrete bay slab base gradient matching HardRToons grey-taupe shop floor
  const bg = ctx.createRadialGradient(
    size * 0.5,
    size * 0.54,
    size * 0.14,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  bg.addColorStop(0, 'rgba(136, 130, 121, 0.88)');
  bg.addColorStop(0.66, 'rgba(124, 118, 109, 0.65)');
  bg.addColorStop(0.92, 'rgba(116, 110, 102, 0.18)');
  bg.addColorStop(1, 'rgba(116, 110, 102, 0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Deterministic pseudo-random grit speckles & grease splotches
  let seed = 4219;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 650; i++) {
    const x = nextRand() * size;
    const y = nextRand() * size;
    const dx = (x - size * 0.5) / (size * 0.48);
    const dy = (y - size * 0.5) / (size * 0.48);
    if (dx * dx + dy * dy > 0.85) continue;
    const r = 1 + nextRand() * 2.5;
    ctx.fillStyle = nextRand() > 0.45 ? 'rgba(34, 30, 26, 0.2)' : 'rgba(214, 206, 192, 0.16)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Oil drips & garage stains under/around the central lift zone
  const stains = [
    [0.44, 0.56, 34, 18, 0.28],
    [0.57, 0.61, 26, 14, 0.25],
    [0.32, 0.52, 22, 12, 0.2],
    [0.64, 0.46, 20, 11, 0.18],
  ];
  for (const [fx, fy, rx, ry, alpha] of stains) {
    ctx.fillStyle = `rgba(38, 30, 22, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(size * fx, size * fy, rx, ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hand-inked floor cracks
  ctx.strokeStyle = 'rgba(24, 21, 18, 0.52)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const cracks = [
    [
      [110, 290],
      [148, 305],
      [172, 296],
      [212, 328],
    ],
    [
      [310, 175],
      [338, 202],
      [372, 215],
      [402, 248],
    ],
    [
      [245, 368],
      [276, 392],
      [292, 422],
    ],
  ];
  for (const crack of cracks) {
    ctx.beginPath();
    crack.forEach(([cx, cy], idx) => {
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
  }

  // Worn painted yellow lift-bay boundary corner lines
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.48)';
  ctx.lineWidth = 5;
  ctx.setLineDash([28, 12]);
  ctx.strokeRect(size * 0.22, size * 0.28, size * 0.56, size * 0.44);
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  concreteFloorTexture = tex;
  return tex;
}

export function useShopBackgroundTexture(url: string): THREE.Texture | null {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (rawTextureCache.has(url)) return;
    let active = true;

    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        rawTextureCache.set(url, texture);
        if (active) setTick((t) => t + 1);
      },
      undefined,
      () => {},
    );

    return () => {
      active = false;
    };
  }, [url]);

  return rawTextureCache.get(url) ?? null;
}
