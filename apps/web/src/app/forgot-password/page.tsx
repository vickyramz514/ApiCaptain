'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiClientError, forgotPassword } from '../../lib/apiClient';
import { SiteHeader } from '../../components/SiteHeader';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await forgotPassword({ email });
      setMessage('If an account exists for that email, a reset link was sent.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Request failed');
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-semibold text-white">Forgot password</h1>
        <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-300">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {message ? <p className="text-sm text-teal-300">{message}</p> : null}
          <button type="submit" className="rounded-md bg-teal-500 px-4 py-2 font-medium text-slate-950">
            Send reset link
          </button>
        </form>
        <Link href="/login" className="mt-4 inline-block text-sm text-slate-400 hover:text-teal-300">
          Back to login
        </Link>
      </main>
    </div>
  );
}
