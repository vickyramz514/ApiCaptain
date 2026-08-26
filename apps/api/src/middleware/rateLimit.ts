import rateLimit from 'express-rate-limit';
import { getApiConfig } from '@apicaptain/config';

export const createGenerateRateLimiter = () => {
  const config = getApiConfig();

  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many generation requests. Please try again later.',
      },
    },
  });
};
