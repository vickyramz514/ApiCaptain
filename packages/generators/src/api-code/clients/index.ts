import type { HttpLibrary } from '@apicaptain/types';
import type { HttpClientGenerator } from '../types.js';
import { axiosClientGenerator } from './axios.js';
import { fetchClientGenerator } from './fetch.js';

/**
 * Registry of HTTP client generators.
 * Future libraries (React Query wrappers, etc.) register here.
 */
const CLIENT_GENERATORS: Record<HttpLibrary, HttpClientGenerator> = {
  axios: axiosClientGenerator,
  fetch: fetchClientGenerator,
};

export const getHttpClientGenerator = (library: HttpLibrary): HttpClientGenerator => {
  const generator = CLIENT_GENERATORS[library];
  if (!generator) {
    throw new Error(`Unsupported HTTP library: ${library}`);
  }
  return generator;
};

export { axiosClientGenerator, fetchClientGenerator };
