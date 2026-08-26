import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getApiConfig, getWebConfig } from './index.js';

test('getApiConfig applies defaults', () => {
  const config = getApiConfig({});
  assert.equal(config.port, 4000);
  assert.equal(config.host, '0.0.0.0');
});

test('getWebConfig reads NEXT_PUBLIC_API_URL', () => {
  const config = getWebConfig({ NEXT_PUBLIC_API_URL: 'https://api.example.com' });
  assert.equal(config.apiUrl, 'https://api.example.com');
});
