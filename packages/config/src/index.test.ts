import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canUseFeature,
  currentUsagePeriod,
  getApiConfig,
  getPlanLimits,
  getWebConfig,
  isUnlimitedGenerations,
  PLAN_LIMITS,
  PRICING_PLANS,
} from './index.js';

test('getApiConfig applies defaults', () => {
  const config = getApiConfig({});
  assert.equal(config.port, 4000);
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.rateLimitMax, 60);
  assert.ok(config.authSecret);
});

test('getWebConfig reads NEXT_PUBLIC_API_URL', () => {
  const config = getWebConfig({ NEXT_PUBLIC_API_URL: 'https://api.example.com' });
  assert.equal(config.apiUrl, 'https://api.example.com');
});

test('plan limits and entitlements', () => {
  assert.equal(getPlanLimits('FREE').generationsPerMonth, 50);
  assert.equal(getPlanLimits('FREE').projects, 5);
  assert.equal(PLAN_LIMITS.PRO.generationsPerMonth, null);
  assert.equal(canUseFeature('PRO', 'unlimitedGenerations'), true);
  assert.equal(canUseFeature('FREE', 'unlimitedGenerations'), false);
  assert.equal(isUnlimitedGenerations('PRO'), true);
  assert.equal(isUnlimitedGenerations('FREE'), false);
  assert.ok(PRICING_PLANS.some((plan) => plan.id === 'PRO' && plan.priceMonthlyInr === 499));
});

test('currentUsagePeriod format', () => {
  assert.match(currentUsagePeriod(new Date('2026-08-15T00:00:00Z')), /^2026-08$/);
});
