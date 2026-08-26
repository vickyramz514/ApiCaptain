/** Shared runtime configuration helpers. */

export interface ApiConfig {
  host: string;
  port: number;
  corsOrigin: string;
  nodeEnv: string;
  databaseUrl: string;
  bodyLimit: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

export interface WebConfig {
  apiUrl: string;
  nodeEnv: string;
}

export type EnvMap = Record<string, string | undefined>;

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readEnv = (env?: EnvMap): EnvMap =>
  env ?? (globalThis as { process?: { env?: EnvMap } }).process?.env ?? {};

export const getApiConfig = (env?: EnvMap): ApiConfig => {
  const source = readEnv(env);
  return {
    host: source.API_HOST ?? '0.0.0.0',
    port: toNumber(source.API_PORT, 4000),
    corsOrigin: source.CORS_ORIGIN ?? 'http://localhost:3000',
    nodeEnv: source.NODE_ENV ?? 'development',
    databaseUrl: source.DATABASE_URL ?? '',
    bodyLimit: source.BODY_LIMIT ?? '1mb',
    rateLimitWindowMs: toNumber(source.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMax: toNumber(source.RATE_LIMIT_MAX, 60),
  };
};

export const getWebConfig = (env?: EnvMap): WebConfig => {
  const source = readEnv(env);
  return {
    apiUrl: source.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    nodeEnv: source.NODE_ENV ?? 'development',
  };
};
