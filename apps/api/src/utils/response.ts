import type { Response } from 'express';
import type { ApiError, ApiSuccessResponse } from '@apicaptain/types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
): void => {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
  res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  statusCode: number,
  error: ApiError,
): void => {
  res.status(statusCode).json({
    success: false,
    error,
  });
};
