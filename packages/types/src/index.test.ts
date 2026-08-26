import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HealthResponse } from './index.js';

test('HealthResponse shape is assignable', () => {
  const payload: HealthResponse = {
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
    version: '0.0.0',
  };

  assert.equal(payload.status, 'ok');
});
