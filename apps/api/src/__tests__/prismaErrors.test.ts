import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prismaErrorToAppError } from '../utils/prismaErrors.js';

test('maps Prisma connection failures to 503', () => {
  const mapped = prismaErrorToAppError({
    name: 'PrismaClientInitializationError',
    message: "Can't reach database server at `altaria.proxy.rlwy.net:50575`",
  });
  assert.ok(mapped);
  assert.equal(mapped.statusCode, 503);
  assert.equal(mapped.code, 'DATABASE_UNAVAILABLE');
});

test('maps missing-column errors to schema mismatch', () => {
  const mapped = prismaErrorToAppError({
    code: 'P2022',
    message: 'The column `users.googleSub` does not exist in the current database.',
  });
  assert.ok(mapped);
  assert.equal(mapped.code, 'DATABASE_SCHEMA_MISMATCH');
});

test('ignores unrelated errors', () => {
  assert.equal(prismaErrorToAppError(new Error('boom')), null);
  assert.equal(prismaErrorToAppError('nope'), null);
});
