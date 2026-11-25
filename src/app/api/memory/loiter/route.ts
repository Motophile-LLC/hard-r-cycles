import { NextRequest, NextResponse } from 'next/server';
import {
  isMissingTableError,
  recordLoiterKickInCustomerMemory,
} from '@/features/npc-memory/serverSync';
import { getAuthenticatedUser } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { user, tokenPresent, error } = await getAuthenticatedUser(req);
  if (!tokenPresent || !user) {
    return NextResponse.json(
      { error: error ?? 'Google or Apple SSO sign-in is required.' },
      { status: 401 },
    );
  }

  const adminDb = getSupabaseAdminClient();
  if (!adminDb) {
    return NextResponse.json({
      ok: true,
      persisted: false,
      customerMemory: null,
    });
  }

  try {
    // Probe existence once cleanly so pre-005 environments report pendingMigration accurately
    const { error: probeErr } = await adminDb
      .from('customer_memory')
      .select('user_id')
      .eq('user_id', user.userId)
      .maybeSingle();

    if (probeErr && isMissingTableError(probeErr)) {
      return NextResponse.json({
        ok: true,
        persisted: false,
        pendingMigration: true,
        customerMemory: null,
      });
    }

    const customerMemory = await recordLoiterKickInCustomerMemory(adminDb, user.userId);
    return NextResponse.json({
      ok: true,
      persisted: Boolean(customerMemory),
      customerMemory,
    });
  } catch (err) {
    console.warn('[api/memory/loiter] error:', err);
    return NextResponse.json({
      ok: true,
      persisted: false,
      customerMemory: null,
    });
  }
}
