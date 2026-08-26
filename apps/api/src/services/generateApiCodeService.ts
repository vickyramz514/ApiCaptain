import { generateApiCode } from '@apicaptain/generators';
import type { GenerateApiCodeData, GenerateApiCodeRequest } from '@apicaptain/types';
import { AppError } from '../utils/errors.js';

export const generateApiCodeService = (
  request: GenerateApiCodeRequest,
): GenerateApiCodeData => {
  try {
    return generateApiCode(request);
  } catch (error) {
    throw new AppError(
      'GENERATION_FAILED',
      error instanceof Error ? error.message : 'Failed to generate API code',
      500,
    );
  }
};
