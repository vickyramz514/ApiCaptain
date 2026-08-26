import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateApiCodeForFramework } from './registry.js';

const loginPayload = {
  method: 'POST' as const,
  endpoint: '/api/login',
  requestJson: { email: 'john@test.com', password: '123456' },
  responseJson: {
    token: 'abc123',
    user: { id: 1, name: 'John', email: 'john@test.com' },
  },
  rootName: 'Login',
};

test('flutter/dart generation', () => {
  const result = generateApiCodeForFramework({
    ...loginPayload,
    framework: 'flutter',
  });
  assert.equal(result.files[0]?.language, 'dart');
  assert.match(result.files[0]!.filename, /login_models\.dart/);
  assert.match(result.files[0]!.content, /class LoginResponse/);
  assert.match(result.files[0]!.content, /factory LoginResponse.fromJson/);
  assert.match(result.files[1]!.content, /Future<LoginResponse>/);
});

test('swiftui/swift generation', () => {
  const result = generateApiCodeForFramework({
    ...loginPayload,
    framework: 'swiftui',
  });
  assert.equal(result.files[0]?.language, 'swift');
  assert.match(result.files[0]!.content, /struct LoginResponse: Codable/);
  assert.match(result.files[1]!.content, /URLSession/);
});

test('android/kotlin generation', () => {
  const result = generateApiCodeForFramework({
    ...loginPayload,
    framework: 'android',
  });
  assert.equal(result.files[0]?.language, 'kotlin');
  assert.match(result.files[0]!.content, /data class LoginResponse/);
  assert.match(result.files[1]!.content, /HttpClient/);
});

test('python generation', () => {
  const result = generateApiCodeForFramework({
    ...loginPayload,
    framework: 'python',
  });
  assert.equal(result.files[0]?.language, 'python');
  assert.match(result.files[0]!.content, /class LoginResponse/);
  assert.match(result.files[0]!.content, /def from_dict/);
  assert.match(result.files[1]!.content, /import requests/);
});

test('react-native axios still works', () => {
  const result = generateApiCodeForFramework({
    ...loginPayload,
    framework: 'react-native',
    library: 'axios',
  });
  assert.equal(result.files[0]?.filename, 'login.types.ts');
  assert.match(result.files[1]!.content, /axios\.post/);
});
