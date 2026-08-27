import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { memoryStore } from '../db/memoryStore.js';

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

before(() => {
  memoryStore.reset();
});

test('auth register login me logout', async () => {
  memoryStore.reset();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const register = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'vicky@example.com',
        password: 'Secret123',
        name: 'Vicky',
      }),
    });
    const registerBody = await json(register);
    assert.equal(register.status, 201);
    assert.equal((registerBody.data as { user: { email: string } }).user.email, 'vicky@example.com');
    const token = (registerBody.data as { token: string }).token;
    assert.ok(token);

    const me = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meBody = await json(me);
    assert.equal(me.status, 200);
    assert.equal((meBody.data as { user: { plan: string } }).user.plan, 'FREE');

    const logout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logout.status, 200);

    const meAfter = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(meAfter.status, 401);
  });
});

test('duplicate email and invalid credentials', async () => {
  memoryStore.reset();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dup@example.com', password: 'Secret123' }),
    });
    const dup = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dup@example.com', password: 'Secret123' }),
    });
    assert.equal(dup.status, 409);

    const bad = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dup@example.com', password: 'Wrong1234' }),
    });
    assert.equal(bad.status, 401);
  });
});

test('projects CRUD and IDOR protection', async () => {
  memoryStore.reset();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const a = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'Secret123', name: 'A' }),
    });
    const b = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'b@example.com', password: 'Secret123', name: 'B' }),
    });
    const tokenA = ((await json(a)).data as { token: string }).token;
    const tokenB = ((await json(b)).data as { token: string }).token;

    const created = await fetch(`${baseUrl}/api/v1/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        name: 'Login API',
        sourceType: 'API',
        framework: 'react-native',
        library: 'axios',
        sourceMeta: {
          method: 'POST',
          endpoint: '/api/login',
          requestJson: { email: 'x' },
          responseJson: { token: 'y' },
        },
      }),
    });
    assert.equal(created.status, 201);
    const projectId = ((await json(created)).data as { id: string }).id;

    const forbidden = await fetch(`${baseUrl}/api/v1/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(forbidden.status, 404);

    const listed = await fetch(`${baseUrl}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listedBody = await json(listed);
    assert.equal(((listedBody.data as { projects: unknown[] }).projects).length, 1);

    const deleted = await fetch(`${baseUrl}/api/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(deleted.status, 404);
  });
});

test('usage limit blocks free user after successful generations', async () => {
  memoryStore.reset();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const register = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'limit@example.com', password: 'Secret123' }),
    });
    const token = ((await json(register)).data as { token: string }).token;
    const user = memoryStore.findUserByEmail('limit@example.com')!;
    memoryStore.incrementUsage(user.id, '2099-01');
    // Force period by directly setting count high for current period
    const { currentUsagePeriod } = await import('@apicaptain/config');
    const period = currentUsagePeriod();
    const usage = memoryStore.getOrCreateUsage(user.id, period);
    memoryStore.usage.set(`${user.id}:${period}`, { ...usage, generationCount: 50 });

    const response = await fetch(`${baseUrl}/api/v1/generate/api-code`, {
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
    const body = await json(response);
    assert.equal(response.status, 403);
    assert.equal((body.error as { code: string }).code, 'USAGE_LIMIT_REACHED');
  });
});

test('password reset flow', async () => {
  memoryStore.reset();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset@example.com', password: 'Secret123' }),
    });

    await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset@example.com' }),
    });

    const reset = [...memoryStore.resets.values()][0];
    assert.ok(reset);

    // Recover raw token by creating a known one
    const { createOpaqueToken, hashToken, hashPassword } = await import('../auth/crypto.js');
    const raw = createOpaqueToken();
    memoryStore.createResetToken({
      userId: memoryStore.findUserByEmail('reset@example.com')!.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const ok = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: raw, password: 'NewSecret1' }),
    });
    assert.equal(ok.status, 200);

    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset@example.com', password: 'NewSecret1' }),
    });
    assert.equal(login.status, 200);
    void hashPassword;
  });
});

test('account deletion requires confirmation', async () => {
  memoryStore.reset();
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const register = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gone@example.com', password: 'Secret123' }),
    });
    const token = ((await json(register)).data as { token: string }).token;

    const bad = await fetch(`${baseUrl}/api/v1/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirmation: 'NOPE', password: 'Secret123' }),
    });
    assert.equal(bad.status, 400);

    const ok = await fetch(`${baseUrl}/api/v1/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirmation: 'DELETE', password: 'Secret123' }),
    });
    assert.equal(ok.status, 200);
    assert.equal(memoryStore.findUserByEmail('gone@example.com'), null);
  });
});
