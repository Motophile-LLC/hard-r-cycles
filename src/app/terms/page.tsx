import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of service for Hard R Cycles 18+ interactive shop experience, partner storefront links, direct Stripe orders, and Flat Rate Panic rewards.',
};

export default function TermsPage() {
  return (
    <LegalPageShell
      badge="HARD R CYCLES • LEGAL"
      title="Terms of Service"
      updatedAt="November 2026"
      activePath="/terms"
    >
      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          1. 18+ Adult Shop Humor &amp; Access
        </h2>
        <p>
          Hard R Cycles is an interactive 3D cartoon storefront and arcade game featuring
          raunchy biker humor, shop banter, and fictional characters (V, Dick, and
          Scooter). By entering the shop floor, you confirm that you are at least 18 years
          old (or the age of majority in your jurisdiction).
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          2. Partner Referrals vs. Direct Purchases
        </h2>
        <p>
          Items labeled <strong>Buy on Shopify</strong> link externally to our verified
          partner store (<strong>MotophileUSA.com</strong>), whose checkout, taxes, and
          fulfillment terms apply to those purchases. Items labeled{' '}
          <strong>Hard R Originals</strong> (stocked shop gear and direct print-on-demand
          drops) are added to the Hard R Cycles cart and billed securely through{' '}
          <strong>Stripe Checkout</strong>.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          3. Flat Rate Panic Discount Rewards
        </h2>
        <p>
          Promo codes earned inside the Flat Rate Panic service bays are issued as
          single-use discounts tied to a server-verified repair order score (5% at 90%+,
          10% at 110%+, or 15% at 130%+ efficiency). Codes apply only to eligible direct
          Hard R Originals Stripe Cart orders, carry zero cash value, and may not be stacked
          or resold.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          4. Intellectual Property &amp; Gameplay Rules
        </h2>
        <p>
          All Hard R Cycles characters, original artwork, shop audio, and codebase remain
          the property of Hard R Cycles. Automated score spoofing, checkout probing, or
          attempts to tamper with repair order submissions may result in reward
          invalidation.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">5. Contact</h2>
        <p>
          For order questions, copyright inquiries, or support, reach out through the
          contact channel listed on your Stripe receipt or MotophileUSA storefront.
        </p>
      </section>
    </LegalPageShell>
  );
}
