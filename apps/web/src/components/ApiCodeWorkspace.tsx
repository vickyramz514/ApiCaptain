'use client';

import { useMemo, useState } from 'react';
import type { GeneratedFile, HttpLibrary, HttpMethod } from '@apicaptain/types';
import {
  ApiClientError,
  EXAMPLE_API_REQUEST,
  EXAMPLE_API_RESPONSE,
  generateApiCode,
} from '../lib/apiClient';
import { validateJsonText } from '../lib/jsonValidation';
import { CodeEditor } from './CodeEditor';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const BODY_METHODS = new Set<HttpMethod>(['POST', 'PUT', 'PATCH']);

export function ApiCodeWorkspace() {
  const [method, setMethod] = useState<HttpMethod>('POST');
  const [endpoint, setEndpoint] = useState('/api/login');
  const [requestText, setRequestText] = useState(EXAMPLE_API_REQUEST);
  const [responseText, setResponseText] = useState(EXAMPLE_API_RESPONSE);
  const [library, setLibrary] = useState<HttpLibrary>('axios');
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [activeFile, setActiveFile] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const needsBody = BODY_METHODS.has(method);
  const requestValidation = useMemo(
    () => (needsBody ? validateJsonText(requestText) : { valid: true as const, value: null }),
    [needsBody, requestText],
  );
  const responseValidation = useMemo(() => validateJsonText(responseText), [responseText]);

  const runGenerate = async () => {
    setErrorMessage(null);

    if (!endpoint.trim().startsWith('/')) {
      setStatus('error');
      setErrorMessage('Endpoint must start with "/"');
      return;
    }

    if (needsBody && !requestValidation.valid) {
      setStatus('error');
      setErrorMessage(requestValidation.message ?? 'Invalid request JSON');
      return;
    }

    if (!responseValidation.valid) {
      setStatus('error');
      setErrorMessage(responseValidation.message ?? 'Invalid response JSON');
      return;
    }

    setStatus('loading');

    try {
      const data = await generateApiCode({
        method,
        endpoint: endpoint.trim(),
        framework: 'react-native',
        library,
        requestJson: needsBody ? requestValidation.value : null,
        responseJson: responseValidation.value,
      });
      setFiles(data.files);
      setActiveFile(0);
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setFiles([]);
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to generate API code',
      );
    }
  };

  const currentFile = files[activeFile];

  const handleCopy = async () => {
    if (!currentFile) return;
    await navigator.clipboard.writeText(currentFile.content);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1500);
  };

  const handleDownload = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = currentFile.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    for (const file of files) {
      const blob = new Blob([file.content], { type: 'text/typescript;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Method
          <select
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-teal-400"
            value={method}
            onChange={(event) => setMethod(event.target.value as HttpMethod)}
          >
            {METHODS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300 md:col-span-1 lg:col-span-1">
          Endpoint
          <input
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-slate-100 outline-none focus:border-teal-400"
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="/api/users"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Framework
          <select
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-teal-400"
            value="react-native"
            disabled
          >
            <option value="react-native">React Native</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Library
          <select
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-teal-400"
            value={library}
            onChange={(event) => setLibrary(event.target.value as HttpLibrary)}
          >
            <option value="axios">Axios</option>
            <option value="fetch">Fetch</option>
          </select>
        </label>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex min-h-[280px] flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Request body {needsBody ? '' : '(optional)'}
            </h2>
            {!needsBody ? (
              <span className="text-xs text-slate-500">Not required for {method}</span>
            ) : null}
          </div>
          <div className={`min-h-[240px] flex-1 ${needsBody ? '' : 'opacity-50'}`}>
            <CodeEditor
              value={needsBody ? requestText : ''}
              language="json"
              onChange={setRequestText}
              readOnly={!needsBody}
              ariaLabel="Request JSON editor"
            />
          </div>
          {needsBody && !requestValidation.valid ? (
            <p className="text-sm text-rose-300" role="alert">
              {requestValidation.message}
            </p>
          ) : null}
        </section>

        <section className="flex min-h-[280px] flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Response body
          </h2>
          <div className="min-h-[240px] flex-1">
            <CodeEditor
              value={responseText}
              language="json"
              onChange={setResponseText}
              ariaLabel="Response JSON editor"
            />
          </div>
          {!responseValidation.valid ? (
            <p className="text-sm text-rose-300" role="alert">
              {responseValidation.message}
            </p>
          ) : null}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void runGenerate()}
          disabled={status === 'loading'}
          className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:opacity-50"
        >
          {status === 'loading' ? 'Generating…' : 'Generate API Code'}
        </button>
        {files.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-teal-400"
            >
              {copyState === 'copied' ? 'Copied' : 'Copy file'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-teal-400"
            >
              Download file
            </button>
            <button
              type="button"
              onClick={handleDownloadAll}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-teal-400"
            >
              Download all
            </button>
          </>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section className="flex min-h-[360px] flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <button
              key={file.filename}
              type="button"
              onClick={() => setActiveFile(index)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                index === activeFile
                  ? 'bg-teal-500 text-slate-950'
                  : 'border border-slate-600 text-slate-300 hover:border-teal-400'
              }`}
            >
              {file.filename}
            </button>
          ))}
        </div>

        {status === 'idle' && files.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
            Configure your API and click Generate API Code to produce React Native TypeScript files.
          </div>
        ) : status === 'loading' ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
            Generating production-ready API files…
          </div>
        ) : currentFile ? (
          <div className="min-h-[360px]">
            <CodeEditor
              key={currentFile.filename}
              value={currentFile.content}
              language="typescript"
              readOnly
              height={360}
              ariaLabel={`Generated ${currentFile.filename}`}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
