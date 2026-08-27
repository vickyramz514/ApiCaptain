import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { getApiConfig } from '@apicaptain/config';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { razorpayWebhookController } from './controllers/billingController.js';

export const createApp = (): Express => {
  const config = getApiConfig();
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestLogger);
  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Razorpay-Signature'],
      credentials: true,
    }),
  );
  app.use(cookieParser());

  // Raw body is required for Razorpay HMAC verification — do not JSON-parse first.
  app.post(
    '/api/v1/billing/webhook/razorpay',
    express.raw({ type: 'application/json' }),
    razorpayWebhookController,
  );

  app.use(express.json({ limit: config.bodyLimit }));

  app.use(apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
