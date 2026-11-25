export const FLAT_RATE_MASTER_REF_CODE = 'ZUPH9BXM';

export const FLAT_RATE_MASTER_REFERRAL_URL =
  'https://app.motophileusa.com/sign-up?ref=ZUPH9BXM';

export type ShopAnalyticsEventName =
  | 'poster_open_flatratemaster'
  | 'poster_click_flatratemaster'
  | 'deep_link_landed'
  | 'atlas_open'
  | 'atlas_checkin';

export type ShopAnalyticsMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Emits a lightweight analytics custom DOM event and non-blocking POST beacon
 * to `/api/events` (silently tolerating offline or pre-migration environments).
 */
export function trackShopEvent(
  eventName: ShopAnalyticsEventName,
  metadata?: ShopAnalyticsMetadata,
  authToken?: string,
): void {
  if (typeof window === 'undefined') return;

  const cleanMetadata: Record<string, string | number | boolean | null> = {};
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        cleanMetadata[key] = value;
      }
    }
  }

  window.dispatchEvent(
    new CustomEvent('hardr:analytics', {
      detail: {
        eventName,
        metadata: cleanMetadata,
        ts: Date.now(),
      },
    }),
  );

  fetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      eventName,
      metadata: cleanMetadata,
    }),
    keepalive: true,
  }).catch(() => undefined);
}
