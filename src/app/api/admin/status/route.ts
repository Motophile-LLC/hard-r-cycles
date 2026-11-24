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
      isSuperAdmin: false,
    });
  }

  const auth = await requireAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({
      ...status,
      authenticated: auth.status !== 401,
      authorizedAdmin: false,
      isSuperAdmin: false,
      authError: auth.error,
    });
  }

  return NextResponse.json({
    ...status,
    authenticated: true,
    authorizedAdmin: true,
    isSuperAdmin: auth.isSuperAdmin,
    adminEmail: auth.email,
  });
}
