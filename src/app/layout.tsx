import type { Metadata, Viewport } from 'next';
import './globals.css';

function resolveSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // Fallback safely if env value is malformed
    }
  }
  return new URL('http://localhost:3000');
}

const siteUrl = resolveSiteUrl();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1c1917',
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: 'Hard R Cycles — Interactive Motorcycle Shop & Flat Rate Panic',
    template: '%s | Hard R Cycles',
  },
  description:
    'Walk into the living 3D cartoon Hard R Cycles dealership floor: shop V’s apparel racks, talk trash with Dick & Scooter, earn merch discounts in Flat Rate Panic, and grab Hard R Originals gear.',
  keywords: [
    'Hard R Cycles',
    'motorcycle apparel',
    'biker humor shirts',
    'Flat Rate Panic',
    'motorcycle shop game',
    'custom V-twin shop',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Hard R Cycles',
    url: '/',
    title: 'Hard R Cycles — Interactive 3D Motorcycle Shop & Flat Rate Panic',
    description:
      'Step onto the Hard R Cycles shop floor: shop biker apparel & Hard R Originals, earn repair-bay discount codes in Flat Rate Panic, and talk trash with the crew.',
    images: [
      {
        url: '/brand/og-card.png',
        width: 1200,
        height: 630,
        alt: 'Hard R Cycles — Interactive Motorcycle Shop',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hard R Cycles — Interactive 3D Motorcycle Shop & Flat Rate Panic',
    description:
      'Walk the 3D cartoon Hard R Cycles floor, shop biker tees & Hard R Originals, and wrench through Flat Rate Panic.',
    images: ['/brand/og-card.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
