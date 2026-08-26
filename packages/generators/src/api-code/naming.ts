import { toPascalCase } from '../shared/naming.js';

export {
  endpointBaseName,
  deriveFunctionName,
  toCamelCase,
  toPascalCase,
} from '../shared/naming.js';

export const deriveRequestTypeName = (baseName: string): string =>
  `${toPascalCase(baseName)}Request`;

export const deriveResponseTypeName = (baseName: string): string =>
  `${toPascalCase(baseName)}Response`;
