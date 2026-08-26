import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'JSON to TypeScript Converter | ApiCaptain',
    template: '%s | ApiCaptain',
  },
  description:
    'Convert API JSON responses into production-ready TypeScript interfaces and types with ApiCaptain.',
  applicationName: 'ApiCaptain',
  keywords: [
    'JSON to TypeScript',
    'TypeScript interface generator',
    'API JSON converter',
    'ApiCaptain',
  ],
  authors: [{ name: 'ApiCaptain' }],
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'JSON to TypeScript Converter | ApiCaptain',
    description:
      'Convert API JSON responses into production-ready TypeScript interfaces and types.',
    siteName: 'ApiCaptain',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JSON to TypeScript Converter | ApiCaptain',
    description:
      'Convert API JSON responses into production-ready TypeScript interfaces and types.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
