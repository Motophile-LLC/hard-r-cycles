import { ArrowLeft, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';
import { FALLBACK_CATALOG } from '@/data/fallbackCatalog';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { ShopProduct } from '@/types/shop';

export const dynamic = 'force-dynamic';

async function loadAdminProducts(): Promise<{
  source: 'supabase' | 'local';
  products: ShopProduct[];
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { source: 'local', products: FALLBACK_CATALOG };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, handle, title, collection, rack_slot, department, checkout_mode, external_url, price_min, price_max, colors, sizes, tags, fit_notes, image_url, active, sort_order',
      )
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return { source: 'local', products: FALLBACK_CATALOG };
    }

    return {
      source: 'supabase',
      products: data.map((row) => ({
        ...row,
        price_min: Number(row.price_min),
        price_max: Number(row.price_max),
        colors: Array.isArray(row.colors) ? row.colors : [],
        sizes: Array.isArray(row.sizes) ? row.sizes : [],
        tags: Array.isArray(row.tags) ? row.tags : [],
      })),
    };
  } catch {
    return { source: 'local', products: FALLBACK_CATALOG };
  }
}

export default async function AdminCatalogPage() {
  const { products } = await loadAdminProducts();
  const activeCount = products.filter((p) => p.active).length;

  return (
    <main className="min-h-dvh bg-stone-900 px-4 py-6 text-black sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-4 border-black bg-amber-50 p-4 shadow-[8px_8px_0px_#000]">
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
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
                HARD R CYCLES • CATALOG, REWARDS &amp; FULFILLMENT ADMIN
              </p>
              <h1 className="text-2xl font-black uppercase">
                Shop Console ({activeCount} Active)
              </h1>
            </div>
          </div>

          <Link
            href="/"
            className="flex min-h-12 items-center gap-1.5 rounded-2xl border-3 border-black bg-amber-300 px-4 py-2 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-amber-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Shop Floor
          </Link>
        </div>

        {/* Interactive Auth-Gated Admin Console */}
        <AdminDashboardClient />

        {/* Inventory Table */}
        <div className="overflow-x-auto rounded-3xl border-4 border-black bg-white shadow-[8px_8px_0px_#000]">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead className="border-b-4 border-black bg-zinc-900 text-amber-300">
              <tr>
                <th className="px-4 py-3 font-black uppercase">Product</th>
                <th className="px-4 py-3 font-black uppercase">Rack Slot</th>
                <th className="px-4 py-3 font-black uppercase">Mode</th>
                <th className="px-4 py-3 font-black uppercase">Price</th>
                <th className="px-4 py-3 font-black uppercase">Status</th>
                <th className="px-4 py-3 font-black uppercase text-right">Checkout</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item) => (
                <tr key={item.handle} className="border-b border-zinc-200 font-bold last:border-b-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-black bg-zinc-100">
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-black text-black">{item.title}</p>
                        <p className="text-[10px] text-zinc-500">{item.collection}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px]">{item.rack_slot}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded border border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase">
                      {item.checkout_mode}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-emerald-800">
                    ${item.price_min.toFixed(2)}–${item.price_max.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                        item.active ? 'bg-emerald-300 text-black' : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      {item.active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {item.external_url ? (
                      <a
                        href={item.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase hover:bg-amber-300"
                      >
                        Shopify <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-zinc-400">Internal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
