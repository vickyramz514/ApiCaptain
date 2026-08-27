'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatInrFromPaise, PRO_MONTHLY_PRICE_INR } from '@apicaptain/config';
import type { BillingStatusData, PaymentHistoryItem } from '@apicaptain/types';
import { SiteHeader } from '../../components/SiteHeader';
import { useAuth } from '../../components/AuthProvider';
import { startProCheckout } from '../../components/ProCheckout';
import {
  ApiClientError,
  cancelSubscription,
  fetchBilling,
  fetchBillingPayments,
} from '../../lib/apiClient';

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const statusLabel = (status: BillingStatusData['status']): string => {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'TRIALING':
      return 'Trialing';
    case 'PAST_DUE':
      return 'Past due';
    case 'CANCELLED':
      return 'Cancelled';
    case 'EXPIRED':
      return 'Expired';
    default:
      return 'Inactive';
  }
};

export default function BillingPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [billing, setBilling] = useState<BillingStatusData | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'ok' | 'error' | 'info'>('info');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [status, history] = await Promise.all([fetchBilling(), fetchBillingPayments()]);
    setBilling(status);
    setPayments(history.payments);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=/billing');
      return;
    }
    void load().catch((error) => {
      setTone('error');
      setMessage(error instanceof ApiClientError ? error.message : 'Failed to load billing');
    });
  }, [loading, user, router]);

  const onUpgrade = () => {
    void startProCheckout({
      onActivated: () => {
        void refresh();
        void load();
      },
      onMessage: (text, nextTone) => {
        setMessage(text);
        setTone(nextTone ?? 'info');
      },
    });
  };

  const onCancel = async () => {
    if (!window.confirm('Cancel Pro at the end of the current billing period? You keep Pro until then.')) {
      return;
    }
    setBusy(true);
    try {
      const next = await cancelSubscription(false);
      setBilling(next);
      setTone('ok');
      setMessage(
        next.currentPeriodEnd
          ? `Pro remains active until ${formatDate(next.currentPeriodEnd)}.`
          : 'Subscription will cancel at period end.',
      );
      await refresh();
    } catch (error) {
      setTone('error');
      setMessage(error instanceof ApiClientError ? error.message : 'Cancellation failed');
    } finally {
      setBusy(false);
    }
  };

  const isPro = billing?.plan === 'PRO';

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">Billing</h1>

        {message ? (
          <p className={`mt-4 text-sm ${tone === 'error' ? 'text-rose-300' : 'text-teal-300'}`}>{message}</p>
        ) : null}

        {billing?.status === 'PAST_DUE' ? (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            Your latest payment failed. Please update your payment method.
          </p>
        ) : null}

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current Plan</p>
          <p className="mt-2 text-3xl font-semibold text-white">{billing?.plan ?? 'FREE'}</p>
          <p className="mt-1 text-lg text-teal-300">
            ₹{isPro ? PRO_MONTHLY_PRICE_INR : 0} / month
          </p>
          <p className="mt-2 text-sm text-slate-300">{statusLabel(billing?.status ?? 'INACTIVE')}</p>
          {isPro ? (
            <p className="mt-3 text-sm text-slate-400">
              {billing?.cancelAtPeriodEnd ? 'Cancels on' : 'Next billing'}:{' '}
              {formatDate(billing?.currentPeriodEnd ?? null)}
            </p>
          ) : null}
          {billing?.paymentMethod ? (
            <p className="mt-1 text-sm text-slate-400">Payment method: {billing.paymentMethod}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {isPro ? (
              <button
                type="button"
                disabled={busy || billing?.cancelAtPeriodEnd}
                onClick={() => void onCancel()}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
              >
                Cancel Subscription
              </button>
            ) : (
              <button
                type="button"
                onClick={onUpgrade}
                className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Payment History</h2>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No payments yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {payments.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
                  <span className="text-white">{formatDate(item.paidAt ?? item.createdAt)}</span>
                  <span className="mx-2 text-teal-300">{formatInrFromPaise(item.amount)}</span>
                  <span>{item.status === 'CAPTURED' ? 'Paid' : item.status}</span>
                  {item.invoiceUrl ? (
                    <a href={item.invoiceUrl} className="ml-2 text-teal-400 underline" target="_blank" rel="noreferrer">
                      Invoice
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
