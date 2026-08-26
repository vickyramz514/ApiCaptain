import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'React Native API Code Generator | ApiCaptain',
    template: '%s | ApiCaptain',
  },
  description:
    'Generate production-ready React Native TypeScript API clients from request/response JSON. Also convert JSON to TypeScript interfaces.',
  applicationName: 'ApiCaptain',
  keywords: [
    'React Native API generator',
    'Axios TypeScript',
    'Fetch TypeScript',
    'JSON to TypeScript',
    'ApiCaptain',
  ],
  authors: [{ name: 'ApiCaptain' }],
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'React Native API Code Generator | ApiCaptain',
    description:
      'Generate production-ready React Native TypeScript API clients from request/response JSON.',
    siteName: 'ApiCaptain',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'React Native API Code Generator | ApiCaptain',
    description:
      'Generate production-ready React Native TypeScript API clients from request/response JSON.',
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
