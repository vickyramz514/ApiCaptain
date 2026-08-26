import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Express } from 'express';
import { createApp } from '../app.js';

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

test('GET /health returns success message', async () => {
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = (await response.json()) as { success: boolean; message: string };
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.match(body.message, /ApiCaptain API is running/);
  });
});

test('POST /api/v1/generate/typescript happy path', async () => {
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/generate/typescript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: {
          id: 1,
          name: 'John',
          profile: { city: 'Chennai' },
          tags: ['react', 'react-native'],
        },
        rootName: 'User',
        outputType: 'interface',
        optionalProperties: false,
        exportTypes: true,
        useSemicolon: true,
      }),
    });

    const body = (await response.json()) as {
      success: boolean;
      data: { code: string };
    };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.match(body.data.code, /export interface User/);
    assert.match(body.data.code, /profile: Profile;/);
    assert.match(body.data.code, /tags: string\[\];/);
  });
});

test('POST /api/v1/generate/typescript missing json field', async () => {
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/generate/typescript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rootName: 'User' }),
    });
    const body = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'MISSING_FIELD');
  });
});

test('POST /api/v1/generate/typescript invalid options', async () => {
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/generate/typescript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: { id: 1 },
        outputType: 'zod',
      }),
    });
    const body = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'INVALID_OPTIONS');
  });
});

test('POST /api/v1/generate/typescript rejects empty body object without json', async () => {
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/generate/typescript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = (await response.json()) as { success: boolean; error: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'MISSING_FIELD');
  });
});

test('POST /api/v1/generate/api-code axios login flow', async () => {
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/generate/api-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST',
        endpoint: '/api/login',
        framework: 'react-native',
        library: 'axios',
        requestJson: { email: 'john@test.com', password: '123456' },
        responseJson: {
          token: 'abc123',
          user: { id: 1, name: 'John', email: 'john@test.com' },
        },
      }),
    });

    const body = (await response.json()) as {
      success: boolean;
      data: { files: Array<{ filename: string; content: string }> };
    };

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.files[0]?.filename, 'login.types.ts');
    assert.equal(body.data.files[1]?.filename, 'login.api.ts');
    assert.match(body.data.files[0]!.content, /LoginRequest/);
    assert.match(body.data.files[1]!.content, /axios\.post/);
  });
});

test('POST /api/v1/generate/api-code rejects invalid method', async () => {
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/generate/api-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'OPTIONS',
        endpoint: '/api/login',
        framework: 'react-native',
        library: 'axios',
        responseJson: { ok: true },
      }),
    });
    const body = (await response.json()) as { success: boolean; error: { code: string } };
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'INVALID_METHOD');
  });
});

test('POST /api/v1/generate/api-code requires requestJson for POST', async () => {
  const app = createApp();
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/generate/api-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST',
        endpoint: '/api/login',
        framework: 'react-native',
        library: 'fetch',
        responseJson: { token: 'x' },
      }),
    });
    const body = (await response.json()) as { success: boolean; error: { code: string } };
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'MISSING_REQUEST_BODY');
  });
});
