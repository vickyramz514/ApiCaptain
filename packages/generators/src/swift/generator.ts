import type { GeneratedFile } from '@apicaptain/types';
import type { CodeGenerator } from '../shared/contract.js';
import type { NormalizedGenerationInput } from '../shared/schema.js';
import { toPascalCase } from '../shared/naming.js';
import { renderSwiftApi } from './api.js';
import { renderSwiftModels } from './models.js';

export const swiftGenerator: CodeGenerator = {
  id: 'swift',
  language: 'swift',
  generate(input: NormalizedGenerationInput): GeneratedFile[] {
    const name = toPascalCase(input.baseName);
    const modelSets = [input.request, input.response].filter(Boolean) as NonNullable<
      typeof input.request
    >[];

    return [
      {
        filename: `${name}Models.swift`,
        language: 'swift',
        content: renderSwiftModels(modelSets),
      },
      {
        filename: `${name}API.swift`,
        language: 'swift',
        content: renderSwiftApi(input),
      },
    ];
  },
};
