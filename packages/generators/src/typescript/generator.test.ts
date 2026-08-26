import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateTypeScriptFromJson } from './generator.js';
import { formatPropertyKey } from './identifiers.js';

test('primitives and nested object', () => {
  const code = generateTypeScriptFromJson(
    {
      id: 123,
      name: 'John',
      email: 'john@example.com',
      isActive: true,
      address: { city: 'Chennai', country: 'India' },
      tags: ['developer', 'react-native'],
    },
    { rootName: 'User', outputType: 'interface', exportTypes: true, useSemicolon: true },
  );

  assert.match(code, /export interface User/);
  assert.match(code, /id: number;/);
  assert.match(code, /address: Address;/);
  assert.match(code, /export interface Address/);
  assert.match(code, /tags: string\[\];/);
});

test('arrays of objects', () => {
  const code = generateTypeScriptFromJson(
    { users: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] },
    { rootName: 'Payload' },
  );

  assert.match(code, /users: UsersItem\[\];/);
  assert.match(code, /export interface UsersItem/);
});

test('null values', () => {
  const code = generateTypeScriptFromJson({ value: null }, { rootName: 'Doc' });
  assert.match(code, /value: null;/);
});

test('empty arrays become unknown[]', () => {
  const code = generateTypeScriptFromJson({ items: [] }, { rootName: 'Doc' });
  assert.match(code, /items: unknown\[\];/);
});

test('invalid property names are quoted', () => {
  assert.equal(formatPropertyKey('user-name'), '"user-name"');
  assert.equal(formatPropertyKey('first name'), '"first name"');
  assert.equal(formatPropertyKey('123name'), '"123name"');
  assert.equal(formatPropertyKey('user_id'), 'user_id');

  const code = generateTypeScriptFromJson(
    { 'user-name': 'a', 'first name': 'b', '123name': 'c', user_id: 1 },
    { rootName: 'Doc' },
  );

  assert.match(code, /"user-name": string;/);
  assert.match(code, /"first name": string;/);
  assert.match(code, /"123name": string;/);
  assert.match(code, /user_id: number;/);
});

test('duplicate nested structures reuse one interface', () => {
  const code = generateTypeScriptFromJson(
    {
      left: { x: 1, y: 2 },
      right: { x: 3, y: 4 },
    },
    { rootName: 'Pair' },
  );

  const matches = code.match(/export interface Left/g) ?? [];
  assert.equal(matches.length, 1);
  assert.match(code, /left: Left;/);
  assert.match(code, /right: Left;/);
});

test('optional properties and type output', () => {
  const code = generateTypeScriptFromJson(
    { id: 1, name: 'John' },
    {
      rootName: 'User',
      outputType: 'type',
      optionalProperties: true,
      useSemicolon: false,
      exportTypes: false,
    },
  );

  assert.match(code, /^type User = \{/m);
  assert.match(code, /id\?: number$/m);
  assert.doesNotMatch(code, /export /);
});

test('deterministic output', () => {
  const input = { id: 1, profile: { city: 'Chennai' }, tags: ['react', 'react-native'] };
  const a = generateTypeScriptFromJson(input, { rootName: 'User' });
  const b = generateTypeScriptFromJson(input, { rootName: 'User' });
  assert.equal(a, b);
  assert.match(a, /export interface User/);
  assert.match(a, /profile: Profile;/);
});

test('mixed primitive arrays become unions', () => {
  const code = generateTypeScriptFromJson({ values: [1, 'a', true] }, { rootName: 'Doc' });
  assert.match(code, /values: Array</);
  assert.match(code, /boolean/);
  assert.match(code, /number/);
  assert.match(code, /string/);
});

test('nested arrays', () => {
  const code = generateTypeScriptFromJson({ matrix: [[1, 2], [3, 4]] }, { rootName: 'Doc' });
  assert.match(code, /matrix: number\[\]\[\];/);
});
