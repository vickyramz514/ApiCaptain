'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ApiClientError, resetPassword } from '../../lib/apiClient';
import { SiteHeader } from '../../components/SiteHeader';

function ResetForm() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await resetPassword({ token, password });
      setMessage('Password updated. You can log in now.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Reset failed');
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
      <label className="block text-sm text-slate-300">
        Reset token
        <input
          required
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        />
      </label>
      <label className="block text-sm text-slate-300">
        New password
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="text-sm text-teal-300">{message}</p> : null}
      <button type="submit" className="rounded-md bg-teal-500 px-4 py-2 font-medium text-slate-950">
        Reset password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-semibold text-white">Reset password</h1>
        <Suspense>
          <ResetForm />
        </Suspense>
        <Link href="/login" className="mt-4 inline-block text-sm text-slate-400 hover:text-teal-300">
          Back to login
        </Link>
      </main>
    </div>
  );
}
