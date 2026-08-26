import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { OpenApiError, parseAndNormalizeOpenApi, assertSafePublicUrl } from '../index.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

const readFixture = (name: string): string => readFileSync(join(fixturesDir, name), 'utf8');

test('parses OpenAPI 3.0 YAML example-api', () => {
  const { specification } = parseAndNormalizeOpenApi(readFixture('example-api.yaml'), {
    format: 'yaml',
  });

  assert.equal(specification.title, 'Example Shop API');
  assert.equal(specification.version, '1.0.0');
  assert.equal(specification.baseUrl, 'https://api.example.com/v1');
  assert.ok(specification.endpointCount >= 10);
  assert.ok(specification.endpoints.some((e) => e.operationId === 'login'));
  assert.ok(specification.endpoints.some((e) => e.method === 'GET' && e.path === '/users/{id}'));
  assert.ok(specification.schemas.User);
  assert.ok(specification.authentication.some((a) => a.type === 'http'));
  assert.ok(specification.tags.includes('Auth'));
});

test('parses Swagger 2.0 JSON', () => {
  const { specification } = parseAndNormalizeOpenApi(readFixture('swagger-2.json'), {
    format: 'json',
  });
  assert.equal(specification.openapiVersion, '2.0');
  assert.equal(specification.baseUrl, 'https://petstore.example.com/v2');
  assert.ok(specification.endpoints.some((e) => e.operationId === 'listPets'));
  assert.ok(specification.schemas.Pet);
});

test('parses OpenAPI 3.1 YAML', () => {
  const { specification } = parseAndNormalizeOpenApi(readFixture('openapi-3.1.yaml'));
  assert.ok(specification.openapiVersion.startsWith('3.1'));
  assert.equal(specification.endpoints.length, 1);
});

test('resolves nested $ref and handles circular refs safely', () => {
  const { specification } = parseAndNormalizeOpenApi(readFixture('example-api.yaml'));
  const user = specification.schemas.User;
  assert.ok(user?.properties?.address);
  assert.ok(user?.properties?.company);
  // Company.owner -> User is circular; should not throw
  assert.ok(specification.schemas.Company);
});

test('rejects invalid JSON', () => {
  assert.throws(
    () => parseAndNormalizeOpenApi('{not json', { format: 'json' }),
    (error: unknown) => error instanceof OpenApiError && error.code === 'INVALID_JSON',
  );
});

test('rejects missing references', () => {
  const doc = JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'x', version: '1' },
    paths: {
      '/x': {
        get: {
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Missing' },
                },
              },
            },
          },
        },
      },
    },
  });

  assert.throws(
    () => parseAndNormalizeOpenApi(doc, { format: 'json' }),
    (error: unknown) => error instanceof OpenApiError && error.code === 'UNRESOLVED_REFERENCE',
  );
});

test('SSRF blocks localhost URLs', async () => {
  await assert.rejects(
    () => assertSafePublicUrl('http://127.0.0.1/openapi.yaml'),
    (error: unknown) => error instanceof OpenApiError && error.code === 'SSRF_BLOCKED',
  );
  await assert.rejects(
    () => assertSafePublicUrl('http://localhost/openapi.yaml'),
    (error: unknown) => error instanceof OpenApiError && error.code === 'SSRF_BLOCKED',
  );
  await assert.rejects(
    () => assertSafePublicUrl('file:///etc/passwd'),
    (error: unknown) => error instanceof OpenApiError && error.code === 'INVALID_URL',
  );
});

test('derives operation ids and path params', () => {
  const { specification } = parseAndNormalizeOpenApi(readFixture('example-api.yaml'));
  const getUser = specification.endpoints.find((e) => e.operationId === 'getUserById');
  assert.ok(getUser);
  assert.ok(getUser!.parameters.some((p) => p.in === 'path' && p.name === 'id'));
  const listUsers = specification.endpoints.find((e) => e.operationId === 'getUsers');
  assert.ok(listUsers!.parameters.some((p) => p.in === 'query' && p.name === 'page'));
});
