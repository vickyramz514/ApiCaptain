import type { NextFunction, Response } from 'express';
import { generateApiCodeService } from '../services/generateApiCodeService.js';
import { generateTypeScriptService } from '../services/generateTypeScriptService.js';
import { validateGenerateApiCodeRequest } from '../validators/generateApiCode.js';
import { validateGenerateTypeScriptRequest } from '../validators/generateTypeScript.js';
import { sendSuccess } from '../utils/response.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { assertCanGenerate, recordSuccessfulGeneration } from '../services/usageService.js';

export const generateTypeScriptController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (req.user) {
      await assertCanGenerate(req.user.id, req.user.plan);
    }
    const request = validateGenerateTypeScriptRequest(req.body);
    const data = generateTypeScriptService(request);
    if (req.user) {
      await recordSuccessfulGeneration(req.user.id);
    }
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const generateApiCodeController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (req.user) {
      await assertCanGenerate(req.user.id, req.user.plan);
    }
    const request = validateGenerateApiCodeRequest(req.body);
    const data = generateApiCodeService(request);
    if (req.user) {
      await recordSuccessfulGeneration(req.user.id);
    }
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};
