import Stripe from 'stripe';

let cachedStripe: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!cachedStripe) {
    cachedStripe = new Stripe(key);
  }
  return cachedStripe;
}

export function getShippingPolicy(): {
  flatRateCents: number;
  freeThresholdCents: number;
  automaticTax: boolean;
} {
  const parsedFlat = Number.parseInt(process.env.FLAT_RATE_SHIPPING_CENTS ?? '995', 10);
  const parsedThreshold = Number.parseInt(
    process.env.FREE_SHIPPING_THRESHOLD_CENTS ?? '12500',
    10,
  );
  return {
    flatRateCents: Number.isFinite(parsedFlat) && parsedFlat >= 0 ? parsedFlat : 995,
    freeThresholdCents:
      Number.isFinite(parsedThreshold) && parsedThreshold >= 0 ? parsedThreshold : 12500,
    automaticTax: process.env.STRIPE_AUTOMATIC_TAX === 'true',
  };
}

export function resolveSiteOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  const originHeader = req.headers.get('origin')?.trim();
  if (originHeader) {
    return originHeader.replace(/\/+$/, '');
  }
  const host = req.headers.get('host')?.trim();
  if (host) {
    const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

export interface RewardTierResult {
  eligible: boolean;
  discountPercent: 0 | 5 | 10 | 15;
  tierLabel: string;
}

export function computeRewardTier(
  efficiencyRating: number,
  jobsCompleted: number,
): RewardTierResult {
  if (!Number.isFinite(jobsCompleted) || jobsCompleted < 1) {
    return {
      eligible: false,
      discountPercent: 0,
      tierLabel: 'Finish at least 1 repair job to unlock shop rewards',
    };
  }
  if (efficiencyRating >= 130) {
    return {
      eligible: true,
      discountPercent: 15,
      tierLabel: 'Master Wrench Tier — 15% OFF',
    };
  }
  if (efficiencyRating >= 110) {
    return {
      eligible: true,
      discountPercent: 10,
      tierLabel: 'Flag-Time Assassin — 10% OFF',
    };
  }
  if (efficiencyRating >= 90) {
    return {
      eligible: true,
      discountPercent: 5,
      tierLabel: 'Clean Shift Bonus — 5% OFF',
    };
  }
  return {
    eligible: false,
    discountPercent: 0,
    tierLabel: 'Reach 90%+ flat-rate efficiency to unlock a shop coupon',
  };
}
