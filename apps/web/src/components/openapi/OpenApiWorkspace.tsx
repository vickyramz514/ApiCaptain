'use client';

import { useMemo, useState } from 'react';
import type {
  ApiFramework,
  GeneratedFile,
  GeneratedLanguage,
  OpenApiEndpointSummary,
  OpenApiLibrary,
  OpenApiParseData,
} from '@apicaptain/types';
import {
  ApiClientError,
  EXAMPLE_OPENAPI_YAML,
  generateOpenApiClient,
  importOpenApiUrl,
  parseOpenApi,
} from '../../lib/apiClient';
import { buildZipBlob } from '../../lib/zip';
import { CodeEditor } from '../CodeEditor';

type InputTab = 'upload' | 'paste' | 'url';
type UiState =
  | 'empty'
  | 'uploading'
  | 'parsing'
  | 'parsed'
  | 'invalid'
  | 'generating'
  | 'generated'
  | 'failed';

const FRAMEWORKS: Array<{ id: ApiFramework; label: string }> = [
  { id: 'react-native', label: 'React Native' },
  { id: 'flutter', label: 'Flutter' },
  { id: 'swiftui', label: 'SwiftUI' },
  { id: 'android', label: 'Android' },
  { id: 'python', label: 'Python' },
];

const librariesFor = (framework: ApiFramework): Array<{ id: OpenApiLibrary; label: string }> => {
  switch (framework) {
    case 'react-native':
      return [
        { id: 'axios', label: 'Axios' },
        { id: 'fetch', label: 'Fetch' },
      ];
    case 'flutter':
      return [{ id: 'dio', label: 'Dio' }];
    case 'swiftui':
      return [{ id: 'urlsession', label: 'URLSession' }];
    case 'android':
      return [{ id: 'retrofit', label: 'Retrofit' }];
    case 'python':
      return [{ id: 'httpx', label: 'httpx' }];
  }
};

const editorLanguageFor = (language: GeneratedLanguage) => {
  switch (language) {
    case 'typescript':
      return 'typescript' as const;
    case 'python':
      return 'python' as const;
    case 'swift':
      return 'swift' as const;
    case 'kotlin':
      return 'kotlin' as const;
    case 'dart':
      return 'dart' as const;
    default:
      return 'plaintext' as const;
  }
};

const methodColor = (method: string): string => {
  switch (method) {
    case 'GET':
      return 'text-emerald-400';
    case 'POST':
      return 'text-sky-400';
    case 'PUT':
      return 'text-amber-400';
    case 'PATCH':
      return 'text-violet-400';
    case 'DELETE':
      return 'text-rose-400';
    default:
      return 'text-slate-300';
  }
};

export function OpenApiWorkspace() {
  const [inputTab, setInputTab] = useState<InputTab>('paste');
  const [pasteText, setPasteText] = useState(EXAMPLE_OPENAPI_YAML);
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uiState, setUiState] = useState<UiState>('empty');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsed, setParsed] = useState<OpenApiParseData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeEndpointId, setActiveEndpointId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [framework, setFramework] = useState<ApiFramework>('react-native');
  const [library, setLibrary] = useState<OpenApiLibrary>('axios');
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [activeFile, setActiveFile] = useState(0);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const libraries = librariesFor(framework);

  const filteredEndpoints = useMemo(() => {
    if (!parsed) return [];
    const q = search.trim().toLowerCase();
    if (!q) return parsed.endpoints;
    return parsed.endpoints.filter(
      (endpoint) =>
        endpoint.path.toLowerCase().includes(q) ||
        endpoint.method.toLowerCase().includes(q) ||
        endpoint.operationId.toLowerCase().includes(q) ||
        (endpoint.summary ?? '').toLowerCase().includes(q) ||
        endpoint.tags.join(' ').toLowerCase().includes(q),
    );
  }, [parsed, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, OpenApiEndpointSummary[]>();
    for (const endpoint of filteredEndpoints) {
      const tag = endpoint.tags[0] ?? 'default';
      const list = map.get(tag) ?? [];
      list.push(endpoint);
      map.set(tag, list);
    }
    return [...map.entries()];
  }, [filteredEndpoints]);

  const activeEndpoint = parsed?.endpoints.find((e) => e.id === activeEndpointId) ?? null;

  const applyParsed = (data: OpenApiParseData) => {
    setParsed(data);
    setSelected(new Set(data.endpoints.map((e) => e.id)));
    setActiveEndpointId(data.endpoints[0]?.id ?? null);
    setFiles([]);
    setUiState('parsed');
    setErrorMessage(null);
  };

  const runParseContent = async (content: string, format: 'json' | 'yaml' | 'auto' = 'auto') => {
    setUiState('parsing');
    setErrorMessage(null);
    try {
      const data = await parseOpenApi({ content, format });
      applyParsed(data);
    } catch (error) {
      setUiState('invalid');
      setParsed(null);
      setErrorMessage(error instanceof ApiClientError ? error.message : 'Failed to parse specification');
    }
  };

  const onUploadFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.json') && !lower.endsWith('.yaml') && !lower.endsWith('.yml')) {
      setUiState('invalid');
      setErrorMessage('Upload a .json, .yaml, or .yml OpenAPI file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUiState('invalid');
      setErrorMessage('File exceeds 2MB limit');
      return;
    }
    setUiState('uploading');
    const text = await file.text();
    const format = lower.endsWith('.json') ? 'json' : 'yaml';
    await runParseContent(text, format);
  };

  const onLoadUrl = async () => {
    if (!url.trim()) {
      setErrorMessage('Enter an OpenAPI URL');
      setUiState('invalid');
      return;
    }
    setUiState('parsing');
    setErrorMessage(null);
    try {
      const data = await importOpenApiUrl({ url: url.trim() });
      applyParsed(data);
    } catch (error) {
      setUiState('invalid');
      setParsed(null);
      setErrorMessage(error instanceof ApiClientError ? error.message : 'Failed to load URL');
    }
  };

  const toggleEndpoint = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!parsed) return;
    setSelected(new Set(parsed.endpoints.map((e) => e.id)));
  };

  const clearAll = () => setSelected(new Set());

  const runGenerate = async (mode: 'selected' | 'all') => {
    if (!parsed) return;
    const endpointIds =
      mode === 'all' ? ('all' as const) : [...selected];
    if (mode === 'selected' && endpointIds.length === 0) {
      setErrorMessage('Select at least one endpoint');
      setUiState('failed');
      return;
    }

    setUiState('generating');
    setErrorMessage(null);
    try {
      const data = await generateOpenApiClient({
        specification: parsed.specification,
        endpointIds,
        framework,
        library: framework === 'react-native' ? library : libraries[0]?.id,
      });
      setFiles(data.files);
      setActiveFile(0);
      setUiState('generated');
    } catch (error) {
      setUiState('failed');
      setFiles([]);
      setErrorMessage(error instanceof ApiClientError ? error.message : 'Generation failed');
    }
  };

  const copyActive = async () => {
    const file = files[activeFile];
    if (!file) return;
    await navigator.clipboard.writeText(file.content);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1200);
  };

  const downloadActive = () => {
    const file = files[activeFile];
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = file.filename.split('/').pop() ?? 'generated.txt';
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const downloadZip = () => {
    if (!files.length) return;
    const blob = buildZipBlob(files.map((f) => ({ filename: f.filename, content: f.content })));
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'apicaptain-openapi-client.zip';
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="OpenAPI input">
          {(
            [
              ['upload', 'Upload File'],
              ['paste', 'Paste'],
              ['url', 'URL'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={inputTab === id}
              onClick={() => setInputTab(id)}
              className={`rounded-full px-4 py-2 text-sm ${
                inputTab === id
                  ? 'bg-teal-500 font-medium text-slate-950'
                  : 'border border-slate-600 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {inputTab === 'upload' && (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void onUploadFile(file);
              }}
              className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center ${
                dragOver ? 'border-teal-400 bg-teal-400/10' : 'border-slate-600'
              }`}
            >
              <p className="text-sm text-slate-300">Drag & drop OpenAPI JSON/YAML here</p>
              <label className="mt-3 cursor-pointer rounded-md bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
                Choose file
                <input
                  type="file"
                  accept=".json,.yaml,.yml,application/json,text/yaml"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUploadFile(file);
                  }}
                />
              </label>
            </div>
          )}

          {inputTab === 'paste' && (
            <div className="space-y-3">
              <CodeEditor
                value={pasteText}
                onChange={setPasteText}
                language="plaintext"
                ariaLabel="OpenAPI document"
                height={280}
              />
              <button
                type="button"
                onClick={() => void runParseContent(pasteText, 'auto')}
                className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950"
              >
                Parse Specification
              </button>
            </div>
          )}

          {inputTab === 'url' && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/openapi.yaml"
                className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => void onLoadUrl()}
                className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950"
              >
                Load Specification
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          State: {uiState}
          {uiState === 'parsing' || uiState === 'uploading'
            ? ' — Parsing API specification...'
            : null}
          {parsed ? ` — ${parsed.endpointCount} endpoints found` : null}
        </p>
        {errorMessage ? <p className="mt-2 text-sm text-rose-400">{errorMessage}</p> : null}
      </section>

      {parsed ? (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{parsed.title}</h2>
                <p className="text-sm text-slate-400">
                  Version {parsed.version} · OpenAPI {parsed.openapiVersion} · {parsed.baseUrl || 'no base URL'}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200">
                  Select All
                </button>
                <button type="button" onClick={clearAll} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200">
                  Clear
                </button>
              </div>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search endpoints..."
              className="mt-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />

            <div className="mt-4 max-h-[420px] space-y-4 overflow-auto pr-1">
              {grouped.map(([tag, endpoints]) => (
                <div key={tag}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{tag}</p>
                  <ul className="space-y-1">
                    {endpoints.map((endpoint) => (
                      <li key={endpoint.id}>
                        <button
                          type="button"
                          onClick={() => setActiveEndpointId(endpoint.id)}
                          className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-800 ${
                            activeEndpointId === endpoint.id ? 'bg-slate-800' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(endpoint.id)}
                            onChange={() => toggleEndpoint(endpoint.id)}
                            onClick={(event) => event.stopPropagation()}
                          />
                          <span className={`w-16 font-mono text-xs font-semibold ${methodColor(endpoint.method)}`}>
                            {endpoint.method}
                          </span>
                          <span className="font-mono text-xs text-slate-200">{endpoint.path}</span>
                          <span className="truncate text-xs text-slate-500">{endpoint.summary}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-sm font-semibold text-white">Endpoint details</h3>
              {activeEndpoint ? (
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p>
                    <span className={methodColor(activeEndpoint.method)}>{activeEndpoint.method}</span>{' '}
                    <span className="font-mono">{activeEndpoint.path}</span>
                  </p>
                  <p className="text-slate-400">{activeEndpoint.description || activeEndpoint.summary || 'No description'}</p>
                  <p className="text-xs text-slate-500">operationId: {activeEndpoint.operationId}</p>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Parameters</p>
                    {activeEndpoint.parameters.length ? (
                      <ul className="mt-1 space-y-1">
                        {activeEndpoint.parameters.map((parameter) => (
                          <li key={`${parameter.in}-${parameter.name}`} className="font-mono text-xs">
                            {parameter.in}:{parameter.name}
                            {parameter.required ? ' *' : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">None</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Request body: {activeEndpoint.hasRequestBody ? 'yes' : 'no'} · Success:{' '}
                    {activeEndpoint.successStatus ?? 'n/a'}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Select an endpoint</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-sm font-semibold text-white">Generate</h3>
              <label className="mt-3 block text-xs text-slate-400">
                Framework
                <select
                  value={framework}
                  onChange={(event) => {
                    const next = event.target.value as ApiFramework;
                    setFramework(next);
                    setLibrary(librariesFor(next)[0]!.id);
                  }}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  {FRAMEWORKS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs text-slate-400">
                Library
                <select
                  value={library}
                  onChange={(event) => setLibrary(event.target.value as OpenApiLibrary)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  {libraries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void runGenerate('selected')}
                  className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950"
                >
                  Generate Selected
                </button>
                <button
                  type="button"
                  onClick={() => void runGenerate('all')}
                  className="rounded-md border border-teal-500/60 px-4 py-2 text-sm text-teal-300"
                >
                  Generate Entire API
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {files.length > 0 ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Generated API</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyActive()} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200">
                {copyState === 'copied' ? 'Copied' : 'Copy'}
              </button>
              <button type="button" onClick={downloadActive} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200">
                Download file
              </button>
              <button type="button" onClick={downloadZip} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200">
                Download ZIP
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <button
                key={file.filename}
                type="button"
                onClick={() => setActiveFile(index)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs ${
                  activeFile === index ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {file.filename}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <CodeEditor
              key={files[activeFile]?.filename}
              value={files[activeFile]?.content ?? ''}
              language={editorLanguageFor(files[activeFile]?.language ?? 'typescript')}
              readOnly
              ariaLabel="Generated OpenAPI client file"
              height={420}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
