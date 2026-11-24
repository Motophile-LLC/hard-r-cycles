import { NextRequest, NextResponse } from 'next/server';
import { getAdminSetupStatus, requireAdminAuth } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const status = getAdminSetupStatus();
  const hasAuthHeader = Boolean(req.headers.get('authorization'));

  if (!hasAuthHeader) {
    return NextResponse.json({
      ...status,
      authenticated: false,
      authorizedAdmin: false,
    });
  }

  const auth = await requireAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({
      ...status,
      authenticated: auth.status !== 401,
      authorizedAdmin: false,
      authError: auth.error,
    });
  }

  return NextResponse.json({
    ...status,
    authenticated: true,
    authorizedAdmin: true,
    adminEmail: auth.email,
  });
}
