import cors from 'cors';
import express, { type Express } from 'express';
import { getApiConfig } from '@apicaptain/config';
import { generateFromJson } from '@apicaptain/generators';
import type { GenerateRequest, HealthResponse } from '@apicaptain/types';

const PACKAGE_VERSION = '0.0.0';

export const createApp = (): Express => {
  const config = getApiConfig();
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      service: '@apicaptain/api',
      timestamp: new Date().toISOString(),
      version: PACKAGE_VERSION,
    };
    res.json(body);
  });

  app.post('/generate', (req, res) => {
    const body = req.body as GenerateRequest;

    if (!body?.document?.name || !body?.document?.schema || !body?.target) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Expected { document: { name, schema }, target }',
        },
      });
      return;
    }

    try {
      const result = generateFromJson(body);
      res.json({ data: result });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  });

  return app;
};
