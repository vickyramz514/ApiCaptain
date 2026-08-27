import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const hmacSha256Hex = (secret: string, payload: string | Buffer): string =>
  createHmac('sha256', secret).update(payload).digest('hex');

export const sha256Hex = (payload: string | Buffer): string =>
  createHash('sha256').update(payload).digest('hex');

export const safeEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export const verifyHmacSignature = (
  secret: string,
  payload: string | Buffer,
  signature: string,
): boolean => {
  if (!secret || !signature) return false;
  const expected = hmacSha256Hex(secret, payload);
  return safeEqual(expected, signature);
};
