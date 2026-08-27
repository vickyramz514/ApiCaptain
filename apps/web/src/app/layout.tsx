import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '../components/Providers';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ApiCaptain — Turn APIs into production-ready code',
    template: '%s | ApiCaptain',
  },
  description:
    'Generate production-ready API clients from JSON, endpoints, and OpenAPI. Save projects, track usage, and scale with Pro.',
  applicationName: 'ApiCaptain',
  keywords: [
    'OpenAPI generator',
    'React Native API generator',
    'JSON to TypeScript',
    'ApiCaptain',
  ],
  authors: [{ name: 'ApiCaptain' }],
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'ApiCaptain — Turn APIs into production-ready code',
    description:
      'Generate production-ready API clients from JSON, endpoints, and OpenAPI.',
    siteName: 'ApiCaptain',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
