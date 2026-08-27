'use client';

import {
  PRO_MONTHLY_PRICE_INR,
  PRO_PLAN_NAME,
  formatInrFromMajor,
} from '@apicaptain/config';
import type { SubscribeData } from '@apicaptain/types';
import {
  ApiClientError,
  createSubscriptionCheckout,
  fetchBilling,
  getStoredToken,
  verifySubscriptionPayment,
} from '../lib/apiClient';

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const loadRazorpay = async (): Promise<RazorpayConstructor> => {
  if (window.Razorpay) return window.Razorpay;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-apicaptain-razorpay]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay Checkout')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.apicaptainRazorpay = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout'));
    document.body.appendChild(script);
  });
  if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable');
  return window.Razorpay;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const waitForPro = async (): Promise<boolean> => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const billing = await fetchBilling();
      if (billing.plan === 'PRO' && (billing.status === 'ACTIVE' || billing.status === 'TRIALING')) {
        return true;
      }
    } catch {
      // Keep polling for a short window after checkout.
    }
    await sleep(700);
  }
  return false;
};

export const startProCheckout = async (options?: {
  onActivated?: () => void;
  onMessage?: (message: string, tone?: 'ok' | 'error' | 'info') => void;
}): Promise<void> => {
  const notify = options?.onMessage ?? (() => undefined);
  if (!getStoredToken()) {
    window.location.href = '/login?next=/billing';
    return;
  }

  const confirmed = window.confirm(
    `${PRO_PLAN_NAME}\n${formatInrFromMajor(PRO_MONTHLY_PRICE_INR)}/month\n\nUnlimited generations\nUnlimited projects\nAdvanced API generation\n\nContinue to payment?`,
  );
  if (!confirmed) return;

  notify('Opening checkout…', 'info');
  let checkout: SubscribeData;
  try {
    checkout = await createSubscriptionCheckout();
  } catch (error) {
    if (error instanceof ApiClientError && error.code === 'ALREADY_PRO') {
      notify('You already have Pro.', 'ok');
      options?.onActivated?.();
      return;
    }
    notify(error instanceof ApiClientError ? error.message : 'Could not start checkout.', 'error');
    return;
  }

  try {
    const Razorpay = await loadRazorpay();
    await new Promise<void>((resolve) => {
      const instance = new Razorpay({
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: checkout.name,
        description: checkout.description,
        theme: { color: '#14b8a6' },
        handler: (response: {
          razorpay_payment_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          void (async () => {
            try {
              await verifySubscriptionPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              });
              notify('Payment successful. Your Pro plan is being activated.', 'ok');
              await waitForPro();
              options?.onActivated?.();
            } catch (error) {
              notify(
                error instanceof ApiClientError
                  ? error.message
                  : 'Payment was not completed.',
                'error',
              );
            } finally {
              resolve();
            }
          })();
        },
        modal: {
          ondismiss: () => {
            notify('Payment was not completed.', 'error');
            resolve();
          },
        },
      });
      instance.on('payment.failed', (response) => {
        notify(response.error?.description || 'Payment was not completed.', 'error');
        resolve();
      });
      instance.open();
    });
  } catch {
    notify('Could not open Razorpay Checkout. Check your network and try again.', 'error');
  }
};
