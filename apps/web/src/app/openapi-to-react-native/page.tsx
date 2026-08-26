import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '../../components/SiteHeader';

export const metadata: Metadata = {
  title: 'OpenAPI to React Native',
  description:
    'Generate React Native Axios or Fetch API clients from OpenAPI/Swagger specifications with ApiCaptain.',
};

export default function OpenApiToReactNativePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">OpenAPI to React Native</h1>
        <p className="mt-4 text-slate-400">
          ApiCaptain converts OpenAPI 3.x and Swagger 2.0 documents into typed React Native clients
          using Axios or Fetch, including models, path/query parameters, and auth configuration hooks.
        </p>
        <Link href="/openapi-generator" className="mt-6 inline-block text-teal-400 hover:underline">
          Open the OpenAPI generator →
        </Link>
      </main>
    </div>
  );
}
