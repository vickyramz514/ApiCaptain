import type { JsonObject, JsonValue } from './types.js';

export class JsonParseError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(message);
    this.name = 'JsonParseError';
    this.line = line;
    this.column = column;
  }
}

const positionFromOffset = (source: string, offset: number): { line: number; column: number } => {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset && i < source.length; i += 1) {
    if (source[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
};

export const parseJsonInput = (source: string): unknown => {
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    const match = /position\s+(\d+)/i.exec(message);
    const offset = match ? Number(match[1]) : 0;
    const { line, column } = positionFromOffset(source, Number.isFinite(offset) ? offset : 0);
    throw new JsonParseError(`Invalid JSON at line ${line}, column ${column}: ${message}`, line, column);
  }
};

export const isPlainObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null) return true;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (isPlainObject(value)) return Object.values(value).every(isJsonValue);
  return false;
};
