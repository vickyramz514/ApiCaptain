import type { HealthResponse } from '@apicaptain/types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${apiUrl}/health`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const health = await fetchHealth();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-teal-300/80">ApiCaptain</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Monorepo scaffold ready
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
          Next.js frontend, Express API, and shared packages for types, config, and generators.
          Product features come next — this shell is production-ready architecture.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">API health</h2>
        <p className="mt-3 font-mono text-sm text-slate-200">
          {health
            ? `${health.status} · ${health.service} · ${health.version}`
            : `Waiting for API at ${apiUrl}`}
        </p>
      </section>
    </main>
  );
}
