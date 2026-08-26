import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateFromJson } from './index.js';

test('generateFromJson creates a TypeScript interface', () => {
  const result = generateFromJson({
    target: 'typescript',
    document: {
      name: 'user',
      schema: {
        properties: {
          id: { type: 'string' },
          age: { type: 'number' },
        },
      },
    },
  });

  assert.equal(result.filename, 'user.ts');
  assert.match(result.content, /export interface User/);
  assert.match(result.content, /id: string;/);
});
