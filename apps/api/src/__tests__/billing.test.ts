import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import type { Express } from 'express';
import { hmacSha256Hex, resetMockPaymentProvider } from '@apicaptain/billing';
import { memoryStore } from '../db/memoryStore.js';
import { createApp } from '../app.js';

const KEY_SECRET = 'test_secret';
const WEBHOOK_SECRET = 'test_webhook_secret';

const withServer = async (
  app: Express,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> => {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Failed to bind test server');
  }
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

const json = async (response: Response) => response.json() as Promise<Record<string, unknown>>;

const resetAll = (): void => {
  memoryStore.reset();
  resetMockPaymentProvider();
};

const register = async (baseUrl: string, email: string, name = 'Dev') => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Secret123', name }),
  });
  const body = await json(response);
  assert.equal(response.status, 201);
  return {
    token: (body.data as { token: string }).token,
    user: (body.data as { user: { id: string; email: string } }).user,
  };
};

const authJson = async (
  baseUrl: string,
  path: string,
  token: string,
  init?: { method?: string; body?: unknown },
) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return { response, body: await json(response) };
};

const signCheckout = (paymentId: string, subscriptionId: string): string =>
  hmacSha256Hex(KEY_SECRET, `${paymentId}|${subscriptionId}`);

const postWebhook = async (baseUrl: string, payload: Record<string, unknown>, secret = WEBHOOK_SECRET) => {
  const raw = JSON.stringify(payload);
  const response = await fetch(`${baseUrl}/api/v1/billing/webhook/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': hmacSha256Hex(secret, raw),
    },
    body: raw,
  });
  return { response, body: await json(response), raw };
};

before(() => {
  resetAll();
});

test('FREE to PRO via subscribe + verified payment', async () => {
  resetAll();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const { token } = await register(baseUrl, 'pro@example.com');
    const subscribed = await authJson(baseUrl, '/api/v1/billing/subscribe', token, { method: 'POST' });
    assert.equal(subscribed.response.status, 200);
    const data = subscribed.body.data as { subscriptionId: string; keyId: string; plan: string };
    assert.equal(data.plan, 'PRO');
    assert.ok(data.subscriptionId);
    assert.ok(data.keyId);
    assert.equal((subscribed.body.data as { secret?: string }).secret, undefined);

    const paymentId = 'pay_test_1';
    const verified = await authJson(baseUrl, '/api/v1/billing/verify', token, {
      method: 'POST',
      body: {
        razorpay_payment_id: paymentId,
        razorpay_subscription_id: data.subscriptionId,
        razorpay_signature: signCheckout(paymentId, data.subscriptionId),
      },
    });
    assert.equal(verified.response.status, 200);
    const billing = verified.body.data as { plan: string; status: string };
    assert.equal(billing.plan, 'PRO');
    assert.equal(billing.status, 'ACTIVE');

    const status = await authJson(baseUrl, '/api/v1/billing', token);
    assert.equal((status.body.data as { plan: string }).plan, 'PRO');
  });
});

test('already PRO cannot create a duplicate subscription', async () => {
  resetAll();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const { token } = await register(baseUrl, 'dup@example.com');
    const first = await authJson(baseUrl, '/api/v1/billing/subscribe', token, { method: 'POST' });
    const subId = (first.body.data as { subscriptionId: string }).subscriptionId;
    await authJson(baseUrl, '/api/v1/billing/verify', token, {
      method: 'POST',
      body: {
        razorpay_payment_id: 'pay_dup',
        razorpay_subscription_id: subId,
        razorpay_signature: signCheckout('pay_dup', subId),
      },
    });
    const second = await authJson(baseUrl, '/api/v1/billing/subscribe', token, { method: 'POST' });
    assert.equal(second.response.status, 409);
    assert.equal((second.body.error as { code: string }).code, 'ALREADY_PRO');
  });
});

test('invalid payment signature is rejected', async () => {
  resetAll();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const { token } = await register(baseUrl, 'badpay@example.com');
    const subscribed = await authJson(baseUrl, '/api/v1/billing/subscribe', token, { method: 'POST' });
    const subId = (subscribed.body.data as { subscriptionId: string }).subscriptionId;
    const verified = await authJson(baseUrl, '/api/v1/billing/verify', token, {
      method: 'POST',
      body: {
        razorpay_payment_id: 'pay_x',
        razorpay_subscription_id: subId,
        razorpay_signature: 'not-a-real-signature',
      },
    });
    assert.equal(verified.response.status, 400);
    assert.equal((verified.body.error as { code: string }).code, 'PAYMENT_VERIFICATION_FAILED');
  });
});

test('webhook signature invalid, duplicate, unknown, and lifecycle events', async () => {
  resetAll();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const { token, user } = await register(baseUrl, 'hook@example.com');
    const subscribed = await authJson(baseUrl, '/api/v1/billing/subscribe', token, { method: 'POST' });
    const subId = (subscribed.body.data as { subscriptionId: string }).subscriptionId;
    const start = Math.floor(Date.now() / 1000);
    const end = start + 30 * 24 * 60 * 60;

    const invalid = await fetch(`${baseUrl}/api/v1/billing/webhook/razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': 'nope' },
      body: '{"event":"subscription.activated"}',
    });
    const invalidBody = await json(invalid);
    assert.equal(invalid.status, 400);
    assert.equal((invalidBody.error as { code: string }).code, 'WEBHOOK_SIGNATURE_INVALID');

    const activatedPayload = {
      event: 'subscription.activated',
      created_at: start,
      payload: {
        subscription: {
          entity: {
            id: subId,
            status: 'active',
            plan_id: 'plan_test_pro',
            customer_id: 'cust_mock_1',
            current_start: start,
            current_end: end,
            notes: { userId: user.id },
          },
        },
      },
    };
    const first = await postWebhook(baseUrl, activatedPayload);
    assert.equal(first.response.status, 200);
    const billing = await authJson(baseUrl, '/api/v1/billing', token);
    assert.equal((billing.body.data as { plan: string; status: string }).plan, 'PRO');
    assert.equal((billing.body.data as { status: string }).status, 'ACTIVE');

    const duplicate = await postWebhook(baseUrl, activatedPayload);
    assert.equal(duplicate.response.status, 200);
    assert.equal((duplicate.body.data as { duplicate: boolean }).duplicate, true);

    const unknown = await postWebhook(baseUrl, { event: 'something.else', created_at: start + 1 });
    assert.equal(unknown.response.status, 200);

    await postWebhook(baseUrl, {
      event: 'subscription.charged',
      created_at: start + 2,
      payload: {
        subscription: {
          entity: {
            id: subId,
            status: 'active',
            current_start: start,
            current_end: end + 86400,
            notes: { userId: user.id },
          },
        },
        payment: {
          entity: {
            id: 'pay_renew',
            amount: 49900,
            currency: 'INR',
            status: 'captured',
            captured: true,
            method: 'card',
            created_at: start + 2,
          },
        },
      },
    });
    const afterCharge = await authJson(baseUrl, '/api/v1/billing', token);
    assert.equal((afterCharge.body.data as { status: string }).status, 'ACTIVE');

    await postWebhook(baseUrl, {
      event: 'payment.captured',
      created_at: start + 3,
      payload: {
        payment: {
          entity: {
            id: 'pay_cap',
            amount: 49900,
            currency: 'INR',
            status: 'captured',
            captured: true,
            created_at: start + 3,
          },
        },
        subscription: {
          entity: { id: subId, status: 'active', notes: { userId: user.id } },
        },
      },
    });

    await postWebhook(baseUrl, {
      event: 'payment.failed',
      created_at: start + 4,
      payload: {
        subscription: {
          entity: { id: subId, status: 'pending', current_end: end, notes: { userId: user.id } },
        },
        payment: {
          entity: { id: 'pay_fail', amount: 49900, status: 'failed', created_at: start + 4 },
        },
      },
    });
    const pastDue = await authJson(baseUrl, '/api/v1/billing', token);
    assert.equal((pastDue.body.data as { status: string }).status, 'PAST_DUE');
    assert.equal((pastDue.body.data as { plan: string }).plan, 'PRO');

    await postWebhook(baseUrl, {
      event: 'subscription.cancelled',
      created_at: start + 5,
      payload: {
        subscription: {
          entity: {
            id: subId,
            status: 'cancelled',
            current_end: end,
            ended_at: end,
            notes: { userId: user.id },
          },
        },
      },
    });
    const cancelled = await authJson(baseUrl, '/api/v1/billing', token);
    assert.equal((cancelled.body.data as { status: string }).status, 'CANCELLED');

    await postWebhook(baseUrl, {
      event: 'subscription.completed',
      created_at: start + 6,
      payload: {
        subscription: {
          entity: {
            id: subId,
            status: 'completed',
            current_end: start - 10,
            ended_at: start - 10,
            notes: { userId: user.id },
          },
        },
      },
    });
    const expired = await authJson(baseUrl, '/api/v1/billing', token);
    assert.equal((expired.body.data as { plan: string }).plan, 'FREE');
  });
});

test('cancel at period end keeps PRO until currentPeriodEnd', async () => {
  resetAll();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const { token } = await register(baseUrl, 'cancel@example.com');
    const subscribed = await authJson(baseUrl, '/api/v1/billing/subscribe', token, { method: 'POST' });
    const subId = (subscribed.body.data as { subscriptionId: string }).subscriptionId;
    await authJson(baseUrl, '/api/v1/billing/verify', token, {
      method: 'POST',
      body: {
        razorpay_payment_id: 'pay_c',
        razorpay_subscription_id: subId,
        razorpay_signature: signCheckout('pay_c', subId),
      },
    });

    const cancelled = await authJson(baseUrl, '/api/v1/billing/cancel', token, { method: 'POST', body: {} });
    assert.equal(cancelled.response.status, 200);
    const data = cancelled.body.data as {
      plan: string;
      status: string;
      cancelAtPeriodEnd: boolean;
    };
    assert.equal(data.plan, 'PRO');
    assert.equal(data.cancelAtPeriodEnd, true);

    const user = memoryStore.findUserByEmail('cancel@example.com')!;
    const sub = memoryStore.getLatestSubscription(user.id)!;
    memoryStore.updateSubscription(sub.id, {
      status: 'CANCELLED',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() - 1000),
    });
    const me = await authJson(baseUrl, '/api/v1/auth/me', token);
    assert.equal((me.body.data as { user: { plan: string } }).user.plan, 'FREE');
  });
});

test('billing queries are scoped to the authenticated user', async () => {
  resetAll();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const a = await register(baseUrl, 'owner@example.com', 'A');
    const b = await register(baseUrl, 'other@example.com', 'B');
    const subscribed = await authJson(baseUrl, '/api/v1/billing/subscribe', a.token, { method: 'POST' });
    const subId = (subscribed.body.data as { subscriptionId: string }).subscriptionId;
    await authJson(baseUrl, '/api/v1/billing/verify', a.token, {
      method: 'POST',
      body: {
        razorpay_payment_id: 'pay_a',
        razorpay_subscription_id: subId,
        razorpay_signature: signCheckout('pay_a', subId),
      },
    });

    const bStatus = await authJson(baseUrl, '/api/v1/billing', b.token);
    assert.equal((bStatus.body.data as { plan: string }).plan, 'FREE');

    const bPayments = await authJson(baseUrl, '/api/v1/billing/payments', b.token);
    assert.equal(((bPayments.body.data as { payments: unknown[] }).payments).length, 0);

    const bCancel = await authJson(baseUrl, '/api/v1/billing/cancel', b.token, { method: 'POST', body: {} });
    assert.equal(bCancel.response.status, 400);

    const bVerify = await authJson(baseUrl, '/api/v1/billing/verify', b.token, {
      method: 'POST',
      body: {
        razorpay_payment_id: 'pay_a',
        razorpay_subscription_id: subId,
        razorpay_signature: signCheckout('pay_a', subId),
      },
    });
    assert.notEqual(bVerify.response.status, 200);

    const aPayments = await authJson(baseUrl, '/api/v1/billing/payments', a.token);
    assert.ok(((aPayments.body.data as { payments: unknown[] }).payments).length >= 1);
  });
});

test('PRO users bypass generation limits; expired users do not', async () => {
  resetAll();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const { token } = await register(baseUrl, 'limitpro@example.com');
    const subscribed = await authJson(baseUrl, '/api/v1/billing/subscribe', token, { method: 'POST' });
    const subId = (subscribed.body.data as { subscriptionId: string }).subscriptionId;
    await authJson(baseUrl, '/api/v1/billing/verify', token, {
      method: 'POST',
      body: {
        razorpay_payment_id: 'pay_lim',
        razorpay_subscription_id: subId,
        razorpay_signature: signCheckout('pay_lim', subId),
      },
    });

    const user = memoryStore.findUserByEmail('limitpro@example.com')!;
    const { currentUsagePeriod } = await import('@apicaptain/config');
    const period = currentUsagePeriod();
    const usage = memoryStore.getOrCreateUsage(user.id, period);
    memoryStore.usage.set(`${user.id}:${period}`, { ...usage, generationCount: 50 });

    const allowed = await fetch(`${baseUrl}/api/v1/generate/api-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        method: 'POST',
        endpoint: '/api/login',
        framework: 'react-native',
        library: 'axios',
        requestJson: { email: 'a' },
        responseJson: { token: 'b' },
      }),
    });
    assert.equal(allowed.status, 200);

    const sub = memoryStore.getLatestSubscription(user.id)!;
    memoryStore.updateSubscription(sub.id, {
      status: 'EXPIRED',
      plan: 'FREE',
      currentPeriodEnd: new Date(Date.now() - 1000),
      cancelAtPeriodEnd: false,
    });
    memoryStore.updateUser(user.id, { plan: 'FREE' });

    const blocked = await fetch(`${baseUrl}/api/v1/generate/api-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        method: 'POST',
        endpoint: '/api/login',
        framework: 'react-native',
        library: 'axios',
        requestJson: { email: 'a' },
        responseJson: { token: 'b' },
      }),
    });
    const blockedBody = await json(blocked);
    assert.equal(blocked.status, 403);
    assert.equal((blockedBody.error as { code: string }).code, 'USAGE_LIMIT_REACHED');
  });
});

test('unauthenticated billing routes are protected', async () => {
  resetAll();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/billing`);
    assert.equal(response.status, 401);
  });
});
