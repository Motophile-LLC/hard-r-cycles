import type { MetadataRoute } from 'next';

function getOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return raw.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getOrigin();
  const lastModified = new Date();

  return [
    {
      url: `${origin}/`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${origin}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${origin}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${origin}/shipping-returns`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
