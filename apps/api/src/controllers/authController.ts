import type { NextFunction, Response } from 'express';
import { getApiConfig, PLAN_LIMITS, PRICING_PLANS } from '@apicaptain/config';
import {
  deleteAccount,
  forgotPassword,
  getMe,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  SESSION_COOKIE,
} from '../services/authService.js';
import type { AuthedRequest } from '../middleware/auth.js';
import {
  validateDeleteAccount,
  validateForgotPassword,
  validateLogin,
  validateRegister,
  validateResetPassword,
} from '../validators/saas.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

const setSessionCookie = (res: Response, token: string): void => {
  const config = getApiConfig();
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const clearSessionCookie = (res: Response): void => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
};

export const registerController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = validateRegister(req.body);
    const data = await registerUser(body, {
      userAgent: req.get('user-agent') ?? undefined,
      ipAddress: req.ip,
    });
    setSessionCookie(res, data.token);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = validateLogin(req.body);
    const data = await loginUser(body, {
      userAgent: req.get('user-agent') ?? undefined,
      ipAddress: req.ip,
    });
    setSessionCookie(res, data.token);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await logoutUser(req.authToken ?? null);
    clearSessionCookie(res);
    sendSuccess(res, { ok: true });
  } catch (error) {
    next(error);
  }
};

export const meController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    sendSuccess(res, await getMe(req.user));
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = validateForgotPassword(req.body);
    sendSuccess(res, await forgotPassword(body));
  } catch (error) {
    next(error);
  }
};

export const resetPasswordController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = validateResetPassword(req.body);
    sendSuccess(res, await resetPassword(body));
  } catch (error) {
    next(error);
  }
};

export const deleteAccountController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    const body = validateDeleteAccount(req.body);
    await deleteAccount(req.user, body.password);
    clearSessionCookie(res);
    sendSuccess(res, { ok: true });
  } catch (error) {
    next(error);
  }
};

export const pricingController = (_req: AuthedRequest, res: Response): void => {
  sendSuccess(res, {
    plans: PRICING_PLANS.map((plan) => ({
      ...plan,
      limits: PLAN_LIMITS[plan.id],
    })),
  });
};
