import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ActiveAmbientCustomer,
  AmbientCustomerEvent,
  CameraFocusZone,
  CartItem,
  LiveBayOccupant,
  OverheadBark,
  RackFilter,
  ShopDrawerKind,
  ShopProduct,
  ShopViewMode,
  StaffDialogueState,
  StaffId,
  UnlockedReward,
  UserProfile,
} from '@/types/shop';
import { shopAudio } from '@/utils/audio';

const INITIAL_BAYS: LiveBayOccupant[] = [
  {
    bayIndex: 1,
    isRealPlayer: false,
    playerName: 'NPC: Big Dale',
    bikeSprite: 'track-bagger',
    activity: 'WRENCHING',
    statusText: 'Track Bagger • Torque Spec',
    updatedAt: 0,
  },
  {
    bayIndex: 2,
    isRealPlayer: false,
    playerName: 'NPC: 10mm Johnny',
    bikeSprite: 'bigwheel-bagger',
    activity: 'SPARKS',
    statusText: 'Big-Wheel • Wiring Harness',
    updatedAt: 0,
  },
  {
    bayIndex: 3,
    isRealPlayer: false,
    playerName: "NPC: Wrenchin' Walt",
    bikeSprite: 'club-dyna',
    activity: 'CHAOS_SMOKE',
    statusText: 'Club Dyna • Exhaust Stud',
    updatedAt: 0,
  },
];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export interface ShopStore {
  hasHydrated: boolean;
  isAgeVerified: boolean;
  viewMode: ShopViewMode;
  activeBayIndex: 1 | 2 | 3;
  cameraFocus: CameraFocusZone;
  cameraYawOffset: number;
  cameraZoomDelta: number;
  openDrawer: ShopDrawerKind;
  activeRackFilter: RackFilter;
  products: ShopProduct[];
  productsSource: 'loading' | 'supabase' | 'local';
  activeDialogue: StaffDialogueState | null;
  overheadBarks: Partial<Record<StaffId, OverheadBark>>;
  liveBays: LiveBayOccupant[];
  onlineTechCount: number;
  idleSeconds: number;
  activeCustomer: ActiveAmbientCustomer | null;

  cart: CartItem[];
  appliedPromoCode: string;
  unlockedRewards: UnlockedReward[];
  sfxEnabled: boolean;

  accountModalOpen: boolean;
  authAccessToken: string;
  userProfile: UserProfile | null;
  isAdminUser: boolean;

  setHasHydrated: (hydrated: boolean) => void;
  setAccountModalOpen: (open: boolean) => void;
  setAuthState: (token: string, profile: UserProfile | null, isAdmin: boolean) => void;
  setAgeVerified: (verified: boolean) => void;
  setCameraFocus: (zone: CameraFocusZone) => void;
  nudgeCameraYaw: (delta: number) => void;
  nudgeCameraZoom: (delta: number) => void;
  resetCameraOffsets: () => void;
  setOpenDrawer: (drawer: ShopDrawerKind, rackFilter?: RackFilter) => void;
  setActiveRackFilter: (filter: RackFilter) => void;
  setProducts: (products: ShopProduct[], source: 'supabase' | 'local') => void;
  enterGameBay: (bayIndex: 1 | 2 | 3) => void;
  exitBayToFloor: () => void;
  setActiveDialogue: (dialogue: StaffDialogueState | null) => void;
  pushOverheadBark: (staffId: StaffId, text: string, ttlMs?: number) => void;
  clearOverheadBark: (staffId: StaffId) => void;
  setLiveBays: (bays: LiveBayOccupant[], onlineCount: number) => void;
  incrementIdleSeconds: () => void;
  resetIdleSeconds: () => void;
  spawnAmbientCustomer: (event: AmbientCustomerEvent, durationMs?: number) => void;
  dismissAmbientCustomer: () => void;

  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  updateCartQuantity: (handle: string, size: string, color: string, quantity: number) => void;
  removeFromCart: (handle: string, size: string, color: string) => void;
  clearCart: () => void;
  setAppliedPromoCode: (code: string) => void;
  addUnlockedReward: (reward: UnlockedReward) => void;
  toggleSfx: () => void;
}

export const useShopStore = create<ShopStore>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      isAgeVerified: false,
      viewMode: 'FLOOR',
      activeBayIndex: 1,
      cameraFocus: 'OVERVIEW',
      cameraYawOffset: 0,
      cameraZoomDelta: 0,
      openDrawer: null,
      activeRackFilter: 'ALL',
      products: [],
      productsSource: 'loading',
      activeDialogue: null,
      overheadBarks: {},
      liveBays: INITIAL_BAYS,
      onlineTechCount: 0,
      idleSeconds: 0,
      activeCustomer: null,

      cart: [],
      appliedPromoCode: '',
      unlockedRewards: [],
      sfxEnabled: true,

      accountModalOpen: false,
      authAccessToken: '',
      userProfile: null,
      isAdminUser: false,

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      setAccountModalOpen: (open) => set({ accountModalOpen: open, idleSeconds: 0 }),

      setAuthState: (token, profile, isAdmin) =>
        set({
          authAccessToken: token,
          userProfile: profile,
          isAdminUser: isAdmin,
        }),

      setAgeVerified: (verified) => {
        if (verified && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('hardr_18plus_verified_v1', '1');
          } catch {
            // Ignore storage restrictions
          }
        }
        set({
          isAgeVerified: verified,
          overheadBarks: verified
            ? {
                v: {
                  staffId: 'v',
                  text: 'Welcome in! Check the racks—ignore Dick.',
                  expiresAt: Date.now() + 5500,
                },
                dick: {
                  staffId: 'dick',
                  text: "Don't touch anything expensive.",
                  expiresAt: Date.now() + 5500,
                },
              }
            : {},
        });
      },

      setCameraFocus: (zone) =>
        set({
          cameraFocus: zone,
          cameraYawOffset: 0,
          cameraZoomDelta: 0,
          idleSeconds: 0,
        }),

      nudgeCameraYaw: (delta) =>
        set((state) => ({
          cameraYawOffset: clamp(state.cameraYawOffset + delta, -0.65, 0.65),
          idleSeconds: 0,
        })),

      nudgeCameraZoom: (delta) =>
        set((state) => ({
          cameraZoomDelta: clamp(state.cameraZoomDelta + delta, -3.5, 3.5),
          idleSeconds: 0,
        })),

      resetCameraOffsets: () =>
        set({
          cameraYawOffset: 0,
          cameraZoomDelta: 0,
          idleSeconds: 0,
        }),

      setOpenDrawer: (drawer, rackFilter) =>
        set((state) => {
          const resetToOverview = drawer === null && !state.activeDialogue;
          return {
            openDrawer: drawer,
            activeRackFilter: rackFilter ?? state.activeRackFilter,
            cameraFocus:
              drawer === 'APPAREL'
                ? 'APPAREL'
                : drawer === 'PARTS'
                  ? 'PARTS'
                  : drawer === 'SERVICE_COUNTER'
                    ? 'SERVICE'
                    : resetToOverview
                      ? 'OVERVIEW'
                      : state.cameraFocus,
            cameraYawOffset: resetToOverview ? 0 : state.cameraYawOffset,
            cameraZoomDelta: resetToOverview ? 0 : state.cameraZoomDelta,
            idleSeconds: 0,
          };
        }),

      setActiveRackFilter: (filter) => set({ activeRackFilter: filter, idleSeconds: 0 }),

      setProducts: (products, source) => set({ products, productsSource: source }),

      enterGameBay: (bayIndex) =>
        set({
          viewMode: 'GAME_BAY',
          activeBayIndex: bayIndex,
          openDrawer: null,
          activeDialogue: null,
          activeCustomer: null,
          cameraFocus: 'BAYS',
          cameraYawOffset: 0,
          cameraZoomDelta: 0,
          idleSeconds: 0,
        }),

      exitBayToFloor: () => {
        shopAudio.stopShopRadio();
        set({
          viewMode: 'FLOOR',
          cameraFocus: 'OVERVIEW',
          cameraYawOffset: 0,
          cameraZoomDelta: 0,
          idleSeconds: 0,
        });
      },

      setActiveDialogue: (dialogue) =>
        set({
          activeDialogue: dialogue,
          cameraFocus: dialogue
            ? dialogue.staffId === 'v'
              ? 'APPAREL'
              : dialogue.staffId === 'scooter'
                ? 'PARTS'
                : 'SERVICE'
            : 'OVERVIEW',
          cameraYawOffset: 0,
          cameraZoomDelta: 0,
          idleSeconds: 0,
        }),

      pushOverheadBark: (staffId, text, ttlMs = 5200) =>
        set((state) => ({
          overheadBarks: {
            ...state.overheadBarks,
            [staffId]: {
              staffId,
              text,
              expiresAt: Date.now() + ttlMs,
            },
          },
        })),

      clearOverheadBark: (staffId) =>
        set((state) => {
          if (!state.overheadBarks[staffId]) return state;
          const next = { ...state.overheadBarks };
          delete next[staffId];
          return { overheadBarks: next };
        }),

      setLiveBays: (bays, onlineCount) =>
        set({ liveBays: bays, onlineTechCount: onlineCount }),

      incrementIdleSeconds: () =>
        set((state) => ({ idleSeconds: state.idleSeconds + 1 })),

      resetIdleSeconds: () =>
        set((state) => (state.idleSeconds === 0 ? state : { idleSeconds: 0 })),

      spawnAmbientCustomer: (event, durationMs = 18000) => {
        const now = Date.now();
        set({
          activeCustomer: {
            event,
            spawnedAt: now,
            expiresAt: now + durationMs,
          },
        });
      },

      dismissAmbientCustomer: () => set({ activeCustomer: null }),

      addToCart: (item, qty = 1) => {
        const safeQty = Math.max(1, Math.min(20, Math.floor(qty)));
        set((state) => {
          const idx = state.cart.findIndex(
            (c) =>
              c.handle === item.handle &&
              c.size === item.size &&
              c.color === item.color,
          );
          if (idx >= 0) {
            const nextCart = [...state.cart];
            nextCart[idx] = {
              ...nextCart[idx],
              quantity: Math.min(20, nextCart[idx].quantity + safeQty),
            };
            return { cart: nextCart, idleSeconds: 0 };
          }
          return {
            cart: [...state.cart, { ...item, quantity: safeQty }],
            idleSeconds: 0,
          };
        });
      },

      updateCartQuantity: (handle, size, color, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              cart: state.cart.filter(
                (c) => !(c.handle === handle && c.size === size && c.color === color),
              ),
            };
          }
          const clamped = Math.min(20, Math.floor(quantity));
          return {
            cart: state.cart.map((c) =>
              c.handle === handle && c.size === size && c.color === color
                ? { ...c, quantity: clamped }
                : c,
            ),
          };
        }),

      removeFromCart: (handle, size, color) =>
        set((state) => ({
          cart: state.cart.filter(
            (c) => !(c.handle === handle && c.size === size && c.color === color),
          ),
        })),

      clearCart: () => set({ cart: [], appliedPromoCode: '' }),

      setAppliedPromoCode: (code) =>
        set({ appliedPromoCode: code.trim().toUpperCase() }),

      addUnlockedReward: (reward) =>
        set((state) => {
          const exists = state.unlockedRewards.some(
            (r) => r.promoCode === reward.promoCode,
          );
          const nextRewards = exists
            ? state.unlockedRewards
            : [reward, ...state.unlockedRewards].slice(0, 8);
          return {
            unlockedRewards: nextRewards,
            appliedPromoCode: state.appliedPromoCode || reward.promoCode,
          };
        }),

      toggleSfx: () => {
        const next = !get().sfxEnabled;
        shopAudio.setMuted(!next, !next);
        set({ sfxEnabled: next });
      },
    }),
    {
      name: 'hardr_shop_state_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
        appliedPromoCode: state.appliedPromoCode,
        unlockedRewards: state.unlockedRewards,
        sfxEnabled: state.sfxEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          shopAudio.setMuted(!state.sfxEnabled, !state.sfxEnabled);
        }
      },
    },
  ),
);
