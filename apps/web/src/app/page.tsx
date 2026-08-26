import { GeneratorWorkspace } from '../components/GeneratorWorkspace';
import { SiteHeader } from '../components/SiteHeader';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            JSON to TypeScript Converter
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Paste an API JSON response and generate clean, production-ready TypeScript interfaces
            or type aliases — including nested objects and arrays.
          </p>
        </div>
        <GeneratorWorkspace />
      </main>
    </div>
  );
}
