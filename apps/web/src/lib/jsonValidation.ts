export interface JsonValidationResult {
  valid: boolean;
  value?: unknown;
  message?: string;
  line?: number;
  column?: number;
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

export const validateJsonText = (source: string): JsonValidationResult => {
  const trimmed = source.trim();
  if (!trimmed) {
    return { valid: false, message: 'JSON input is empty' };
  }

  try {
    return { valid: true, value: JSON.parse(source) as unknown };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    const match = /position\s+(\d+)/i.exec(message);
    const offset = match ? Number(match[1]) : 0;
    const { line, column } = positionFromOffset(source, Number.isFinite(offset) ? offset : 0);
    return {
      valid: false,
      message: `Invalid JSON at line ${line}, column ${column}`,
      line,
      column,
    };
  }
};
