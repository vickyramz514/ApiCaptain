import type { GeneratedFile } from '@apicaptain/types';
import type { CodeGenerator } from '../shared/contract.js';
import type { NormalizedGenerationInput } from '../shared/schema.js';
import { toSnakeCase } from '../shared/naming.js';
import { renderDartApi } from './api.js';
import { renderDartModels } from './models.js';

export const dartGenerator: CodeGenerator = {
  id: 'dart',
  language: 'dart',
  generate(input: NormalizedGenerationInput): GeneratedFile[] {
    const snake = toSnakeCase(input.baseName);
    const modelSets = [input.response, input.request].filter(Boolean) as NonNullable<
      typeof input.request
    >[];

    return [
      {
        filename: `${snake}_models.dart`,
        language: 'dart',
        content: renderDartModels(modelSets.reverse()),
      },
      {
        filename: `${snake}_api.dart`,
        language: 'dart',
        content: renderDartApi(input),
      },
    ];
  },
};
