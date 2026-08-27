import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { PublicUser, UserPlan } from '@apicaptain/types';
import type { User } from '@prisma/client';

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, 12);

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> => {
  if (!passwordHash || passwordHash.startsWith('$phase5_placeholder$')) {
    return false;
  }
  return bcrypt.compare(password, passwordHash);
};

export const createOpaqueToken = (): string => randomBytes(32).toString('base64url');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  plan: user.plan as UserPlan,
  createdAt: user.createdAt.toISOString(),
  lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
});

export const validatePasswordStrength = (password: string): string | null => {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include letters and numbers';
  }
  return null;
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
