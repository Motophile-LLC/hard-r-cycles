import type { MetadataRoute } from 'next';

function getOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return raw.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

export default function robots(): MetadataRoute.Robots {
  const origin = getOrigin();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/auth/', '/checkout/success'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
