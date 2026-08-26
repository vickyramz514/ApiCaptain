import type { GeneratedFile } from '@apicaptain/types';
import type { CodeGenerator } from '../shared/contract.js';
import type { NormalizedGenerationInput } from '../shared/schema.js';
import { toPascalCase } from '../shared/naming.js';
import { renderKotlinApi } from './api.js';
import { renderKotlinModels } from './models.js';

export const kotlinGenerator: CodeGenerator = {
  id: 'kotlin',
  language: 'kotlin',
  generate(input: NormalizedGenerationInput): GeneratedFile[] {
    const name = toPascalCase(input.baseName);
    const modelSets = [input.request, input.response].filter(Boolean) as NonNullable<
      typeof input.request
    >[];

    return [
      {
        filename: `${name}Models.kt`,
        language: 'kotlin',
        content: renderKotlinModels(modelSets),
      },
      {
        filename: `${name}Api.kt`,
        language: 'kotlin',
        content: renderKotlinApi(input),
      },
    ];
  },
};
