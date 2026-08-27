import type { NextFunction, Response } from 'express';
import {
  generateOpenApiService,
  importOpenApiUrlService,
  parseOpenApiService,
} from '../services/openapiService.js';
import {
  validateOpenApiGenerateRequest,
  validateOpenApiImportUrlRequest,
  validateOpenApiParseRequest,
} from '../validators/openapi.js';
import { sendSuccess } from '../utils/response.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { assertCanGenerate, recordSuccessfulGeneration } from '../services/usageService.js';

export const parseOpenApiController = (req: AuthedRequest, res: Response, next: NextFunction): void => {
  try {
    const request = validateOpenApiParseRequest(req.body);
    const data = parseOpenApiService(request);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const importOpenApiUrlController = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void => {
  void (async () => {
    try {
      const request = validateOpenApiImportUrlRequest(req.body);
      const data = await importOpenApiUrlService(request);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  })();
};

export const generateOpenApiController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (req.user) {
      await assertCanGenerate(req.user.id);
    }
    const request = validateOpenApiGenerateRequest(req.body);
    const data = generateOpenApiService(request);
    if (req.user) {
      await recordSuccessfulGeneration(req.user.id);
    }
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};
