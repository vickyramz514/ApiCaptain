import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '../../components/SiteHeader';

export const metadata: Metadata = {
  title: 'Swagger to TypeScript',
  description:
    'Convert Swagger 2.0 and OpenAPI specs into TypeScript React Native API clients with ApiCaptain.',
};

export default function SwaggerToTypeScriptPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">Swagger to TypeScript</h1>
        <p className="mt-4 text-slate-400">
          Import Swagger 2.0 or OpenAPI documents and generate TypeScript interfaces plus Axios/Fetch
          clients for React Native.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/openapi-generator" className="text-teal-400 hover:underline">
            OpenAPI generator →
          </Link>
          <Link href="/" className="text-teal-400 hover:underline">
            JSON → TypeScript converter →
          </Link>
        </div>
      </main>
    </div>
  );
}
