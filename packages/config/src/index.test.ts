import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canUseFeature,
  currentUsagePeriod,
  getApiConfig,
  getBillingConfig,
  getEffectivePlan,
  getPlanLimits,
  getWebConfig,
  hasActiveEntitlement,
  inrToPaise,
  isUnlimitedGenerations,
  PLAN_LIMITS,
  PRICING_PLANS,
  PRO_MONTHLY_AMOUNT_PAISE,
  PRO_MONTHLY_PRICE_INR,
} from './index.js';

test('getApiConfig applies defaults', () => {
  const config = getApiConfig({});
  assert.equal(config.port, 4000);
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.rateLimitMax, 60);
  assert.ok(config.authSecret);
  assert.equal(config.googleClientId, '');
});

test('getWebConfig reads NEXT_PUBLIC_API_URL', () => {
  const config = getWebConfig({ NEXT_PUBLIC_API_URL: 'https://api.example.com' });
  assert.equal(config.apiUrl, 'https://api.example.com');
});

test('getWebConfig reads Google client id', () => {
  const config = getWebConfig({
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: '343746941144-example.apps.googleusercontent.com',
  });
  assert.equal(config.googleClientId, '343746941144-example.apps.googleusercontent.com');
});

test('plan limits and entitlements', () => {
  assert.equal(getPlanLimits('FREE').generationsPerMonth, 50);
  assert.equal(getPlanLimits('FREE').projects, 5);
  assert.equal(PLAN_LIMITS.PRO.generationsPerMonth, null);
  assert.equal(canUseFeature('PRO', 'unlimitedGenerations'), true);
  assert.equal(canUseFeature('FREE', 'unlimitedGenerations'), false);
  assert.equal(isUnlimitedGenerations('PRO'), true);
  assert.equal(isUnlimitedGenerations('FREE'), false);
  assert.ok(
    PRICING_PLANS.some(
      (plan) =>
        plan.id === 'PRO' &&
        plan.priceMonthlyInr === PRO_MONTHLY_PRICE_INR &&
        plan.ctaMode === 'upgrade',
    ),
  );
  assert.equal(PRO_MONTHLY_PRICE_INR, 499);
  assert.equal(inrToPaise(PRO_MONTHLY_PRICE_INR), PRO_MONTHLY_AMOUNT_PAISE);
  assert.equal(PRO_MONTHLY_AMOUNT_PAISE, 49900);
});

test('effective plan from subscription status', () => {
  const future = new Date('2026-09-27T00:00:00Z');
  const past = new Date('2026-07-01T00:00:00Z');
  const now = new Date('2026-08-27T00:00:00Z');

  assert.equal(getEffectivePlan(null, now), 'FREE');
  assert.equal(getEffectivePlan({ status: 'ACTIVE', currentPeriodEnd: future }, now), 'PRO');
  assert.equal(getEffectivePlan({ status: 'PAST_DUE', currentPeriodEnd: future }, now), 'PRO');
  assert.equal(
    getEffectivePlan({ status: 'CANCELLED', currentPeriodEnd: future, cancelAtPeriodEnd: true }, now),
    'PRO',
  );
  assert.equal(getEffectivePlan({ status: 'CANCELLED', currentPeriodEnd: past }, now), 'FREE');
  assert.equal(getEffectivePlan({ status: 'EXPIRED', currentPeriodEnd: past }, now), 'FREE');
  assert.equal(hasActiveEntitlement({ status: 'INACTIVE' }, now), false);
});

test('getBillingConfig defaults to mock in test', () => {
  const config = getBillingConfig({ NODE_ENV: 'test' });
  assert.equal(config.billingProvider, 'mock');
  assert.equal(getBillingConfig({ NODE_ENV: 'production' }).billingProvider, 'razorpay');
});

test('currentUsagePeriod format', () => {
  assert.match(currentUsagePeriod(new Date('2026-08-15T00:00:00Z')), /^2026-08$/);
});
