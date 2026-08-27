'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ApiClientError } from '../../lib/apiClient';
import { useAuth } from '../../components/AuthProvider';
import { SiteHeader } from '../../components/SiteHeader';

function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push(params.get('next') || '/dashboard');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
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
      <label className="block text-sm text-slate-300">
        Password
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-teal-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Login'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-semibold text-white">Login</h1>
        <p className="mt-2 text-sm text-slate-400">
          No account?{' '}
          <Link href="/register" className="text-teal-400 hover:underline">
            Register
          </Link>
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-sm text-slate-500">
          <Link href="/forgot-password" className="hover:text-teal-300">
            Forgot password?
          </Link>
        </p>
      </main>
    </div>
  );
}
