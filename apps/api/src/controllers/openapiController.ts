import type { NextFunction, Request, Response } from 'express';
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

export const parseOpenApiController = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const request = validateOpenApiParseRequest(req.body);
    const data = parseOpenApiService(request);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const importOpenApiUrlController = (
  req: Request,
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

export const generateOpenApiController = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const request = validateOpenApiGenerateRequest(req.body);
    const data = generateOpenApiService(request);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};
