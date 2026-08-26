import type { GenerateTypeScriptOptions, TypeScriptOutputKind } from '@apicaptain/types';

export type { GenerateTypeScriptOptions, TypeScriptOutputKind };

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface NamedTypeDefinition {
  name: string;
  kind: 'object';
  properties: Array<{
    rawKey: string;
    typeExpression: string;
  }>;
  /** Structural fingerprint for deduplication */
  fingerprint: string;
}

export interface GeneratorContext {
  options: GenerateTypeScriptOptions;
  definitions: NamedTypeDefinition[];
  fingerprints: Map<string, string>;
  usedNames: Set<string>;
}
