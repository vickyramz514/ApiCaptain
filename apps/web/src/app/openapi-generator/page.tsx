import type { Metadata } from 'next';
import Link from 'next/link';
import { OpenApiWorkspace } from '../../components/openapi/OpenApiWorkspace';
import { SiteHeader } from '../../components/SiteHeader';

export const metadata: Metadata = {
  title: 'OpenAPI Generator - Generate API Client Code',
  description:
    'Upload OpenAPI 3.0/3.1 or Swagger 2.0 (JSON/YAML) and generate production-ready API clients for React Native, Flutter, SwiftUI, Android, and Python.',
  keywords: [
    'OpenAPI generator',
    'Swagger to TypeScript',
    'OpenAPI to React Native',
    'OpenAPI to Flutter',
    'OpenAPI to Kotlin',
    'OpenAPI to Swift',
    'ApiCaptain',
  ],
  openGraph: {
    title: 'OpenAPI Generator - Generate API Client Code | ApiCaptain',
    description:
      'Turn OpenAPI/Swagger into production-ready multi-language API clients.',
  },
};

export default function OpenApiGeneratorPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <p className="text-sm text-slate-400">
            <Link href="/" className="text-teal-400 hover:underline">
              Home
            </Link>{' '}
            / OpenAPI Generator
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            OpenAPI / Swagger → API Client
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Upload, paste, or import an OpenAPI 3.0 / 3.1 or Swagger 2.0 document. Select endpoints and
            generate structured clients for React Native (Axios/Fetch), Flutter (Dio), SwiftUI
            (URLSession), Android (Retrofit), and Python (httpx).
          </p>
        </div>
        <OpenApiWorkspace />
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-white">Supported inputs</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
            <li>OpenAPI 3.0 and 3.1 (JSON or YAML)</li>
            <li>Swagger / OpenAPI 2.0 (JSON or YAML)</li>
            <li>Local $ref resolution with circular reference safety</li>
            <li>Secure server-side URL import with SSRF protections</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
