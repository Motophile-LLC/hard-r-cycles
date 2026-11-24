'use client';

import {
  ChevronLeft,
  ChevronRight,
  Compass,
  LayoutGrid,
  RotateCcw,
  Settings,
  UserCheck,
  UserCircle2,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { pickNextAmbientCustomer } from '@/data/ambientCustomers';
import { FALLBACK_CATALOG } from '@/data/fallbackCatalog';
import { getSupabaseBrowserAuthClient } from '@/lib/supabaseClient';
import { useShopStore } from '@/store/useShopStore';
import type { ShopProduct, UserProfile } from '@/types/shop';
import { withSpriteVersion } from '@/utils/spriteVersion';

export function ShopFloorHUD() {
  const hasHydrated = useShopStore((s) => s.hasHydrated);
  const viewMode = useShopStore((s) => s.viewMode);
  const isAgeVerified = useShopStore((s) => s.isAgeVerified);
  const products = useShopStore((s) => s.products);
  const onlineTechCount = useShopStore((s) => s.onlineTechCount);
  const cameraFocus = useShopStore((s) => s.cameraFocus);
  const cameraYawOffset = useShopStore((s) => s.cameraYawOffset);
  const cameraZoomDelta = useShopStore((s) => s.cameraZoomDelta);
  const cart = useShopStore((s) => s.cart);
  const sfxEnabled = useShopStore((s) => s.sfxEnabled);
  const authAccessToken = useShopStore((s) => s.authAccessToken);
  const userProfile = useShopStore((s) => s.userProfile);
  const isAdminUser = useShopStore((s) => s.isAdminUser);

  const floorTickRef = useRef(0);
  const lastCustomerIdRef = useRef<string | undefined>(undefined);

  // Sync Supabase Google/Apple SSO session + rider profile + unlocked promo rewards
  useEffect(() => {
    const authClient = getSupabaseBrowserAuthClient();
    if (!authClient) return;
    let active = true;

    const syncSession = async (token: string) => {
      if (!token) {
        if (active) useShopStore.getState().setAuthState('', null, false);
        return;
      }
      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;
        if (res.ok) {
          const json = (await res.json()) as {
            profile?: UserProfile;
            isAdmin?: boolean;
            rewards?: Array<{
              id: string;
              repair_order_id: string;
              promo_code: string;
              discount_percent: number;
              redeemed: boolean;
              created_at: string;
            }>;
          };
          const store = useShopStore.getState();
          store.setAuthState(token, json.profile ?? null, Boolean(json.isAdmin));
          for (const rw of json.rewards ?? []) {
            if (!rw.redeemed) {
              store.addUnlockedReward({
                id: rw.id,
                repairOrderId: rw.repair_order_id,
                promoCode: rw.promo_code,
                discountPercent: rw.discount_percent,
                tierLabel: `${rw.discount_percent}% OFF Shift Reward`,
                redeemed: false,
                createdAt: rw.created_at,
              });
            }
          }
        } else {
          useShopStore.getState().setAuthState(token, null, false);
        }
      } catch {
        if (active) {
          useShopStore.getState().setAuthState(token, null, false);
        }
      }
    };

    void authClient.auth.getSession().then(({ data }) => {
      void syncSession(data.session?.access_token ?? '');
    });

    const { data: sub } = authClient.auth.onAuthStateChange((_event, session) => {
      void syncSession(session?.access_token ?? '');
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load live Supabase catalog (with automatic fallback)
  useEffect(() => {
    let active = true;
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { source?: 'supabase' | 'local'; products?: ShopProduct[] } | null) => {
        if (!active) return;
        if (data?.products && data.products.length > 0) {
          useShopStore.getState().setProducts(data.products, data.source ?? 'local');
        } else {
          useShopStore.getState().setProducts(FALLBACK_CATALOG, 'local');
        }
      })
      .catch(() => {
        if (active) {
          useShopStore.getState().setProducts(FALLBACK_CATALOG, 'local');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // 30-second loitering banter + ambient customer chaos scheduler
  useEffect(() => {
    if (viewMode !== 'FLOOR' || !isAgeVerified) return;

    const resetIdle = () => useShopStore.getState().resetIdleSeconds();
    window.addEventListener('pointerdown', resetIdle);
    window.addEventListener('keydown', resetIdle);

    let b2Timeout: number | undefined;
    let b3Timeout: number | undefined;

    const interval = window.setInterval(() => {
      const store = useShopStore.getState();
      if (store.openDrawer || store.activeDialogue) return;

      store.incrementIdleSeconds();
      const nextIdle = store.idleSeconds + 1;

      if (nextIdle === 30) {
        store.pushOverheadBark(
          'dick',
          "Hey! Floor space ain't free—buy a shirt or get on a lift!",
          5000,
        );
        b2Timeout = window.setTimeout(() => {
          useShopStore
            .getState()
            .pushOverheadBark(
              'v',
              'Ignore him, hon—he skipped lunch. Check the racks over here.',
              5000,
            );
        }, 2100);
        b3Timeout = window.setTimeout(() => {
          useShopStore
            .getState()
            .pushOverheadBark('scooter', 'Wait... we get lunch?!', 4200);
        }, 4200);
      }

      // Spawn a visiting customer gag ~8s after entering, then every 30s when clear
      floorTickRef.current += 1;
      if (
        !store.activeCustomer &&
        floorTickRef.current % 30 === 8
      ) {
        const nextCustomer = pickNextAmbientCustomer(lastCustomerIdRef.current);
        lastCustomerIdRef.current = nextCustomer.id;
        store.spawnAmbientCustomer(nextCustomer, 18000);
      }
    }, 1000);

    return () => {
      window.removeEventListener('pointerdown', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.clearInterval(interval);
      if (b2Timeout) window.clearTimeout(b2Timeout);
      if (b3Timeout) window.clearTimeout(b3Timeout);
    };
  }, [viewMode, isAgeVerified]);

  if (viewMode !== 'FLOOR') return null;

  const activeCount = products.filter((p) => p.active).length || 19;
  const displayedTechCount = Math.max(3, onlineTechCount + 3);
  const cartCount = hasHydrated
    ? cart.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const cameraAdjusted =
    Math.abs(cameraYawOffset) > 0.02 || Math.abs(cameraZoomDelta) > 0.05;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top Dealership Header */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border-3 border-black bg-zinc-900/95 px-2.5 py-1.5 shadow-[4px_4px_0px_#000]">
          <div className="relative h-8 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-700 bg-black">
            <Image
              src="/brand/hard-r-cycles-logo.svg"
              alt="Hard R Cycles"
              fill
              className="object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-black uppercase tracking-wider text-white">
              Hard R Cycles
            </p>
            <p className="text-[10px] font-bold text-amber-300">
              Drag to orbit • Click Staff, Racks, Counter or Lifts
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-1.5 rounded-xl border-3 border-black bg-emerald-300 px-2.5 py-1.5 text-[11px] font-black uppercase text-black shadow-[3px_3px_0px_#000] sm:flex">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-700" />
            <span>{displayedTechCount} Techs On Clock</span>
          </div>

          {cameraFocus !== 'OVERVIEW' ? (
            <button
              type="button"
              onClick={() => useShopStore.getState().setCameraFocus('OVERVIEW')}
              className="flex cursor-pointer items-center gap-1 rounded-xl border-3 border-black bg-amber-300 px-2.5 py-1.5 text-[11px] font-black uppercase text-black shadow-[3px_3px_0px_#000] hover:bg-amber-200"
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Overview
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => useShopStore.getState().setOpenDrawer('CART')}
            aria-label={`Open shopping cart with ${cartCount} items`}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border-3 border-black bg-amber-400 px-2.5 py-1.5 text-[11px] font-black uppercase text-black shadow-[3px_3px_0px_#000] hover:bg-amber-300"
          >
            <Image
              src={withSpriteVersion('/sprites/ui/icon-cart.png')}
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span>Cart</span>
            <span className="rounded-md bg-black px-1.5 py-0.5 text-[10px] text-amber-300">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => useShopStore.getState().toggleSfx()}
            aria-label={hasHydrated && !sfxEnabled ? 'Unmute shop audio' : 'Mute shop audio'}
            title={hasHydrated && !sfxEnabled ? 'Unmute shop audio' : 'Mute shop audio'}
            className="flex cursor-pointer items-center justify-center rounded-xl border-3 border-black bg-white p-2 text-black shadow-[3px_3px_0px_#000] hover:bg-zinc-200"
          >
            {hasHydrated && !sfxEnabled ? (
              <VolumeX className="h-4 w-4 text-red-600" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => useShopStore.getState().setAccountModalOpen(true)}
            aria-label={authAccessToken ? 'Open Rider Account & Garage' : 'Sign in with Google or Apple'}
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl border-3 border-black px-2.5 py-1.5 text-[11px] font-black uppercase text-black shadow-[3px_3px_0px_#000] ${
              authAccessToken
                ? 'bg-emerald-300 hover:bg-emerald-200'
                : 'bg-white hover:bg-amber-100'
            }`}
          >
            {authAccessToken ? (
              <>
                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="max-w-[96px] truncate">
                  {userProfile?.mechanic_handle || userProfile?.display_name || 'Garage'}
                </span>
              </>
            ) : (
              <>
                <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign In</span>
              </>
            )}
          </button>

          <Link
            href="/admin"
            title={isAdminUser ? 'Open Admin Console' : 'Admin Console'}
            aria-label="Open Catalog & Fulfillment Admin"
            className={`flex items-center justify-center gap-1 rounded-xl border-3 border-black p-2 text-black shadow-[3px_3px_0px_#000] ${
              isAdminUser
                ? 'bg-emerald-300 px-2.5 text-[11px] font-black uppercase hover:bg-emerald-200'
                : 'bg-white hover:bg-zinc-200'
            }`}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            {isAdminUser ? <span className="hidden md:inline">Admin</span> : null}
          </Link>
        </div>
      </header>

      {/* Bottom Camera Controls + Quick-Nav HUD */}
      <div className="flex flex-col items-center gap-2">
        <div
          aria-label="Floor camera controls"
          className="pointer-events-auto inline-flex items-center gap-1 rounded-xl border-3 border-black bg-zinc-900/90 px-2 py-1 text-white shadow-[4px_4px_0px_#000]"
        >
          <button
            type="button"
            onClick={() => useShopStore.getState().nudgeCameraYaw(-0.18)}
            aria-label="Orbit camera left"
            title="Orbit Left"
            className="cursor-pointer rounded-lg p-1.5 hover:bg-zinc-700"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => useShopStore.getState().nudgeCameraZoom(-0.9)}
            aria-label="Zoom camera in"
            title="Zoom In"
            className="cursor-pointer rounded-lg p-1.5 hover:bg-zinc-700"
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => useShopStore.getState().resetCameraOffsets()}
            aria-label="Reset camera orbit and zoom"
            title="Reset View"
            className={`cursor-pointer rounded-lg px-2 py-1 text-[10px] font-black uppercase ${
              cameraAdjusted
                ? 'bg-amber-300 text-black hover:bg-amber-200'
                : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <RotateCcw className="inline h-3 w-3 mr-1" aria-hidden="true" />
            Cam
          </button>
          <button
            type="button"
            onClick={() => useShopStore.getState().nudgeCameraZoom(0.9)}
            aria-label="Zoom camera out"
            title="Zoom Out"
            className="cursor-pointer rounded-lg p-1.5 hover:bg-zinc-700"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => useShopStore.getState().nudgeCameraYaw(0.18)}
            aria-label="Orbit camera right"
            title="Orbit Right"
            className="cursor-pointer rounded-lg p-1.5 hover:bg-zinc-700"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Shop floor navigation"
          className="pointer-events-auto mx-auto grid w-full max-w-2xl grid-cols-3 gap-1.5 rounded-2xl border-4 border-black bg-zinc-900/95 p-1.5 shadow-[6px_6px_0px_#000] sm:flex sm:w-auto sm:items-center sm:justify-center sm:gap-2"
        >
          <button
            type="button"
            onClick={() => useShopStore.getState().setCameraFocus('OVERVIEW')}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-black px-2.5 py-2 text-[11px] font-black uppercase transition-colors ${
              cameraFocus === 'OVERVIEW'
                ? 'bg-amber-300 text-black'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Floor</span>
          </button>

          <button
            type="button"
            onClick={() => useShopStore.getState().setOpenDrawer('APPAREL', 'ALL')}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-black bg-zinc-800 px-2.5 py-2 text-[11px] font-black uppercase text-white hover:bg-amber-300 hover:text-black"
          >
            <Image
              src={withSpriteVersion('/sprites/ui/icon-apparel.png')}
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span>Apparel ({activeCount})</span>
          </button>

          <button
            type="button"
            onClick={() => useShopStore.getState().setOpenDrawer('PARTS')}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-black bg-zinc-800 px-2.5 py-2 text-[11px] font-black uppercase text-white hover:bg-amber-300 hover:text-black"
          >
            <Image
              src={withSpriteVersion('/sprites/ui/icon-parts.png')}
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span>Parts</span>
          </button>

          <button
            type="button"
            onClick={() => useShopStore.getState().setOpenDrawer('SERVICE_COUNTER')}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-black bg-zinc-800 px-2.5 py-2 text-[11px] font-black uppercase text-white hover:bg-amber-300 hover:text-black"
          >
            <Image
              src={withSpriteVersion('/sprites/ui/icon-service.png')}
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span>Service</span>
          </button>

          <button
            type="button"
            onClick={() => useShopStore.getState().enterGameBay(3)}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-black bg-emerald-400 px-2.5 py-2 text-[11px] font-black uppercase text-black hover:bg-emerald-300"
          >
            <Image
              src={withSpriteVersion('/sprites/ui/icon-bays.png')}
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span>Play Bays</span>
          </button>

          <button
            type="button"
            onClick={() => useShopStore.getState().setOpenDrawer('QUICK_SHOP', 'ALL')}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-black bg-white px-2.5 py-2 text-[11px] font-black uppercase text-black hover:bg-amber-200"
          >
            <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Quick Shop</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
