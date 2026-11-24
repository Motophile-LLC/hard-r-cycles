import { NextResponse } from 'next/server';
import { FALLBACK_CATALOG } from '@/data/fallbackCatalog';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { ShopProduct } from '@/types/shop';

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({
      source: 'local',
      products: FALLBACK_CATALOG,
    });
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, handle, title, collection, rack_slot, department, checkout_mode, external_url, price_min, price_max, colors, sizes, tags, fit_notes, image_url, active, sort_order',
      )
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        source: 'local',
        warning: error?.message,
        products: FALLBACK_CATALOG,
      });
    }

    const products: ShopProduct[] = data.map((row) => ({
      ...row,
      price_min: Number(row.price_min),
      price_max: Number(row.price_max),
      colors: Array.isArray(row.colors) ? row.colors : [],
      sizes: Array.isArray(row.sizes) ? row.sizes : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
    }));

    return NextResponse.json({
      source: 'supabase',
      products,
    });
  } catch (err) {
    return NextResponse.json({
      source: 'local',
      warning: err instanceof Error ? err.message : 'Products unreachable',
      products: FALLBACK_CATALOG,
    });
  }
}
