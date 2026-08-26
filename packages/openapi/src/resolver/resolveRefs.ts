import { OpenApiError } from '../types/errors.js';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export interface ResolveRefsResult {
  document: Record<string, unknown>;
  circularRefs: string[];
}

/**
 * Resolve local JSON Pointer $ref values (#/...).
 * Circular references are left as `{ $ref, 'x-apicaptain-circular': true }`.
 */
export const resolveLocalRefs = (root: Record<string, unknown>): ResolveRefsResult => {
  const circularRefs: string[] = [];
  const cache = new Map<string, unknown>();

  const getByPointer = (pointer: string): unknown => {
    if (!pointer.startsWith('#/')) {
      throw new OpenApiError(
        'UNRESOLVED_REFERENCE',
        `Only local references are supported: ${pointer}`,
        { pointer },
      );
    }

    const parts = pointer
      .slice(2)
      .split('/')
      .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));

    let current: unknown = root;
    for (const part of parts) {
      if (!isPlainObject(current) && !Array.isArray(current)) {
        throw new OpenApiError('UNRESOLVED_REFERENCE', `Unresolved reference: ${pointer}`, {
          pointer,
        });
      }
      if (Array.isArray(current)) {
        const index = Number(part);
        if (!Number.isInteger(index) || index < 0 || index >= current.length) {
          throw new OpenApiError('UNRESOLVED_REFERENCE', `Unresolved reference: ${pointer}`, {
            pointer,
          });
        }
        current = current[index];
      } else {
        if (!(part in current)) {
          throw new OpenApiError('UNRESOLVED_REFERENCE', `Unresolved reference: ${pointer}`, {
            pointer,
          });
        }
        current = current[part];
      }
    }
    return current;
  };

  const resolveValue = (value: unknown, stack: Set<string>): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => resolveValue(item, stack));
    }
    if (!isPlainObject(value)) {
      return value;
    }

    if (typeof value.$ref === 'string') {
      const ref = value.$ref;
      if (!ref.startsWith('#/')) {
        throw new OpenApiError(
          'UNRESOLVED_REFERENCE',
          `External references are not supported: ${ref}`,
          { pointer: ref },
        );
      }

      if (stack.has(ref)) {
        circularRefs.push(ref);
        return {
          $ref: ref,
          'x-apicaptain-circular': true,
          'x-apicaptain-ref-name': ref.split('/').pop() ?? 'Circular',
        };
      }

      if (cache.has(ref)) {
        return cache.get(ref);
      }

      stack.add(ref);
      const target = getByPointer(ref);
      const resolved = resolveValue(target, stack);
      stack.delete(ref);

      // Prefer merging sibling keys onto resolved object (OpenAPI 3.1 style)
      if (isPlainObject(resolved)) {
        const siblings = { ...value };
        delete siblings.$ref;
        const merged = { ...resolved, ...siblings };
        cache.set(ref, merged);
        return merged;
      }

      cache.set(ref, resolved);
      return resolved;
    }

    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = resolveValue(child, stack);
    }
    return output;
  };

  const document = resolveValue(root, new Set()) as Record<string, unknown>;
  return { document, circularRefs: [...new Set(circularRefs)] };
};
