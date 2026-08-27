'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardData } from '@apicaptain/types';
import { ApiClientError, fetchDashboard } from '../../lib/apiClient';
import { useAuth } from '../../components/AuthProvider';
import { SiteHeader } from '../../components/SiteHeader';

const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?next=/dashboard');
      return;
    }
    void fetchDashboard()
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiClientError ? err.message : 'Failed to load dashboard'),
      );
  }, [user, authLoading, router]);

  const usage = data?.usage;
  const limit = usage?.generationLimit;
  const count = usage?.generationCount ?? 0;
  const pct = limit ? Math.min(100, Math.round((count / limit) * 100)) : 0;
  const remaining = limit === null || limit === undefined ? null : Math.max(0, limit - count);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="mt-2 text-slate-400">
          {greeting()}, {user?.name || user?.email?.split('@')[0] || 'there'}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/projects?new=1" className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950">
            New Project
          </Link>
          <Link href="/openapi-generator" className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200">
            OpenAPI Generator
          </Link>
          <Link href="/" className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200">
            JSON Generator
          </Link>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Plan</p>
            <p className="mt-2 text-2xl font-semibold text-white">{user?.plan ?? 'FREE'}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Monthly usage</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {count} / {limit ?? '∞'} generations
            </p>
            {limit ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-teal-400" style={{ width: `${pct}%` }} />
              </div>
            ) : null}
            {remaining !== null && remaining <= 10 && remaining > 0 ? (
              <p className="mt-2 text-sm text-amber-300">Only {remaining} generations remaining.</p>
            ) : null}
            {remaining === 0 ? (
              <p className="mt-2 text-sm text-rose-300">
                You&apos;ve reached your monthly limit.{' '}
                <Link href="/pricing" className="underline">
                  Upgrade to Pro
                </Link>
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Projects</p>
            <p className="mt-2 text-2xl font-semibold text-white">{data?.projectCount ?? 0}</p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Recent generations</h2>
          <ul className="mt-3 space-y-2">
            {(data?.recentGenerations ?? []).length === 0 ? (
              <li className="text-sm text-slate-500">No generations yet.</li>
            ) : (
              data?.recentGenerations.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
                  <span className="font-medium text-white">
                    {item.framework ?? item.sourceType}
                    {item.library ? ` + ${item.library}` : ''}
                  </span>
                  <span className="text-slate-500">
                    {' '}
                    · {item.endpointCount ?? 0} endpoints · {new Date(item.createdAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
