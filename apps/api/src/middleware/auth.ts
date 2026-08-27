import type { NextFunction, Request, Response } from 'express';
import type { PublicUser } from '@apicaptain/types';
import { AppError } from '../utils/errors.js';
import { resolveUserFromToken, SESSION_COOKIE } from '../services/authService.js';

export type AuthedRequest = Request & { user?: PublicUser; authToken?: string };

export const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim() || null;
  }
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    SESSION_COOKIE
  ];
  return typeof cookieToken === 'string' && cookieToken ? cookieToken : null;
};

export const optionalAuth = async (
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    req.authToken = token ?? undefined;
    req.user = (await resolveUserFromToken(token)) ?? undefined;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = async (
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    const user = await resolveUserFromToken(token);
    if (!user) {
      throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    }
    req.authToken = token ?? undefined;
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
