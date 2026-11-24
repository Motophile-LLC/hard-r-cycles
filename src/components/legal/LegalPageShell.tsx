import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface LegalPageShellProps {
  badge: string;
  title: string;
  updatedAt: string;
  activePath: '/terms' | '/privacy' | '/shipping-returns';
  children: ReactNode;
}

const LEGAL_LINKS: { href: '/terms' | '/privacy' | '/shipping-returns'; label: string }[] = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/shipping-returns', label: 'Shipping & Returns' },
];

export function LegalPageShell({
  badge,
  title,
  updatedAt,
  activePath,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-dvh bg-stone-900 px-4 py-6 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-4 border-black bg-amber-50 p-4 shadow-[8px_8px_0px_#000]">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-black p-1">
              <Image
                src="/brand/hard-r-cycles-logo.svg"
                alt="Hard R Cycles"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-red-700">
                {badge}
              </p>
              <h1 className="text-xl font-black uppercase sm:text-2xl">{title}</h1>
            </div>
          </div>

          <Link
            href="/"
            className="flex min-h-12 items-center gap-1.5 rounded-2xl border-3 border-black bg-amber-300 px-4 py-2 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-amber-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Shop Floor
          </Link>
        </header>

        <nav
          aria-label="Store policies navigation"
          className="flex flex-wrap gap-2"
        >
          {LEGAL_LINKS.map((item) => {
            const active = item.href === activePath;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl border-3 border-black px-3.5 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_#000] ${
                  active
                    ? 'bg-zinc-900 text-amber-300'
                    : 'bg-white text-black hover:bg-amber-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <article className="space-y-4 rounded-3xl border-4 border-black bg-white p-5 text-sm font-medium leading-relaxed text-zinc-800 shadow-[8px_8px_0px_#000] sm:p-7">
          <p className="text-xs font-black uppercase text-zinc-500">
            Last Updated: {updatedAt}
          </p>
          {children}
        </article>
      </div>
    </main>
  );
}
