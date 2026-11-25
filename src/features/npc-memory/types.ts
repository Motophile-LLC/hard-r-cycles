export type CustomerTier =
  | 'NEWCOMER'
  | 'WINDOW_SHOPPER'
  | 'FIRST_TIME_BUYER'
  | 'VIP_SUPPORTER'
  | 'REPEAT_DIAGNOSTIC';

export type CustomerOrderStatus =
  | 'paid'
  | 'fulfilling'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface CustomerOrderSummary {
  id: string;
  status: CustomerOrderStatus;
  tracking_number: string | null;
  total: number;
  fulfillment_mode: string;
  items: Array<{ title: string; quantity: number; size?: string; color?: string }>;
  created_at: string;
}

export interface CustomerMemoryRecord {
  user_id: string;
  total_orders: number;
  lifetime_spend: number;
  purchased_skus: string[];
  last_order_date: string | null;
  last_purchased_item: string | null;
  diagnostic_count: number;
  last_diagnosed_bike: string | null;
  last_symptom: string | null;
  flat_rate_high_score: number;
  loiter_kick_count: number;
  created_at: string;
  updated_at: string;
}

export interface ResolvedNpcMemoryState {
  tier: CustomerTier;
  tierBadge: string;
  hasVipAccess: boolean;
  loiterWarningSeconds: number;
  loiterKickSeconds: number;
  memory: CustomerMemoryRecord | null;
  visitCount: number;
  riderName: string;
  primaryBike: string | null;
  isSignedIn: boolean;
  latestOrder: CustomerOrderSummary | null;
  latestDeliveredOrder: CustomerOrderSummary | null;
  latestDeliveredItem: string | null;
  hasActiveOpenOrder: boolean;
}
