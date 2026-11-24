import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/LegalPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Hard R Cycles handles browser storage, game leaderboard entries, Stripe payments, and shipping information.',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      badge="HARD R CYCLES • PRIVACY"
      title="Privacy Policy"
      updatedAt="November 2026"
      activePath="/privacy"
    >
      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          1. Local Browser Storage
        </h2>
        <p>
          We store lightweight state locally in your browser&apos;s{' '}
          <code className="rounded bg-zinc-100 px-1 font-bold">localStorage</code> solely
          for essential functionality: remembering your 18+ entrance confirmation, saving
          your Hard R Originals shopping bag, storing your claimed shift promo codes, and
          keeping your audio mute preference. We do not sell third-party ad tracking
          profiles.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          2. Payments &amp; Checkout Data
        </h2>
        <p>
          Direct purchases are processed exclusively by <strong>Stripe</strong>. Hard R
          Cycles never receives or stores your raw credit card number or CVV. After
          successful checkout, our webhook stores only the Stripe session reference, item
          summary, order totals, customer email, and shipping address in our row-level
          secured Postgres database so we can fulfill and ship your gear (and pass shipping
          details to Printful when fulfilling print-on-demand items).
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          3. Public Leaderboard &amp; Live Bay Presence
        </h2>
        <p>
          When you finish a shift in Flat Rate Panic, your chosen mechanic display name,
          efficiency score, and rank badge are posted to the public leaderboard. Real-time
          service bay indicators use ephemeral Supabase Realtime presence with no personal
          contact information broadcast.
        </p>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-black uppercase text-black">
          4. Data Access &amp; Deletion
        </h2>
        <p>
          You can clear local cart and preference data at any time by clearing browser
          site storage. To request deletion or lookup of an order record or repair order
          entry, contact us via the support email shown on your Stripe order receipt.
        </p>
      </section>
    </LegalPageShell>
  );
}
