import type { GenerateTypeScriptRequest, TypeScriptOutputKind } from '@apicaptain/types';
import { AppError } from '../utils/errors.js';

const OUTPUT_TYPES = new Set<TypeScriptOutputKind>(['interface', 'type']);

export const validateGenerateTypeScriptRequest = (
  body: unknown,
): GenerateTypeScriptRequest => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('INVALID_REQUEST', 'Request body must be a JSON object');
  }

  const payload = body as Record<string, unknown>;

  if (!('json' in payload)) {
    throw new AppError('MISSING_FIELD', 'Field "json" is required');
  }

  if (payload.json === undefined) {
    throw new AppError('INVALID_JSON', 'Invalid JSON input');
  }

  // Reject non-JSON values (functions, undefined nested, bigint, etc. already lost via express.json)
  const json = payload.json;
  if (typeof json === 'function' || typeof json === 'symbol') {
    throw new AppError('INVALID_JSON', 'Invalid JSON input');
  }

  if (payload.rootName !== undefined) {
    if (typeof payload.rootName !== 'string' || !payload.rootName.trim()) {
      throw new AppError('INVALID_OPTIONS', 'rootName must be a non-empty string');
    }
  }

  if (payload.outputType !== undefined) {
    if (typeof payload.outputType !== 'string' || !OUTPUT_TYPES.has(payload.outputType as TypeScriptOutputKind)) {
      throw new AppError('INVALID_OPTIONS', 'outputType must be "interface" or "type"');
    }
  }

  for (const flag of ['optionalProperties', 'useSemicolon', 'exportTypes'] as const) {
    if (payload[flag] !== undefined && typeof payload[flag] !== 'boolean') {
      throw new AppError('INVALID_OPTIONS', `${flag} must be a boolean`);
    }
  }

  return {
    json,
    rootName: typeof payload.rootName === 'string' ? payload.rootName : undefined,
    outputType: payload.outputType as TypeScriptOutputKind | undefined,
    optionalProperties: payload.optionalProperties as boolean | undefined,
    useSemicolon: payload.useSemicolon as boolean | undefined,
    exportTypes: payload.exportTypes as boolean | undefined,
  };
};
