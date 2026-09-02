import { AppError } from './errors.js';

const hasMessage = (error: unknown): error is { name?: string; code?: string; message: string } =>
  typeof error === 'object' && error !== null && 'message' in error;

export const prismaErrorToAppError = (error: unknown): AppError | null => {
  if (!hasMessage(error)) return null;

  const name = error.name ?? '';
  const code = error.code ?? '';
  const message = error.message;

  if (
    name === 'PrismaClientInitializationError' ||
    code === 'P1001' ||
    code === 'P1017' ||
    message.includes("Can't reach database server")
  ) {
    return new AppError(
      'DATABASE_UNAVAILABLE',
      'Database is unreachable. Check DATABASE_URL and that Postgres is running, then retry.',
      503,
    );
  }

  if (code === 'P2022' || /column .* does not exist/i.test(message)) {
    return new AppError(
      'DATABASE_SCHEMA_MISMATCH',
      'Database schema is out of date. Run pnpm db:migrate and retry.',
      503,
    );
  }

  return null;
};
