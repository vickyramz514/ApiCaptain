import { OAuth2Client } from 'google-auth-library';
import { getApiConfig } from '@apicaptain/config';
import { AppError } from '../utils/errors.js';
import { normalizeEmail } from './crypto.js';

export type GoogleIdPayload = {
  email: string;
  name: string | null;
  sub: string;
};

const TEST_PREFIX = 'test:';

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleIdPayload> => {
  const token = idToken.trim();
  if (!token) {
    throw new AppError('VALIDATION_ERROR', 'Google credential is required');
  }

  const config = getApiConfig();
  if (config.nodeEnv === 'test' && token.startsWith(TEST_PREFIX)) {
    const rest = token.slice(TEST_PREFIX.length);
    const [rawEmail, ...nameParts] = rest.split(':');
    const email = normalizeEmail(rawEmail ?? '');
    if (!email.includes('@')) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid or expired Google token', 401);
    }
    return {
      email,
      name: nameParts.join(':').trim() || null,
      sub: `google_${email}`,
    };
  }

  if (!config.googleClientId) {
    throw new AppError('VALIDATION_ERROR', 'Google sign-in is not configured');
  }

  try {
    const client = new OAuth2Client(config.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email ? normalizeEmail(payload.email) : '';
    if (!email) {
      throw new AppError('INVALID_CREDENTIALS', 'Google account has no email', 401);
    }
    return {
      email,
      name: payload?.name || payload?.given_name || null,
      sub: payload?.sub ?? `google_${email}`,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('INVALID_CREDENTIALS', 'Invalid or expired Google token', 401);
  }
};
