import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '../../components/SiteHeader';

export const metadata: Metadata = {
  title: 'OpenAPI to Swift',
  description: 'Generate SwiftUI URLSession clients and Codable models from OpenAPI/Swagger.',
};

export default function OpenApiToSwiftPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">OpenAPI to Swift (URLSession)</h1>
        <p className="mt-4 text-slate-400">
          Generate Codable models and async URLSession API methods from OpenAPI endpoints.
        </p>
        <Link href="/openapi-generator" className="mt-6 inline-block text-teal-400 hover:underline">
          Open the OpenAPI generator →
        </Link>
      </main>
    </div>
  );
}
