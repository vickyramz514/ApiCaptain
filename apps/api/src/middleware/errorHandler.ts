import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';

export const notFoundHandler = (_req: Request, res: Response): void => {
  sendError(res, 404, {
    code: 'NOT_FOUND',
    message: 'Route not found',
  });
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  console.error('[api] unexpected error', error);
  sendError(res, 500, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
};
