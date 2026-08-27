'use client';

import Link from 'next/link';
import { PRO_MONTHLY_PRICE_INR } from '@apicaptain/config';
import { ApiClientError } from '../lib/apiClient';
import { useAuth } from './AuthProvider';
import { startProCheckout } from './ProCheckout';

export function UsageLimitNotice({ error }: { error: unknown }) {
  const { user, refresh } = useAuth();
  if (!(error instanceof ApiClientError) || error.code !== 'USAGE_LIMIT_REACHED') {
    return null;
  }

  const price =
    typeof error.details === 'object' &&
    error.details !== null &&
    'upgradePriceInr' in error.details &&
    typeof (error.details as { upgradePriceInr?: number }).upgradePriceInr === 'number'
      ? (error.details as { upgradePriceInr: number }).upgradePriceInr
      : PRO_MONTHLY_PRICE_INR;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-3 text-sm text-amber-100">
      <p>You&apos;ve reached your monthly generation limit.</p>
      {user ? (
        <button
          type="button"
          className="mt-2 rounded-md bg-teal-500 px-3 py-1.5 text-sm font-medium text-slate-950"
          onClick={() => void startProCheckout({ onActivated: () => void refresh() })}
        >
          Upgrade to Pro — ₹{price}/month
        </button>
      ) : (
        <Link href="/pricing" className="mt-2 inline-block text-teal-300 underline">
          Upgrade to Pro — ₹{price}/month
        </Link>
      )}
    </div>
  );
}
