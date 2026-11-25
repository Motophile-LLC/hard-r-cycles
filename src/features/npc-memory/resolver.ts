import type {
  CustomerMemoryRecord,
  ResolvedNpcMemoryState,
} from './types';

export const VIP_ORDER_THRESHOLD = 3;
export const VIP_SPEND_THRESHOLD = 150;

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

export function resolveCustomerMemoryState(
  memory: CustomerMemoryRecord | null,
  profile: ProfileMemoryInput | null,
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
