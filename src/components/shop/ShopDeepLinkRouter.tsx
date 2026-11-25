'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { trackShopEvent } from '@/lib/analytics';
import { useShopStore } from '@/store/useShopStore';
import type { RackFilter, ShopProduct, StaffId } from '@/types/shop';

const VALID_RACK_FILTERS: readonly RackFilter[] = [
  'ALL',
  'rack_1_humor',
  'rack_2_definition',
  'wall_braap',
  'hard_r_originals',
  'motophile_partner',
  'episode_drops',
  'vip_secret_stash',
];

const REFERRAL_BARKS: Record<StaffId, string> = {
  scooter: 'Whoa, you clicked my link! Check this out!',
  v: 'Saw my post? Good taste. Right this way.',
  dick: "Another one from the internet. Don't waste my time.",
};

function normalizeParam(value: string | null, maxLen = 64): string {
  return (value ?? '').trim().toLowerCase().slice(0, maxLen);
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findMatchingDropProduct(
  drop: string,
  products: ShopProduct[],
): ShopProduct | null {
  const active = products.filter((p) => p.active);
  const exact = active.find((p) => p.handle.toLowerCase() === drop);
  if (exact) return exact;

  return (
    active.find((p) => {
      const handle = p.handle.toLowerCase();
      const titleSlug = toSlug(p.title);
      return (
        handle.includes(drop) ||
        titleSlug === drop ||
        titleSlug.includes(drop) ||
        p.tags.some((tag) => {
          const tagSlug = toSlug(tag);
          return tagSlug === drop || tag.toLowerCase().includes(drop);
        })
      );
    }) ?? null
  );
}

function resolveValidRackFilter(rawRack: string): RackFilter | null {
  if (!rawRack) return null;
  return (
    VALID_RACK_FILTERS.find((candidate) => candidate.toLowerCase() === rawRack) ??
    null
  );
}

export function ShopDeepLinkRouter() {
  const searchParams = useSearchParams();
  const isAgeVerified = useShopStore((s) => s.isAgeVerified);
  const products = useShopStore((s) => s.products);
  const productsSource = useShopStore((s) => s.productsSource);
  const authAccessToken = useShopStore((s) => s.authAccessToken);

  const handledRef = useRef(false);
  const barkTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (barkTimerRef.current !== null) {
        window.clearTimeout(barkTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (handledRef.current) return;

    const dept = normalizeParam(searchParams.get('dept'));
    const dropRaw = (searchParams.get('drop') ?? '').trim().slice(0, 80);
    const drop = dropRaw.toLowerCase();
    const rack = normalizeParam(searchParams.get('rack'));
    const bayRaw = normalizeParam(searchParams.get('bay'), 16);
    const ref = normalizeParam(searchParams.get('ref'));

    if (!dept && !drop && !rack && !ref) {
      return;
    }

    if (!isAgeVerified) {
      return;
    }

    if (drop && drop !== 'latest' && productsSource === 'loading') {
      return;
    }

    handledRef.current = true;
    const store = useShopStore.getState();

    trackShopEvent(
      'deep_link_landed',
      {
        dept: dept || null,
        drop: drop || null,
        rack: rack || null,
        bay: bayRaw || null,
        ref: ref || null,
      },
      authAccessToken,
    );

    if (ref) {
      store.setReferralSource(ref);
      if (ref === 'scooter' || ref === 'v' || ref === 'dick') {
        const staffId: StaffId = ref;
        barkTimerRef.current = window.setTimeout(() => {
          useShopStore
            .getState()
            .pushOverheadBark(staffId, REFERRAL_BARKS[staffId], 6000);
        }, 450);
      }
    }

    const validRack = resolveValidRackFilter(rack);

    if (drop) {
      if (drop === 'latest') {
        const hasOriginals = products.some(
          (p) => p.active && p.rack_slot === 'hard_r_originals',
        );
        store.setHighlightedDrop(null, null);
        store.setOpenDrawer('APPAREL', hasOriginals ? 'hard_r_originals' : 'ALL');
        return;
      }

      const matched = findMatchingDropProduct(drop, products);
      if (matched) {
        store.setHighlightedDrop(matched.handle, null);
        const targetRack = resolveValidRackFilter(matched.rack_slot) ?? 'ALL';
        store.setOpenDrawer(
          matched.department === 'PARTS' ? 'PARTS' : 'APPAREL',
          targetRack,
        );
      } else {
        store.setHighlightedDrop(null, dropRaw);
        store.setOpenDrawer('APPAREL', 'ALL');
      }
      return;
    }

    if (dept) {
      switch (dept) {
        case 'apparel':
        case 'merch':
        case 'racks':
          store.setOpenDrawer('APPAREL', validRack ?? 'ALL');
          break;
        case 'parts':
        case 'originals':
          store.setOpenDrawer('PARTS', 'ALL');
          break;
        case 'service':
        case 'counter':
        case 'diagnostics':
        case 'vin':
          store.setOpenDrawer('SERVICE_COUNTER');
          break;
        case 'arcade':
        case 'bays':
        case 'game':
        case 'play': {
          const parsedBay = Number.parseInt(bayRaw, 10);
          const bayIndex: 1 | 2 | 3 =
            parsedBay === 2 || parsedBay === 3 ? parsedBay : 1;
          store.enterGameBay(bayIndex);
          break;
        }
        case 'flatratemaster':
        case 'frm':
        case 'poster':
          store.setOpenDrawer('FLAT_RATE_MASTER');
          break;
        case 'cart':
        case 'bag':
          store.setOpenDrawer('CART');
          break;
        case 'quickshop':
        case 'shop':
          store.setOpenDrawer('QUICK_SHOP', 'ALL');
          break;
        case 'vip':
        case 'secret-stash':
          store.setOpenDrawer('APPAREL', 'vip_secret_stash');
          break;
        case 'atlas':
        case 'guestbook':
          store.setOpenDrawer('ATLAS');
          break;
        case 'selfies':
        case 'selfie':
          store.setCameraFocus('APPAREL');
          store.pushOverheadBark(
            'v',
            'Selfie Contest Station drops in Wave 4 — check the racks first.',
            6500,
          );
          break;
        case 'skit':
        case 'madlibs':
          store.setCameraFocus('SERVICE');
          store.pushOverheadBark(
            'dick',
            'Weekly Mad-Libs Skit Board launches in Wave 5. Buy a shirt while you wait.',
            6500,
          );
          break;
        default:
          break;
      }
      return;
    }

    if (validRack) {
      store.setOpenDrawer('APPAREL', validRack);
    }
  }, [searchParams, isAgeVerified, products, productsSource, authAccessToken]);

  return null;
}
