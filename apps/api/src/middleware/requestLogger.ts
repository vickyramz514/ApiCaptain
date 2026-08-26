import type { NextFunction, Request, Response } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const started = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - started;
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });
  next();
};
