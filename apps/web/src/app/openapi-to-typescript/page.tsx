import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '../../components/SiteHeader';

export const metadata: Metadata = {
  title: 'OpenAPI to TypeScript',
  description: 'Generate TypeScript API clients from OpenAPI specifications with ApiCaptain.',
};

export default function OpenApiToTypeScriptPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">OpenAPI to TypeScript</h1>
        <p className="mt-4 text-slate-400">
          Parse OpenAPI documents once, select endpoints, and emit typed TypeScript models and API
          functions organized by tags.
        </p>
        <Link href="/openapi-generator" className="mt-6 inline-block text-teal-400 hover:underline">
          Open the OpenAPI generator →
        </Link>
      </main>
    </div>
  );
}
