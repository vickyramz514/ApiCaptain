import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateApiCode } from './generator.js';
import { endpointBaseName, deriveFunctionName } from './naming.js';

test('endpointBaseName extracts last segment', () => {
  assert.equal(endpointBaseName('/api/login'), 'login');
  assert.equal(endpointBaseName('/api/users'), 'users');
  assert.equal(endpointBaseName('api/v1/orders/'), 'orders');
});

test('deriveFunctionName for login POST', () => {
  assert.equal(deriveFunctionName('POST', '/api/login'), 'login');
});

test('axios generation produces types + api files', () => {
  const result = generateApiCode({
    method: 'POST',
    endpoint: '/api/login',
    framework: 'react-native',
    library: 'axios',
    requestJson: {
      email: 'john@test.com',
      password: '123456',
    },
    responseJson: {
      token: 'abc123',
      user: {
        id: 1,
        name: 'John',
        email: 'john@test.com',
      },
    },
  });

  assert.equal(result.files.length, 2);
  assert.equal(result.files[0]?.filename, 'login.types.ts');
  assert.equal(result.files[1]?.filename, 'login.api.ts');
  assert.match(result.files[0]!.content, /export interface LoginRequest/);
  assert.match(result.files[0]!.content, /export interface LoginResponse/);
  assert.match(result.files[0]!.content, /export interface User/);
  assert.match(result.files[1]!.content, /import axios from 'axios'/);
  assert.match(result.files[1]!.content, /export async function login/);
  assert.match(result.files[1]!.content, /axios\.post/);
});

test('fetch generation for GET without body', () => {
  const result = generateApiCode({
    method: 'GET',
    endpoint: '/api/users',
    framework: 'react-native',
    library: 'fetch',
    requestJson: null,
    responseJson: {
      users: [{ id: 1, name: 'Ada' }],
    },
  });

  assert.equal(result.meta.requestTypeName, null);
  assert.match(result.files[1]!.content, /method: 'GET'/);
  assert.doesNotMatch(result.files[1]!.content, /payload/);
  assert.match(result.files[1]!.content, /export async function getUsers/);
});

test('deterministic api code output', () => {
  const input = {
    method: 'POST' as const,
    endpoint: '/api/login',
    framework: 'react-native' as const,
    library: 'axios' as const,
    requestJson: { email: 'a', password: 'b' },
    responseJson: { token: 't' },
  };
  const a = generateApiCode(input);
  const b = generateApiCode(input);
  assert.deepEqual(a, b);
});
