import { getApiConfig } from '@apicaptain/config';
import type {
  AuthTokenData,
  ForgotPasswordRequest,
  LoginRequest,
  MeData,
  PublicUser,
  RegisterRequest,
  ResetPasswordRequest,
} from '@apicaptain/types';
import { AppError } from '../utils/errors.js';
import { memoryStore, useMemoryStore } from '../db/memoryStore.js';
import { prisma } from '../db/prisma.js';
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  normalizeEmail,
  validatePasswordStrength,
  verifyPassword,
} from '../auth/crypto.js';
import { emailService } from './emailService.js';
import { getUsageSnapshot } from './usageService.js';
import { resolveEffectivePlan } from './entitlementService.js';
import type { User } from '@prisma/client';
import type { StoreUser } from '../db/memoryStore.js';

const SESSION_COOKIE = 'apicaptain_session';

export { SESSION_COOKIE };

const asPublic = (user: User | StoreUser, plan?: PublicUser['plan']): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  plan: plan ?? (user.plan as PublicUser['plan']),
  createdAt: user.createdAt.toISOString(),
  lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
});


const createSessionForUser = async (
  userId: string,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<string> => {
  const config = getApiConfig();
  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);

  if (useMemoryStore()) {
    memoryStore.createSession({
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });
  } else {
    await prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });
  }

  return token;
};

export const registerUser = async (
  request: RegisterRequest,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokenData> => {
  const email = normalizeEmail(request.email);
  if (!email || !email.includes('@')) {
    throw new AppError('VALIDATION_ERROR', 'A valid email is required');
  }
  const passwordError = validatePasswordStrength(request.password);
  if (passwordError) {
    throw new AppError('VALIDATION_ERROR', passwordError);
  }

  const passwordHash = await hashPassword(request.password);
  const name = request.name?.trim() || null;

  if (useMemoryStore()) {
    if (memoryStore.findUserByEmail(email)) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists', 409);
    }
    const user = memoryStore.createUser({ email, name, passwordHash });
    const token = await createSessionForUser(user.id, meta);
    return { token, user: asPublic(user) };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists', 409);
  }

  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });
  await prisma.subscription.create({
    data: { userId: user.id, plan: 'FREE', status: 'INACTIVE', provider: 'NONE' },
  });
  const token = await createSessionForUser(user.id, meta);
  return { token, user: asPublic(user) };
};

export const loginUser = async (
  request: LoginRequest,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokenData> => {
  const email = normalizeEmail(request.email);
  if (useMemoryStore()) {
    const user = memoryStore.findUserByEmail(email);
    if (!user || !(await verifyPassword(request.password, user.passwordHash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }
    memoryStore.updateUser(user.id, { lastLoginAt: new Date() });
    const token = await createSessionForUser(user.id, meta);
    return { token, user: asPublic(memoryStore.findUserById(user.id)!) };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(request.password, user.passwordHash))) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  const token = await createSessionForUser(user.id, meta);
  return { token, user: asPublic(updated) };
};

export const logoutUser = async (token: string | null): Promise<void> => {
  if (!token) return;
  const tokenHash = hashToken(token);
  if (useMemoryStore()) {
    memoryStore.deleteSessionByHash(tokenHash);
    return;
  }
  await prisma.session.deleteMany({ where: { tokenHash } });
};

export const resolveUserFromToken = async (token: string | null): Promise<PublicUser | null> => {
  if (!token) return null;
  const tokenHash = hashToken(token);

  if (useMemoryStore()) {
    const session = memoryStore.findSessionByHash(tokenHash);
    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) memoryStore.deleteSessionByHash(tokenHash);
      return null;
    }
    const user = memoryStore.findUserById(session.userId);
    if (!user) return null;
    return asPublic(user, await resolveEffectivePlan(user.id));
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return asPublic(session.user, await resolveEffectivePlan(session.user.id));
};

export const getMe = async (user: PublicUser): Promise<MeData> => {
  const plan = await resolveEffectivePlan(user.id);
  return {
    user: { ...user, plan },
    usage: await getUsageSnapshot(user.id, plan),
  };
};

export const forgotPassword = async (request: ForgotPasswordRequest): Promise<{ ok: true }> => {
  const email = normalizeEmail(request.email);
  const config = getApiConfig();
  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + config.passwordResetTtlMinutes * 60 * 1000);

  if (useMemoryStore()) {
    const user = memoryStore.findUserByEmail(email);
    if (user) {
      memoryStore.createResetToken({ userId: user.id, tokenHash, expiresAt });
      const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
      await emailService.sendPasswordResetEmail(user.email, resetUrl);
    }
    return { ok: true };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
    await emailService.sendPasswordResetEmail(user.email, resetUrl);
  }
  // Always succeed to avoid account enumeration
  return { ok: true };
};

export const resetPassword = async (request: ResetPasswordRequest): Promise<{ ok: true }> => {
  const passwordError = validatePasswordStrength(request.password);
  if (passwordError) {
    throw new AppError('VALIDATION_ERROR', passwordError);
  }
  const tokenHash = hashToken(request.token);

  if (useMemoryStore()) {
    const reset = memoryStore.findResetByHash(tokenHash);
    if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
      throw new AppError('VALIDATION_ERROR', 'Reset token is invalid or expired');
    }
    const passwordHash = await hashPassword(request.password);
    memoryStore.updateUser(reset.userId, { passwordHash });
    memoryStore.markResetUsed(reset.id);
    memoryStore.deleteSessionsForUser(reset.userId);
    return { ok: true };
  }

  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
    throw new AppError('VALIDATION_ERROR', 'Reset token is invalid or expired');
  }
  const passwordHash = await hashPassword(request.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: reset.userId } }),
  ]);
  return { ok: true };
};

export const deleteAccount = async (
  user: PublicUser,
  password: string,
): Promise<void> => {
  if (useMemoryStore()) {
    const storeUser = memoryStore.findUserById(user.id);
    if (!storeUser || !(await verifyPassword(password, storeUser.passwordHash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Password is incorrect', 401);
    }
    memoryStore.deleteUser(user.id);
    return;
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !(await verifyPassword(password, dbUser.passwordHash))) {
    throw new AppError('INVALID_CREDENTIALS', 'Password is incorrect', 401);
  }
  await prisma.user.delete({ where: { id: user.id } });
};
