import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBillingConfig, PRO_MONTHLY_AMOUNT_PAISE } from '@apicaptain/config';
import { hmacSha256Hex } from '../crypto.js';
import { RazorpayProvider } from '../providers/razorpay/index.js';
import type { RazorpaySdkLike } from '../providers/razorpay/client.js';
import { MockPaymentProvider } from '../providers/mock.js';

const config = getBillingConfig({
  RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_KEY_SECRET: 'test_secret',
  RAZORPAY_WEBHOOK_SECRET: 'whsec_test',
  RAZORPAY_PRO_PLAN_ID: 'plan_test_pro',
  NODE_ENV: 'test',
});

const fakeSdk = (): RazorpaySdkLike & { calls: string[] } => {
  const calls: string[] = [];
  const sdk: RazorpaySdkLike & { calls: string[] } = {
    calls,
    customers: {
      async create(data) {
        calls.push('customers.create');
        return { id: 'cust_1', email: data.email, name: data.name };
      },
    },
    subscriptions: {
      async create(data) {
        calls.push('subscriptions.create');
        return {
          id: 'sub_1',
          status: 'created',
          plan_id: data.plan_id,
          customer_id: data.customer_id,
          current_start: null,
          current_end: null,
        };
      },
      async fetch(id) {
        calls.push('subscriptions.fetch');
        return {
          id,
          status: 'active',
          plan_id: 'plan_test_pro',
          customer_id: 'cust_1',
          current_start: 1_777_200_000,
          current_end: 1_779_878_400,
        };
      },
      async cancel(id, cancelAtCycleEnd) {
        calls.push(`subscriptions.cancel:${String(cancelAtCycleEnd)}`);
        return {
          id,
          status: cancelAtCycleEnd ? 'active' : 'cancelled',
          plan_id: 'plan_test_pro',
          customer_id: 'cust_1',
          current_end: 1_779_878_400,
        };
      },
      async resume(id) {
        calls.push('subscriptions.resume');
        return { id, status: 'active', plan_id: 'plan_test_pro', customer_id: 'cust_1' };
      },
    },
    payments: {
      async fetch(id) {
        calls.push('payments.fetch');
        return {
          id,
          amount: PRO_MONTHLY_AMOUNT_PAISE,
          currency: 'INR',
          status: 'captured',
          captured: true,
          method: 'card',
        };
      },
    },
    invoices: {
      async all() {
        calls.push('invoices.all');
        return { items: [] };
      },
    },
  };
  return sdk;
};

test('create customer and subscription via Razorpay provider', async () => {
  const sdk = fakeSdk();
  const provider = new RazorpayProvider(config, sdk);
  const customer = await provider.createCustomer({ email: 'dev@example.com', name: 'Dev' });
  assert.equal(customer.id, 'cust_1');
  const subscription = await provider.createSubscription({
    customerId: customer.id,
    planId: 'plan_test_pro',
    totalCount: 120,
  });
  assert.equal(subscription.id, 'sub_1');
  assert.equal(subscription.status, 'created');
  assert.deepEqual(sdk.calls, ['customers.create', 'subscriptions.create']);
});

test('retrieve, cancel, and resume subscription', async () => {
  const sdk = fakeSdk();
  const provider = new RazorpayProvider(config, sdk);
  const fetched = await provider.getSubscription('sub_1');
  assert.equal(fetched.status, 'active');
  const cancelled = await provider.cancelSubscription('sub_1', true);
  assert.equal(cancelled.cancelAtPeriodEnd, true);
  const resumed = await provider.resumeSubscription('sub_1');
  assert.equal(resumed.status, 'active');
  assert.ok(sdk.calls.includes('subscriptions.cancel:true'));
});

test('verify payment signature using key secret', () => {
  const sdk = fakeSdk();
  const provider = new RazorpayProvider(config, sdk);
  const paymentId = 'pay_1';
  const subscriptionId = 'sub_1';
  const signature = hmacSha256Hex(config.razorpayKeySecret, `${paymentId}|${subscriptionId}`);
  assert.equal(provider.verifyPayment({ paymentId, subscriptionId, signature }), true);
  assert.equal(
    provider.verifyPayment({ paymentId, subscriptionId, signature: 'nope' }),
    false,
  );
});

test('verify webhook signature against raw body', () => {
  const sdk = fakeSdk();
  const provider = new RazorpayProvider(config, sdk);
  const raw = Buffer.from('{"event":"subscription.activated"}');
  const signature = hmacSha256Hex(config.razorpayWebhookSecret, raw);
  assert.equal(provider.verifyWebhook(raw, signature), true);
  assert.equal(provider.verifyWebhook(raw, 'bad'), false);
});

test('mock provider avoids duplicate customers and can activate', async () => {
  const mock = new MockPaymentProvider(config);
  const first = await mock.createCustomer({ email: 'a@example.com' });
  const second = await mock.createCustomer({ email: 'a@example.com' });
  assert.equal(first.id, second.id);
  const sub = await mock.createSubscription({
    customerId: first.id,
    planId: 'plan_test_pro',
    totalCount: 12,
  });
  mock.activate(sub.id);
  const fetched = await mock.getSubscription(sub.id);
  assert.equal(fetched.status, 'active');
});
