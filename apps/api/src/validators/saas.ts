import type {
  CreateProjectRequest,
  DeleteAccountRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProjectRequest,
} from '@apicaptain/types';
import { AppError } from '../utils/errors.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const validateRegister = (body: unknown): RegisterRequest => {
  if (!isObject(body)) throw new AppError('VALIDATION_ERROR', 'Invalid body');
  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'email and password are required');
  }
  return {
    email: body.email,
    password: body.password,
    name: typeof body.name === 'string' ? body.name : undefined,
  };
};

export const validateLogin = (body: unknown): LoginRequest => {
  if (!isObject(body)) throw new AppError('VALIDATION_ERROR', 'Invalid body');
  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'email and password are required');
  }
  return { email: body.email, password: body.password };
};

export const validateForgotPassword = (body: unknown): ForgotPasswordRequest => {
  if (!isObject(body) || typeof body.email !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'email is required');
  }
  return { email: body.email };
};

export const validateResetPassword = (body: unknown): ResetPasswordRequest => {
  if (!isObject(body) || typeof body.token !== 'string' || typeof body.password !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'token and password are required');
  }
  return { token: body.token, password: body.password };
};

export const validateCreateProject = (body: unknown): CreateProjectRequest => {
  if (!isObject(body)) throw new AppError('VALIDATION_ERROR', 'Invalid body');
  if (typeof body.name !== 'string' || typeof body.sourceType !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'name and sourceType are required');
  }
  return {
    name: body.name,
    description: typeof body.description === 'string' ? body.description : undefined,
    sourceType: body.sourceType as CreateProjectRequest['sourceType'],
    sourceContent: typeof body.sourceContent === 'string' ? body.sourceContent : undefined,
    sourceMeta: body.sourceMeta,
    openApiVersion: typeof body.openApiVersion === 'string' ? body.openApiVersion : undefined,
    framework: typeof body.framework === 'string' ? body.framework : undefined,
    library: typeof body.library === 'string' ? body.library : undefined,
  };
};

export const validateUpdateProject = (body: unknown): UpdateProjectRequest => {
  if (!isObject(body)) throw new AppError('VALIDATION_ERROR', 'Invalid body');
  return {
    name: typeof body.name === 'string' ? body.name : undefined,
    description:
      body.description === null
        ? null
        : typeof body.description === 'string'
          ? body.description
          : undefined,
    sourceContent:
      body.sourceContent === null
        ? null
        : typeof body.sourceContent === 'string'
          ? body.sourceContent
          : undefined,
    sourceMeta: body.sourceMeta,
    openApiVersion:
      body.openApiVersion === null
        ? null
        : typeof body.openApiVersion === 'string'
          ? body.openApiVersion
          : undefined,
    framework:
      body.framework === null
        ? null
        : typeof body.framework === 'string'
          ? body.framework
          : undefined,
    library:
      body.library === null ? null : typeof body.library === 'string' ? body.library : undefined,
  };
};

export const validateDeleteAccount = (body: unknown): DeleteAccountRequest => {
  if (!isObject(body)) throw new AppError('VALIDATION_ERROR', 'Invalid body');
  if (body.confirmation !== 'DELETE' || typeof body.password !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'confirmation DELETE and password are required');
  }
  return { confirmation: 'DELETE', password: body.password };
};
