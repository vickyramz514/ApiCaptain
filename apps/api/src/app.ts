import cors from 'cors';
import express, { type Express } from 'express';
import { getApiConfig } from '@apicaptain/config';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

export const createApp = (): Express => {
  const config = getApiConfig();
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: config.bodyLimit }));

  app.use(apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
