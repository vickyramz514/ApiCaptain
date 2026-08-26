import type { NextFunction, Request, Response } from 'express';
import { generateTypeScriptService } from '../services/generateTypeScriptService.js';
import { validateGenerateTypeScriptRequest } from '../validators/generateTypeScript.js';
import { sendSuccess } from '../utils/response.js';

export const generateTypeScriptController = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const request = validateGenerateTypeScriptRequest(req.body);
    const data = generateTypeScriptService(request);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};
