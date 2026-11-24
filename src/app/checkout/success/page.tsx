'use client';

import { ArrowLeft, CheckCircle2, PackageCheck, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useShopStore } from '@/store/useShopStore';

interface OrderSummary {
  stripe_session_id: string;
  status: string;
  subtotal: string | number;
  shipping_cost: string | number;
  total: string | number;
  currency: string;
  fulfillment_mode: string;
  tracking_number?: string | null;
  items?: Array<{
    title: string;
    quantity: number;
    size?: string;
    color?: string;
    amountTotal?: number;
    unitPriceCents?: number;
  }>;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id')?.trim() ?? '';
  const [statusMessage, setStatusMessage] = useState(
    sessionId ? 'Confirming payment receipt...' : 'Order session verified.',
  );
  const [order, setOrder] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    useShopStore.getState().clearCart();

    let cancelled = false;
    fetch(`/api/checkout?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { order?: OrderSummary; message?: string } | null) => {
        if (cancelled) return;
        if (data?.order) {
          setOrder(data.order);
          setStatusMessage('Payment confirmed. The shop has your ticket.');
        } else {
          setStatusMessage(
            data?.message ?? 'Order confirmed! Check your email for the Stripe receipt.',
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusMessage('Order recorded! Check your inbox for your Stripe confirmation.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-amber-50 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl rounded-3xl border-4 border-black bg-white p-6 shadow-[10px_10px_0px_#000] sm:p-8">
        <div className="flex items-center gap-3 border-b-4 border-black pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-3 border-black bg-emerald-400">
            <CheckCircle2 className="h-7 w-7 text-black" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-emerald-700">
              Hard R Cycles Order Desk
            </p>
            <h1 className="text-2xl font-black uppercase text-black">
              Order Received
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm font-bold text-zinc-700">{statusMessage}</p>

        {order ? (
          <div className="mt-5 space-y-4 rounded-2xl border-3 border-black bg-amber-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase">
              <span className="flex items-center gap-1.5 text-zinc-800">
                <PackageCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                Fulfillment: {order.fulfillment_mode} • Status: {order.status}
              </span>
              <span className="rounded border-2 border-black bg-white px-2 py-0.5 text-emerald-800">
                Total ${Number(order.total).toFixed(2)} {order.currency.toUpperCase()}
              </span>
            </div>

            {Array.isArray(order.items) && order.items.length > 0 ? (
              <ul className="space-y-1.5 border-t-2 border-black/15 pt-3 text-xs font-bold text-zinc-800">
                {order.items.map((item, idx) => (
                  <li key={`${item.title}-${idx}`} className="flex justify-between gap-2">
                    <span>
                      {item.quantity}x {item.title}
                      {item.size ? ` (${item.size})` : ''}
                    </span>
                    <span className="font-black">
                      {typeof item.amountTotal === 'number'
                        ? `$${item.amountTotal.toFixed(2)}`
                        : typeof item.unitPriceCents === 'number'
                          ? `$${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}`
                          : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="border-t-2 border-black/15 pt-2 text-[11px] font-bold text-zinc-500">
              Stripe Session: <code className="break-all">{order.stripe_session_id}</code>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border-4 border-black bg-amber-400 px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-amber-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to Hard R Cycles Floor
          </Link>
          <Link
            href="/"
            onClick={() => useShopStore.getState().setOpenDrawer('APPAREL')}
            className="inline-flex items-center gap-2 rounded-2xl border-4 border-black bg-white px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-zinc-100"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Keep Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-amber-50 p-8 text-sm font-black uppercase text-zinc-700">
          Loading receipt...
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
