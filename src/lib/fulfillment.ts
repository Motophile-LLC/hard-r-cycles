import type { CheckoutMode } from '@/types/shop';

export interface FulfillableItem {
  handle: string;
  title: string;
  quantity: number;
  size: string;
  color: string;
  unitPriceCents: number;
  checkoutMode: CheckoutMode;
}

export interface ShippingDetailsPayload {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
}

export function determineFulfillmentMode(
  modes: CheckoutMode[],
): 'diy' | 'pod' | 'hybrid' {
  const hasDiy = modes.some((m) => m === 'stripe_diy');
  const hasPod = modes.some((m) => m === 'stripe_pod');
  if (hasDiy && hasPod) return 'hybrid';
  if (hasPod) return 'pod';
  return 'diy';
}

export async function dispatchFulfillment(params: {
  orderId: string;
  customerEmail: string;
  shipping: ShippingDetailsPayload | null;
  items: FulfillableItem[];
}): Promise<{ podDispatched: boolean; podNote: string; initialStatus: 'paid' | 'fulfilling' }> {
  const diyItems = params.items.filter((i) => i.checkoutMode === 'stripe_diy');
  const podItems = params.items.filter((i) => i.checkoutMode === 'stripe_pod');

  if (podItems.length === 0) {
    return {
      podDispatched: false,
      podNote: `DIY packing queue (${diyItems.length} item(s))`,
      initialStatus: 'paid',
    };
  }

  const printfulToken = process.env.PRINTFUL_API_TOKEN?.trim();
  if (!printfulToken) {
    console.info(
      `[fulfillment] Order ${params.orderId} has ${podItems.length} POD item(s) awaiting manual Printful dispatch (PRINTFUL_API_TOKEN unset).`,
    );
    return {
      podDispatched: false,
      podNote: 'Printful API token not configured; queued for manual Printful submission.',
      initialStatus: 'paid',
    };
  }

  // Only attempt draft order creation when shipping address is present
  const addr = params.shipping?.address;
  if (!addr?.line1 || !addr?.city || !addr?.country || !addr?.postal_code) {
    return {
      podDispatched: false,
      podNote: 'Missing complete shipping address for automated Printful draft.',
      initialStatus: 'paid',
    };
  }

  try {
    const res = await fetch('https://api.printful.com/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${printfulToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: params.orderId,
        recipient: {
          name: params.shipping?.name ?? params.customerEmail,
          email: params.customerEmail,
          address1: addr.line1,
          address2: addr.line2 ?? undefined,
          city: addr.city,
          state_code: addr.state ?? undefined,
          country_code: addr.country,
          zip: addr.postal_code,
        },
        items: podItems.map((item) => ({
          name: `${item.title} (${item.size} / ${item.color})`,
          quantity: item.quantity,
          retail_price: (item.unitPriceCents / 100).toFixed(2),
          sku: item.handle,
        })),
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text();
      console.warn('[fulfillment] Printful draft returned non-200:', res.status, bodyText);
      return {
        podDispatched: false,
        podNote: `Printful API HTTP ${res.status} — saved in DB for manual sync.`,
        initialStatus: 'paid',
      };
    }

    return {
      podDispatched: true,
      podNote: 'Draft submitted to Printful.',
      initialStatus: 'fulfilling',
    };
  } catch (err) {
    console.warn('[fulfillment] Printful request error:', err);
    return {
      podDispatched: false,
      podNote: 'Printful unreachable — saved in DB for manual sync.',
      initialStatus: 'paid',
    };
  }
}
