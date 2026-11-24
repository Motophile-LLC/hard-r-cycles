import { NextResponse } from 'next/server';
import { FALLBACK_LEADERBOARD } from '@/data/shiftJobs';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { RepairOrderRecord } from '@/types/game';

function sanitizeText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function parseBoundedNumber(raw: unknown): number | null {
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100) / 100;
}

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({
      source: 'local',
      records: FALLBACK_LEADERBOARD,
    });
  }

  try {
    const { data, error } = await supabase
      .from('repair_orders')
      .select(
        'id, mechanic_name, billed_hours, actual_hours, efficiency_rating, shop_damage_cost, rank_badge, jobs_completed, created_at',
      )
      .order('efficiency_rating', { ascending: false })
      .order('shop_damage_cost', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json({
        source: 'local',
        warning: error.message,
        records: FALLBACK_LEADERBOARD,
      });
    }

    return NextResponse.json({
      source: 'supabase',
      records: data ?? [],
    });
  } catch (err) {
    return NextResponse.json({
      source: 'local',
      warning: err instanceof Error ? err.message : 'Leaderboard unreachable',
      records: FALLBACK_LEADERBOARD,
    });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const mechanicName = sanitizeText(body.mechanic_name, 24);
  const rankBadge = sanitizeText(body.rank_badge, 40) || 'Shop Wrench';
  const billedHours = parseBoundedNumber(body.billed_hours);
  const actualHours = parseBoundedNumber(body.actual_hours);
  const efficiencyRating = parseBoundedNumber(body.efficiency_rating);
  const shopDamageCost = parseBoundedNumber(body.shop_damage_cost);
  const jobsCompletedRaw = Number(body.jobs_completed ?? 4);
  const jobsCompleted = Number.isInteger(jobsCompletedRaw) ? jobsCompletedRaw : null;

  if (!mechanicName || mechanicName.length < 1 || mechanicName.length > 24) {
    return NextResponse.json(
      { error: 'mechanic_name must be 1 to 24 characters' },
      { status: 400 },
    );
  }
  if (billedHours === null || billedHours <= 0 || billedHours > 50) {
    return NextResponse.json(
      { error: 'billed_hours must be > 0 and <= 50' },
      { status: 400 },
    );
  }
  if (actualHours === null || actualHours <= 0 || actualHours > 100) {
    return NextResponse.json(
      { error: 'actual_hours must be > 0 and <= 100' },
      { status: 400 },
    );
  }
  if (efficiencyRating === null || efficiencyRating < 0 || efficiencyRating > 300) {
    return NextResponse.json(
      { error: 'efficiency_rating must be between 0 and 300' },
      { status: 400 },
    );
  }
  if (shopDamageCost === null || shopDamageCost < 0 || shopDamageCost > 100000) {
    return NextResponse.json(
      { error: 'shop_damage_cost must be >= 0 and <= 100000' },
      { status: 400 },
    );
  }
  if (jobsCompleted === null || jobsCompleted < 0 || jobsCompleted > 10) {
    return NextResponse.json(
      { error: 'jobs_completed must be an integer between 0 and 10' },
      { status: 400 },
    );
  }

  const payload: RepairOrderRecord = {
    mechanic_name: mechanicName,
    billed_hours: billedHours,
    actual_hours: actualHours,
    efficiency_rating: efficiencyRating,
    shop_damage_cost: shopDamageCost,
    rank_badge: rankBadge,
    jobs_completed: jobsCompleted,
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      {
        source: 'local',
        record: {
          ...payload,
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  }

  try {
    const { data, error } = await supabase
      .from('repair_orders')
      .insert(payload)
      .select(
        'id, mechanic_name, billed_hours, actual_hours, efficiency_rating, shop_damage_cost, rank_badge, jobs_completed, created_at',
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          source: 'local',
          warning: error.message,
          record: {
            ...payload,
            id: `local-${Date.now()}`,
            created_at: new Date().toISOString(),
          },
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        source: 'supabase',
        record: data,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        source: 'local',
        warning: err instanceof Error ? err.message : 'Insert failed',
        record: {
          ...payload,
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  }
}
