import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  GenerateTypeScriptData,
  GenerateTypeScriptRequest,
} from '@apicaptain/types';

const apiBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const generateTypeScript = async (
  request: GenerateTypeScriptRequest,
): Promise<GenerateTypeScriptData> => {
  const response = await fetch(`${apiBaseUrl()}/api/v1/generate/typescript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const payload = (await response.json()) as
    | ApiSuccessResponse<GenerateTypeScriptData>
    | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    const errorPayload = payload as ApiErrorResponse;
    throw new ApiClientError(
      errorPayload.error?.code ?? 'REQUEST_FAILED',
      errorPayload.error?.message ?? 'Failed to generate TypeScript',
      response.status,
      errorPayload.error?.details,
    );
  }

  return payload.data;
};

export const EXAMPLE_JSON = `{
  "id": 123,
  "name": "John",
  "email": "john@example.com",
  "isActive": true,
  "address": {
    "city": "Chennai",
    "country": "India"
  },
  "tags": ["developer", "react-native"]
}`;
