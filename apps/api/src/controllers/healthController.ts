import type { Request, Response } from 'express';

export const healthController = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ApiCaptain API is running',
    data: {
      message: 'ApiCaptain API is running',
    },
  });
};
