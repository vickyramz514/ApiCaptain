import { generateTypeScriptFromJson } from '@apicaptain/generators';
import type { GenerateTypeScriptData, GenerateTypeScriptRequest } from '@apicaptain/types';
import { AppError } from '../utils/errors.js';

export const generateTypeScriptService = (
  request: GenerateTypeScriptRequest,
): GenerateTypeScriptData => {
  try {
    const code = generateTypeScriptFromJson(request.json, {
      rootName: request.rootName ?? 'Root',
      outputType: request.outputType ?? 'interface',
      optionalProperties: request.optionalProperties ?? false,
      useSemicolon: request.useSemicolon ?? true,
      exportTypes: request.exportTypes ?? true,
    });

    return { code };
  } catch (error) {
    throw new AppError(
      'GENERATION_FAILED',
      error instanceof Error ? error.message : 'Failed to generate TypeScript',
      500,
    );
  }
};
