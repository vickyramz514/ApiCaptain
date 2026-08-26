import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GenerateTypeScriptRequest, ApiSuccessResponse } from './index.js';

test('GenerateTypeScriptRequest is assignable', () => {
  const request: GenerateTypeScriptRequest = {
    json: { id: 1 },
    rootName: 'User',
    outputType: 'interface',
    optionalProperties: false,
    useSemicolon: true,
    exportTypes: true,
  };

  assert.equal(request.rootName, 'User');
});

test('ApiSuccessResponse envelope shape', () => {
  const response: ApiSuccessResponse<{ code: string }> = {
    success: true,
    data: { code: 'export interface User {}' },
  };

  assert.equal(response.success, true);
});
