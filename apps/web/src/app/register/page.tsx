'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ApiClientError, consumeSaveDraft, createProject } from '../../lib/apiClient';
import { useAuth } from '../../components/AuthProvider';
import { SiteHeader } from '../../components/SiteHeader';
import { GoogleAuthDivider, GoogleLoginButton } from '../../components/GoogleLoginButton';
import type { CreateProjectRequest } from '@apicaptain/types';

function RegisterForm() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const continueAfterAuth = async () => {
    const draft = consumeSaveDraft<CreateProjectRequest>();
    if (draft?.name && draft.sourceType) {
      const project = await createProject(draft);
      router.push(`/projects/${project.id}`);
      return;
    }
    router.push(params.get('next') || '/dashboard');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, name || undefined);
      await continueAfterAuth();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <label className="block text-sm text-slate-300">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
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
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <p className="text-xs text-slate-500">At least 8 characters with letters and numbers.</p>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-teal-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create free account'}
        </button>
      </form>
      <GoogleAuthDivider />
      <GoogleLoginButton
        disabled={loading}
        onError={setError}
        onCredential={async (credential) => {
          setLoading(true);
          setError(null);
          try {
            await signInWithGoogle(credential);
            await continueAfterAuth();
          } finally {
            setLoading(false);
          }
        }}
      />
    </>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-semibold text-white">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Already registered?{' '}
          <Link href="/login" className="text-teal-400 hover:underline">
            Login
          </Link>
        </p>
        <Suspense>
          <RegisterForm />
        </Suspense>
      </main>
    </div>
  );
}
