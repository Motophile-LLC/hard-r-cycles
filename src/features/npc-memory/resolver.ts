import type {
  CustomerMemoryRecord,
  CustomerOrderSummary,
  ResolvedNpcMemoryState,
} from './types';

export const VIP_ORDER_THRESHOLD = 3;
export const VIP_SPEND_THRESHOLD = 150;

const DELIVERED_SHIP_AGE_MS = 5 * 24 * 60 * 60 * 1000;

const KNOWN_PLURAL_ITEMS = new Set([
  'patches',
  'stickers',
  'gloves',
  'socks',
  'grips',
  'pegs',
  'boots',
  'pants',
  'shorts',
  'packs',
  'slaps',
  'decals',
  'tees',
  'shirts',
  'hoodies',
]);

export interface ProfileBikeSummary {
  year?: string;
  make?: string;
  model?: string;
}

export interface ProfileMemoryInput {
  display_name?: string;
  mechanic_handle?: string;
  visit_count?: number;
  sign_in_count?: number;
  garage_bikes?: ProfileBikeSummary[];
}

export function formatItemPhrase(rawTitle: string): {
  determiner: 'that' | 'those';
  label: string;
} {
  const trimmed = rawTitle.trim() || 'Hard R gear';
  const stripped = trimmed
    .replace(/^hard\s*r(?:\s+cycles)?\s+/i, '')
    .trim();
  const label = stripped.length >= 3 ? stripped : trimmed;
  const lastWord = (label.split(/\s+/).pop() ?? '').toLowerCase();

  const isPlural =
    KNOWN_PLURAL_ITEMS.has(lastWord) ||
    (lastWord.endsWith('s') &&
      !lastWord.endsWith('ss') &&
      !lastWord.endsWith('is') &&
      !lastWord.endsWith('us'));

  return {
    determiner: isPlural ? 'those' : 'that',
    label,
  };
}

export function isOrderDelivered(order: CustomerOrderSummary): boolean {
  if (order.status === 'delivered') return true;
  if (order.status === 'shipped') {
    const createdMs = Date.parse(order.created_at);
    return (
      Number.isFinite(createdMs) && Date.now() - createdMs >= DELIVERED_SHIP_AGE_MS
    );
  }
  return false;
}

export function describeOrderStatus(order: CustomerOrderSummary): string {
  switch (order.status) {
    case 'paid':
      return 'Paid — queued on bench';
    case 'fulfilling':
      return 'Fulfilling / Printing';
    case 'shipped':
      return isOrderDelivered(order) ? 'Delivered' : 'Shipped — on the road';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    default:
      return String(order.status);
  }
}

export function resolveCustomerMemoryState(
  memory: CustomerMemoryRecord | null,
  profile: ProfileMemoryInput | null,
  orders: CustomerOrderSummary[] = [],
): ResolvedNpcMemoryState {
  const totalOrders = memory?.total_orders ?? 0;
  const lifetimeSpend = Number(memory?.lifetime_spend ?? 0);
  const diagnosticCount = memory?.diagnostic_count ?? 0;
  const visitCount = Math.max(
    profile?.visit_count ?? 0,
    profile?.sign_in_count ?? 0,
    profile ? 1 : 0,
  );

  const firstBike = Array.isArray(profile?.garage_bikes)
    ? profile.garage_bikes[0]
    : undefined;
  const formattedGarageBike = firstBike
    ? [firstBike.year, firstBike.make, firstBike.model]
        .filter(Boolean)
        .join(' ')
        .trim()
    : '';
  const primaryBike =
    (memory?.last_diagnosed_bike && memory.last_diagnosed_bike.trim()) ||
    formattedGarageBike ||
    null;

  const riderName =
    (profile?.mechanic_handle && profile.mechanic_handle.trim()) ||
    (profile?.display_name && profile.display_name.trim()) ||
    'Rider';

  const isSignedIn = Boolean(profile || memory);

  const orderList = Array.isArray(orders) ? orders : [];
  const latestOrder = orderList[0] ?? null;
  const hasActiveOpenOrder = Boolean(
    latestOrder &&
      (latestOrder.status === 'paid' ||
        latestOrder.status === 'fulfilling' ||
        (latestOrder.status === 'shipped' && !isOrderDelivered(latestOrder))),
  );
  const latestDeliveredOrder = orderList.find(isOrderDelivered) ?? null;
  const deliveredTitleFromOrder =
    latestDeliveredOrder?.items?.[0]?.title?.trim() || null;
  const latestDeliveredItem =
    deliveredTitleFromOrder ??
    (!hasActiveOpenOrder && totalOrders >= 1 && memory?.last_purchased_item
      ? memory.last_purchased_item.trim()
      : null);

  const orderContext = {
    latestOrder,
    latestDeliveredOrder,
    latestDeliveredItem,
    hasActiveOpenOrder,
  };

  if (totalOrders >= VIP_ORDER_THRESHOLD || lifetimeSpend >= VIP_SPEND_THRESHOLD) {
    return {
      tier: 'VIP_SUPPORTER',
      tierBadge: 'VIP Supporter',
      hasVipAccess: true,
      loiterWarningSeconds: 120,
      loiterKickSeconds: 600,
      memory,
      visitCount,
      riderName,
      primaryBike,
      isSignedIn,
      ...orderContext,
    };
  }

  if (diagnosticCount >= 2) {
    return {
      tier: 'REPEAT_DIAGNOSTIC',
      tierBadge: 'Repeat Diagnostic',
      hasVipAccess: false,
      loiterWarningSeconds: 30,
      loiterKickSeconds: 180,
      memory,
      visitCount,
      riderName,
      primaryBike,
      isSignedIn,
      ...orderContext,
    };
  }

  if (totalOrders >= 1) {
    return {
      tier: 'FIRST_TIME_BUYER',
      tierBadge: 'First-Time Buyer',
      hasVipAccess: false,
      loiterWarningSeconds: 45,
      loiterKickSeconds: 180,
      memory,
      visitCount,
      riderName,
      primaryBike,
      isSignedIn,
      ...orderContext,
    };
  }

  if (visitCount >= 2) {
    return {
      tier: 'WINDOW_SHOPPER',
      tierBadge: 'Window Shopper',
      hasVipAccess: false,
      loiterWarningSeconds: 20,
      loiterKickSeconds: 60,
      memory,
      visitCount,
      riderName,
      primaryBike,
      isSignedIn,
      ...orderContext,
    };
  }

  return {
    tier: 'NEWCOMER',
    tierBadge: 'Shop Visitor',
    hasVipAccess: false,
    loiterWarningSeconds: 30,
    loiterKickSeconds: 180,
    memory,
    visitCount,
    riderName,
    primaryBike,
    isSignedIn,
    ...orderContext,
  };
}

export function getWalkInGreetingBarks(state: ResolvedNpcMemoryState): {
  v: string;
  dick: string;
} {
  if (state.latestDeliveredItem) {
    const { determiner, label } = formatItemPhrase(state.latestDeliveredItem);
    const verb = determiner === 'those' ? 'are' : 'is';
    return {
      v: `Welcome back, ${state.riderName}! How are you enjoying ${determiner} ${label}?`,
      dick: `Hey ${state.riderName} — how ${verb} ${determiner} ${label} holding up on the road?`,
    };
  }

  if (state.hasActiveOpenOrder && state.latestOrder) {
    const itemLabel = state.latestOrder.items[0]?.title || 'your order';
    const statusText = describeOrderStatus(state.latestOrder);
    return {
      v: `Hey ${state.riderName}! Your ${itemLabel} (${statusText}) is moving — ask any of us for tracking.`,
      dick: `${state.riderName}, your ${itemLabel} is ${state.latestOrder.status.toUpperCase()}. Ask me or V if you want the status.`,
    };
  }

  if (state.tier === 'VIP_SUPPORTER') {
    return {
      v: `Welcome back, VIP ${state.riderName}! Secret Stash is unlocked over here.`,
      dick: `Well look who's back — Secret Stash is open for you, ${state.riderName}.`,
    };
  }

  if (state.tier === 'WINDOW_SHOPPER') {
    return {
      v: `Welcome back, ${state.riderName}! Fresh gear on the racks — ignore Dick.`,
      dick: `Visit #${state.visitCount}, ${state.riderName}? Don't touch anything expensive unless you're buying.`,
    };
  }

  return {
    v: 'Welcome in! Check the racks—ignore Dick.',
    dick: "Don't touch anything expensive.",
  };
}

export function getDickLoiterBark(
  state: ResolvedNpcMemoryState,
  isKick: boolean,
): string {
  if (state.tier === 'VIP_SUPPORTER') {
    return isKick
      ? `Still hanging around, ${state.riderName}? Coffee's fresh behind the counter and Secret Stash is open.`
      : `Take your time, ${state.riderName} — Secret Stash is open whenever you're ready.`;
  }

  if (state.tier === 'WINDOW_SHOPPER') {
    return isKick
      ? `You again, ${state.riderName}? This ain't a museum — buy a shirt or grab a broom!`
      : `Visit #${state.visitCount} and zero spend, ${state.riderName}? My floor rent isn't free.`;
  }

  if (state.tier === 'REPEAT_DIAGNOSTIC') {
    const bike = state.primaryBike ?? 'that sled';
    return isKick
      ? `Quit staring at the lift, ${state.riderName} — either tear into ${bike} or clear the bay!`
      : `Still thinking about ${bike}? Bring it up to the counter or grab a wrench.`;
  }

  if (state.tier === 'FIRST_TIME_BUYER') {
    return isKick
      ? `Appreciate the last order, ${state.riderName}, but two more and you actually unlock the VIP Stash.`
      : `Not bad having a paying customer around, ${state.riderName} — check the racks or hit Bay 1.`;
  }

  return isKick
    ? `Floor space ain't free! Grab a shirt off V's racks or clock into a Service Bay!`
    : `Hey! Floor space ain't free—buy a shirt or get on a lift!`;
}
