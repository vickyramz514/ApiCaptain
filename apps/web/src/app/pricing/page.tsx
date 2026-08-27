'use client';

import { useEffect, useState } from 'react';
import type { PricingData } from '@apicaptain/types';
import { fetchPricing } from '../../lib/apiClient';
import { SiteHeader } from '../../components/SiteHeader';
import Link from 'next/link';

export default function PricingPage() {
  const [data, setData] = useState<PricingData | null>(null);

  useEffect(() => {
    void fetchPricing().then(setData).catch(() => setData(null));
  }, []);

  const free = data?.plans.find((plan) => plan.id === 'FREE');
  const pro = data?.plans.find((plan) => plan.id === 'PRO');

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">Pricing</h1>
        <p className="mt-2 text-slate-400">Simple plans for independent developers.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[free, pro].filter(Boolean).map((plan) => (
            <div key={plan!.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-xl font-semibold text-white">{plan!.name}</h2>
              <p className="mt-2 text-3xl font-semibold text-teal-300">
                ₹{plan!.priceMonthlyInr}
                <span className="text-sm font-normal text-slate-400">/month</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {plan!.highlights.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              {plan!.ctaMode === 'coming_soon' ? (
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-400"
                >
                  Coming soon
                </button>
              ) : (
                <Link
                  href="/register"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950"
                >
                  {plan!.ctaLabel}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-300">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-4">Feature</th>
                <th className="py-2 pr-4">Free</th>
                <th className="py-2">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-800">
                <td className="py-2 pr-4">Generations</td>
                <td className="py-2 pr-4">50/month</td>
                <td className="py-2">Unlimited</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="py-2 pr-4">Projects</td>
                <td className="py-2 pr-4">5</td>
                <td className="py-2">Unlimited</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="py-2 pr-4">OpenAPI</td>
                <td className="py-2 pr-4">Yes</td>
                <td className="py-2">Yes</td>
              </tr>
              <tr className="border-t border-slate-800">
                <td className="py-2 pr-4">React Native / Flutter / Swift / Kotlin / Python</td>
                <td className="py-2 pr-4">Yes</td>
                <td className="py-2">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
