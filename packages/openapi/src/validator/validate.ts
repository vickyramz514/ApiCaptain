import { OpenApiError } from '../types/errors.js';
import type { ApiSpecification } from '../types/model.js';

export const validateNormalizedSpecification = (spec: ApiSpecification): void => {
  if (!Array.isArray(spec.endpoints)) {
    throw new OpenApiError('INVALID_OPENAPI', 'Normalized specification is missing endpoints');
  }

  for (const endpoint of spec.endpoints) {
    if (!endpoint.method || !endpoint.path) {
      throw new OpenApiError('INVALID_OPERATION', 'Endpoint is missing method or path', {
        id: endpoint.id,
      });
    }
    if (!endpoint.path.startsWith('/')) {
      throw new OpenApiError('INVALID_OPERATION', 'Endpoint path must start with /', {
        id: endpoint.id,
        path: endpoint.path,
      });
    }
  }
};
