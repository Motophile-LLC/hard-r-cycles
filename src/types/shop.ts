import type {
  AtlasPinDot,
  AtlasVisibility,
} from '@/features/atlas/types';
import type {
  CustomerMemoryRecord,
  CustomerTier,
  ResolvedNpcMemoryState,
} from '@/features/npc-memory/types';

export type {
  AtlasPinDot,
  AtlasVisibility,
  CustomerMemoryRecord,
  CustomerTier,
  ResolvedNpcMemoryState,
};

export type RackSlot =
  | 'rack_1_humor'
  | 'rack_2_definition'
  | 'wall_braap'
  | 'parts_shelf'
  | 'hard_r_originals'
  | 'motophile_partner'
  | 'episode_drops'
  | 'vip_secret_stash';

export type ShopDepartment = 'APPAREL' | 'PARTS';

export type CheckoutMode = 'shopify_link' | 'stripe_diy' | 'stripe_pod';

export interface ShopProduct {
  id: string;
  handle: string;
  title: string;
  collection: string;
  rack_slot: RackSlot;
  department: ShopDepartment;
  checkout_mode: CheckoutMode;
  external_url: string | null;
  price_min: number;
  price_max: number;
  colors: string[];
  sizes: string[];
  tags: string[];
  fit_notes: string;
  image_url: string;
  active: boolean;
  sort_order: number;
}

export type ShopViewMode = 'FLOOR' | 'GAME_BAY';

export type CameraFocusZone =
  | 'OVERVIEW'
  | 'APPAREL'
  | 'PARTS'
  | 'SERVICE'
  | 'BAYS'
  | 'ATLAS';

export type ShopDrawerKind =
  | null
  | 'APPAREL'
  | 'PARTS'
  | 'QUICK_SHOP'
  | 'SERVICE_COUNTER'
  | 'FLAT_RATE_MASTER'
  | 'ATLAS'
  | 'CART';

export type RackFilter =
  | 'ALL'
  | 'rack_1_humor'
  | 'rack_2_definition'
  | 'wall_braap'
  | 'hard_r_originals'
  | 'motophile_partner'
  | 'episode_drops'
  | 'vip_secret_stash';

export type StaffId = 'v' | 'dick' | 'scooter';

export type BayActivityState =
  | 'WRENCHING'
  | 'SPARKS'
  | 'BREAKER_BLOWN'
  | 'CHAOS_SMOKE'
  | 'JOB_DONE'
  | 'IDLE';

export interface LiveBayOccupant {
  bayIndex: 1 | 2 | 3;
  isRealPlayer: boolean;
  playerName: string;
  bikeSprite: 'track-bagger' | 'bigwheel-bagger' | 'club-dyna';
  activity: BayActivityState;
  statusText: string;
  updatedAt: number;
}

export interface OverheadBark {
  staffId: StaffId;
  text: string;
  expiresAt: number;
}

export interface StaffDialogueState {
  staffId: StaffId;
  portraitId: string;
  moodLabel: string;
  tierBadge?: string;
  speakerName: string;
  speakerRole: string;
  message: string;
  suggestedProducts: ShopProduct[];
  quickReplies: { label: string; query: string }[];
}

export interface CartItem {
  handle: string;
  title: string;
  image_url: string;
  unitPrice: number;
  size: string;
  color: string;
  quantity: number;
  checkoutMode: CheckoutMode;
}

export interface UnlockedReward {
  id: string;
  repairOrderId: string;
  promoCode: string;
  discountPercent: number;
  tierLabel: string;
  redeemed: boolean;
  createdAt: string;
}

export type AmbientCustomerSprite =
  | 'customer-1'
  | 'customer-2'
  | 'customer-3'
  | 'shop-buddy';

export interface AmbientCustomerEvent {
  id: string;
  sprite: AmbientCustomerSprite;
  characterName: string;
  bubbleText: string;
  staffResponder: StaffId;
  staffReply: string;
  suggestedQuery: string;
  position: [number, number, number];
}

export interface ActiveAmbientCustomer {
  event: AmbientCustomerEvent;
  spawnedAt: number;
  expiresAt: number;
}

export interface GarageBike {
  id: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  notes: string;
}

export interface ShippingAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  mechanic_handle: string;
  avatar_url: string | null;
  auth_provider: string;
  role: 'customer' | 'admin';
  phone: string;
  shirt_size: string;
  default_shipping_address: ShippingAddress | null;
  garage_bikes: GarageBike[];
  marketing_opt_in: boolean;
  social_handle?: string;
  atlas_visibility?: 'public' | 'anonymized' | 'hidden';
  v_circle_opt_in?: boolean;
  visit_count?: number;
  sign_in_count: number;
  last_seen_at: string;
  created_at: string;
}
