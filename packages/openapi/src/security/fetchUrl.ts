import { OPENAPI_LIMITS } from '../limits.js';
import { OpenApiError } from '../types/errors.js';
import { assertSafePublicUrl } from './ssrf.js';

export interface FetchUrlOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

/**
 * Safely fetch OpenAPI content from a public HTTP(S) URL.
 * Validates each redirect target against SSRF rules.
 */
export const fetchOpenApiFromUrl = async (
  rawUrl: string,
  options: FetchUrlOptions = {},
): Promise<{ content: string; finalUrl: string; contentType: string | null }> => {
  const timeoutMs = options.timeoutMs ?? OPENAPI_LIMITS.urlFetchTimeoutMs;
  const maxBytes = options.maxBytes ?? OPENAPI_LIMITS.maxUrlResponseBytes;
  const maxRedirects = options.maxRedirects ?? OPENAPI_LIMITS.maxRedirects;

  let current = await assertSafePublicUrl(rawUrl);
  let redirects = 0;

  while (redirects <= maxRedirects) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'application/json, application/yaml, text/yaml, text/plain, */*',
          'User-Agent': 'ApiCaptain-OpenAPI-Importer/1.0',
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new OpenApiError('URL_FETCH_FAILED', 'Redirect missing location header');
        }
        redirects += 1;
        if (redirects > maxRedirects) {
          throw new OpenApiError('URL_FETCH_FAILED', 'Too many redirects');
        }
        const next = new URL(location, current);
        current = await assertSafePublicUrl(next.toString());
        continue;
      }

      if (!response.ok) {
        throw new OpenApiError('URL_FETCH_FAILED', 'Failed to fetch OpenAPI document');
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) > maxBytes) {
        throw new OpenApiError('DOCUMENT_TOO_LARGE', 'Remote document exceeds size limit');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        if (Buffer.byteLength(text, 'utf8') > maxBytes) {
          throw new OpenApiError('DOCUMENT_TOO_LARGE', 'Remote document exceeds size limit');
        }
        return { content: text, finalUrl: current.toString(), contentType };
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > maxBytes) {
            throw new OpenApiError('DOCUMENT_TOO_LARGE', 'Remote document exceeds size limit');
          }
          chunks.push(value);
        }
      }

      const merged = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }

      return {
        content: new TextDecoder('utf-8').decode(merged),
        finalUrl: current.toString(),
        contentType,
      };
    } catch (error) {
      if (error instanceof OpenApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenApiError('URL_FETCH_FAILED', 'Request timed out');
      }
      throw new OpenApiError('URL_FETCH_FAILED', 'Failed to fetch OpenAPI document');
    } finally {
      clearTimeout(timer);
    }
  }

  throw new OpenApiError('URL_FETCH_FAILED', 'Too many redirects');
};
