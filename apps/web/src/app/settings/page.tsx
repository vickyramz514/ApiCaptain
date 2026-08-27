'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '../../lib/apiClient';
import { useAuth } from '../../components/AuthProvider';
import { SiteHeader } from '../../components/SiteHeader';

export default function SettingsPage() {
  const { user, usage, loading, removeAccount, refresh } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?next=/settings');
    }
  }, [loading, user, router]);

  const onDelete = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (confirmText !== 'DELETE') {
      setError('Type DELETE to confirm.');
      return;
    }
    try {
      await removeAccount(password);
      setMessage('Account deleted.');
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-lg font-semibold text-white">Profile</h2>
          <p className="mt-3 text-sm text-slate-300">Name: {user?.name || '—'}</p>
          <p className="text-sm text-slate-300">Email: {user?.email}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-3 text-xs text-teal-400 hover:underline"
          >
            Refresh
          </button>
        </section>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-lg font-semibold text-white">Account</h2>
          <p className="mt-3 text-sm text-slate-300">Plan: {user?.plan}</p>
          <p className="text-sm text-slate-300">
            Usage: {usage?.generationCount ?? 0} / {usage?.generationLimit ?? '∞'}
          </p>
          <Link href="/pricing" className="mt-2 inline-block text-sm text-teal-400 hover:underline">
            View pricing
          </Link>
        </section>

        <section className="mt-6 rounded-xl border border-rose-900/50 bg-rose-950/20 p-4">
          <h2 className="text-lg font-semibold text-rose-200">Danger zone</h2>
          <p className="mt-2 text-sm text-slate-400">
            Delete your account and all projects, generations, and usage data. This cannot be undone.
          </p>
          <form onSubmit={(event) => void onDelete(event)} className="mt-4 space-y-3">
            <input
              placeholder="Type DELETE"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Confirm with password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {message ? <p className="text-sm text-teal-300">{message}</p> : null}
            <button type="submit" className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white">
              Delete account
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
