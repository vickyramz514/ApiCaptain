import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hmacSha256Hex } from '../crypto.js';
import { parseRazorpayWebhook, verifyRazorpayWebhookSignature } from '../providers/razorpay/webhooks.js';
import { mapRazorpaySubscriptionStatus } from '../providers/razorpay/map.js';

const secret = 'whsec_test';

const sign = (body: string): string => hmacSha256Hex(secret, body);

test('valid webhook parses event id and entities', () => {
  const body = JSON.stringify({
    event: 'subscription.activated',
    created_at: 1777200000,
    payload: {
      subscription: {
        entity: {
          id: 'sub_1',
          status: 'active',
          plan_id: 'plan_test_pro',
          customer_id: 'cust_1',
          current_start: 1777200000,
          current_end: 1779878400,
        },
      },
    },
  });
  const envelope = parseRazorpayWebhook(body);
  assert.equal(envelope.eventType, 'subscription.activated');
  assert.equal(envelope.subscription?.id, 'sub_1');
  assert.equal(envelope.eventId, 'subscription.activated:sub_1::1777200000');
  assert.equal(verifyRazorpayWebhookSignature(secret, body, sign(body)), true);
});

test('invalid webhook signature is rejected', () => {
  const body = '{"event":"subscription.charged"}';
  assert.equal(verifyRazorpayWebhookSignature(secret, body, 'deadbeef'), false);
});

test('duplicate payload yields the same event id', () => {
  const body = JSON.stringify({
    event: 'payment.captured',
    created_at: 10,
    payload: { payment: { entity: { id: 'pay_1', amount: 49900, status: 'captured' } } },
  });
  assert.equal(parseRazorpayWebhook(body).eventId, parseRazorpayWebhook(body).eventId);
});

test('unknown event still parses', () => {
  const envelope = parseRazorpayWebhook('{"event":"something.else","created_at":1}');
  assert.equal(envelope.eventType, 'something.else');
});

test('maps Razorpay subscription statuses', () => {
  assert.equal(mapRazorpaySubscriptionStatus('active'), 'ACTIVE');
  assert.equal(mapRazorpaySubscriptionStatus('pending'), 'PAST_DUE');
  assert.equal(mapRazorpaySubscriptionStatus('cancelled'), 'CANCELLED');
  assert.equal(mapRazorpaySubscriptionStatus('completed'), 'EXPIRED');
  assert.equal(mapRazorpaySubscriptionStatus('expired'), 'EXPIRED');
});
