import type { ApiFramework, GenerateApiCodeData, GenerateApiCodeRequest } from '@apicaptain/types';
import { generateApiCode as generateReactNativeApiCode } from './api-code/generator.js';
import { dartGenerator } from './dart/index.js';
import { kotlinGenerator } from './kotlin/index.js';
import { pythonGenerator } from './python/index.js';
import {
  deriveFunctionName,
  endpointBaseName,
  normalizeJsonModels,
  toPascalCase,
  type CodeGenerator,
  type NormalizedGenerationInput,
} from './shared/index.js';
import { swiftGenerator } from './swift/index.js';

const LANGUAGE_GENERATORS: Record<Exclude<ApiFramework, 'react-native'>, CodeGenerator> = {
  flutter: dartGenerator,
  swiftui: swiftGenerator,
  android: kotlinGenerator,
  python: pythonGenerator,
};

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

export const buildNormalizedInput = (
  request: GenerateApiCodeRequest,
): NormalizedGenerationInput => {
  const baseName = endpointBaseName(request.endpoint);
  const rootBase = (request.rootName?.trim() || toPascalCase(baseName) || 'Api').replace(
    /\s+/g,
    '',
  );
  const hasRequestBody =
    METHODS_WITH_BODY.has(request.method) &&
    request.requestJson !== undefined &&
    request.requestJson !== null;

  return {
    method: request.method,
    endpoint: request.endpoint.startsWith('/') ? request.endpoint : `/${request.endpoint}`,
    rootName: rootBase,
    baseName,
    functionName: deriveFunctionName(request.method, request.endpoint),
    request: hasRequestBody
      ? normalizeJsonModels(request.requestJson, `${rootBase}Request`)
      : null,
    response: normalizeJsonModels(request.responseJson, `${rootBase}Response`),
  };
};

/**
 * Unified multi-framework API code generation entrypoint.
 * React Native keeps Phase 2 Axios/Fetch generators; other frameworks use language packs.
 */
export const generateApiCodeForFramework = (
  request: GenerateApiCodeRequest,
): GenerateApiCodeData => {
  if (request.framework === 'react-native') {
    if (!request.library) {
      throw new Error('library is required for react-native (axios | fetch)');
    }
    const result = generateReactNativeApiCode({
      ...request,
      library: request.library,
    });
    return {
      ...result,
      meta: {
        ...result.meta,
        library: request.library,
        rootName: request.rootName?.trim() || result.meta.baseName,
      },
    };
  }

  const generator = LANGUAGE_GENERATORS[request.framework];
  if (!generator) {
    throw new Error(`Unsupported framework: ${request.framework}`);
  }

  const input = buildNormalizedInput(request);
  const files = generator.generate(input);

  return {
    files,
    meta: {
      baseName: input.baseName,
      functionName: input.functionName,
      requestTypeName: input.request?.rootName ?? null,
      responseTypeName: input.response.rootName,
      method: request.method,
      endpoint: input.endpoint,
      framework: request.framework,
      library: null,
      rootName: input.rootName,
    },
  };
};

export { LANGUAGE_GENERATORS };
