import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parseAndNormalizeOpenApi } from '@apicaptain/openapi';
import { generateFromOpenApi } from './generateFromOpenApi.js';

const fixture = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../openapi/src/__tests__/fixtures/example-api.yaml',
  ),
  'utf8',
);

const { specification } = parseAndNormalizeOpenApi(fixture);

const frameworks = [
  { framework: 'react-native' as const, library: 'axios' as const },
  { framework: 'react-native' as const, library: 'fetch' as const },
  { framework: 'flutter' as const },
  { framework: 'swiftui' as const },
  { framework: 'android' as const },
  { framework: 'python' as const },
];

for (const target of frameworks) {
  test(`OpenAPI generate ${target.framework} ${target.library ?? ''}`.trim(), () => {
    const result = generateFromOpenApi({
      specification,
      endpointIds: 'all',
      framework: target.framework,
      library: target.library,
    });

    assert.ok(result.files.length >= 2);
    assert.equal(result.meta.endpointCount, specification.endpointCount);
    assert.ok(result.files.every((file) => file.filename && file.content.length > 0));
    assert.ok(result.files.every((file) => !file.filename.includes('..')));

    const joined = result.files.map((f) => f.content).join('\n');
    assert.match(joined, /login|getUsers|createUser|listOrders/i);

    if (target.framework === 'react-native' && target.library === 'axios') {
      assert.ok(result.files.some((f) => f.filename.endsWith('client.ts')));
      assert.ok(result.files.some((f) => f.filename.includes('auth')));
      assert.ok(result.files.some((f) => f.filename.includes('users')));
      assert.match(joined, /apiClient/);
      assert.match(joined, /getUserById/);
    }

    if (target.framework === 'android') {
      assert.match(joined, /@GET|@POST|@Path|@Query/);
    }

    if (target.framework === 'python') {
      assert.match(joined, /httpx/);
    }

    if (target.framework === 'flutter') {
      assert.match(joined, /Dio|dio/);
    }
  });
}

test('OpenAPI generate selected endpoints only', () => {
  const result = generateFromOpenApi({
    specification,
    endpointIds: ['POST:/auth/login', 'GET:/users/{id}'],
    framework: 'react-native',
    library: 'axios',
  });
  assert.equal(result.meta.endpointCount, 2);
  const joined = result.files.map((f) => f.content).join('\n');
  assert.match(joined, /login/);
  assert.match(joined, /getUserById/);
});
