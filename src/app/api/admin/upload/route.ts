import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req, { requireSecretClient: true });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing image file field.' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: 'Unsupported file type. Upload a JPEG, PNG, or WebP image.' },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Image size must be between 1 byte and 5 MB.' },
      { status: 400 },
    );
  }

  const safeSlug = file.name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'product';
  const objectPath = `uploads/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeSlug}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const adminDb = getSupabaseAdminClient()!;

  const { error: uploadError } = await adminDb.storage
    .from('product-images')
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: pub } = adminDb.storage.from('product-images').getPublicUrl(objectPath);

  return NextResponse.json(
    {
      path: objectPath,
      publicUrl: pub.publicUrl,
    },
    { status: 201 },
  );
}
