import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Shipping & Returns',
  description:
    'Shipping rates, fulfillment timelines, and return/replacement coverage for Hard R Cycles direct gear and MotophileUSA partner merch.',
};

export default function ShippingReturnsPage() {
  return (
    <LegalPageShell
      badge="HARD R CYCLES • FULFILLMENT"
      title="Shipping & Returns"
      updatedAt="November 2026"
      activePath="/shipping-returns"
    >
      <div className="rounded-2xl border-3 border-black bg-amber-100 p-4 text-xs font-bold text-black">
        <strong>Note on Dick&apos;s Wall Signs:</strong> The &ldquo;NO REFUNDS.
        SERIOUSLY.&rdquo; wall plaque behind the virtual Service Counter is part of the
        cartoon comedy act. Real buyer protections for paid orders are outlined below.
      </div>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          1. Hard R Originals (Direct Stripe Cart Orders)
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Shipping Rate:</strong> Flat{' '}
            <strong>$9.95 USD</strong> Garage Ground shipping on orders under{' '}
            <strong>$125.00</strong>, or <strong>FREE shipping</strong> automatically at
            checkout on qualifying orders of <strong>$125.00+</strong>.
          </li>
          <li>
            <strong>Shop-Stocked Gear (DIY):</strong> Ships directly from the Hard R
            Cycles bench within 2–4 business days with tracking uploaded once dispatched.
          </li>
          <li>
            <strong>Made-to-Order Gear (POD):</strong> Printed to order (typically 3–7
            business days production plus carrier transit).
          </li>
        </ul>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          2. MotophileUSA Partner Storefront Items
        </h2>
        <p>
          Apparel linked through the <strong>Buy on Shopify</strong> button on V&apos;s
          racks is fulfilled and shipped under{' '}
          <a
            href="https://motophileusa.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-black underline hover:text-amber-700"
          >
            MotophileUSA.com
          </a>{' '}
          policies. Support, tracking, and returns for those orders are handled directly
          through your MotophileUSA order confirmation email.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          3. Damaged, Defective, or Wrong Item Guarantee
        </h2>
        <p>
          If a direct Hard R Originals item arrives damaged, misprinted, or incorrect,
          reply to your Stripe confirmation email with your order ID and a photo within{' '}
          <strong>14 days of delivery</strong> and we will replace it or issue a full
          refund promptly.
        </p>
      </section>
    </LegalPageShell>
  );
}
