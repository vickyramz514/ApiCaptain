'use client';

import Link from 'next/link';

import { useAuth } from './AuthProvider';

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-400 text-sm font-bold text-slate-950">
            AC
          </div>
          <div>
            <p className="text-base font-semibold text-white">ApiCaptain</p>
            <p className="text-xs text-slate-400">Generate production-ready API code</p>
          </div>
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-teal-300">
                Dashboard
              </Link>
              <Link href="/projects" className="hover:text-teal-300">
                Projects
              </Link>
              <Link href="/" className="hover:text-teal-300">
                Tools
              </Link>
              <Link href="/billing" className="hover:text-teal-300">
                Billing
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="hover:text-teal-300">
                Tools
              </Link>
              <Link href="/openapi-generator" className="hover:text-teal-300">
                OpenAPI Generator
              </Link>
              <Link href="/pricing" className="hover:text-teal-300">
                Pricing
              </Link>
            </>
          )}
          {loading ? null : user ? (
            <>
              <Link href="/settings" className="hover:text-teal-300">
                Settings
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-md border border-slate-600 px-3 py-1 text-slate-200 hover:border-teal-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-teal-300">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-teal-500 px-3 py-1 font-medium text-slate-950"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
