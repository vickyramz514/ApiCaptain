import type {
  ApiFramework,
  GenerateApiCodeRequest,
  GeneratedFile,
  HttpLibrary,
  HttpMethod,
} from '@apicaptain/types';

export type {
  ApiFramework,
  GenerateApiCodeRequest,
  GeneratedFile,
  HttpLibrary,
  HttpMethod,
};

export interface ApiClientContext {
  method: HttpMethod;
  endpoint: string;
  functionName: string;
  requestTypeName: string | null;
  responseTypeName: string;
  typesModuleName: string;
  hasRequestBody: boolean;
}

export interface HttpClientGenerator {
  readonly library: HttpLibrary;
  generate(context: ApiClientContext): string;
}
