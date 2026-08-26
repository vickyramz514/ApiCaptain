import type { GeneratedFile } from '@apicaptain/types';
import type { NormalizedGenerationInput } from './schema.js';

/**
 * Shared multi-language generator contract.
 * Framework-independent — no Next.js / Express / DB coupling.
 */
export interface CodeGenerator {
  readonly id: string;
  readonly language: GeneratedFile['language'];
  generate(input: NormalizedGenerationInput): GeneratedFile[];
}

export type { GeneratedFile };
