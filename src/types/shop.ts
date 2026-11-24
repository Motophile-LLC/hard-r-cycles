export type RackSlot =
  | 'rack_1_humor'
  | 'rack_2_definition'
  | 'wall_braap'
  | 'parts_shelf'
  | 'hard_r_originals';

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
  | 'BAYS';

export type ShopDrawerKind =
  | null
  | 'APPAREL'
  | 'PARTS'
  | 'QUICK_SHOP'
  | 'SERVICE_COUNTER'
  | 'CART';

export type RackFilter =
  | 'ALL'
  | 'rack_1_humor'
  | 'rack_2_definition'
  | 'wall_braap'
  | 'hard_r_originals';

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
