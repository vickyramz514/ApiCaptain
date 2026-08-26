import type { GeneratedFile } from '@apicaptain/types';
import type { CodeGenerator } from '../shared/contract.js';
import type { NormalizedGenerationInput } from '../shared/schema.js';
import { toSnakeCase } from '../shared/naming.js';
import { renderPythonApi } from './api.js';
import { renderPythonModels } from './models.js';

export const pythonGenerator: CodeGenerator = {
  id: 'python',
  language: 'python',
  generate(input: NormalizedGenerationInput): GeneratedFile[] {
    const snake = toSnakeCase(input.baseName);
    const modelSets = [input.request, input.response].filter(Boolean) as NonNullable<
      typeof input.request
    >[];

    return [
      {
        filename: `${snake}_models.py`,
        language: 'python',
        content: renderPythonModels(modelSets),
      },
      {
        filename: `${snake}_api.py`,
        language: 'python',
        content: renderPythonApi(input),
      },
    ];
  },
};
