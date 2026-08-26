'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TypeScriptOutputKind } from '@apicaptain/types';
import { ApiClientError, EXAMPLE_JSON, generateTypeScript } from '../lib/apiClient';
import { validateJsonText } from '../lib/jsonValidation';
import { CodeEditor } from './CodeEditor';

type Status = 'idle' | 'loading' | 'ready' | 'invalid' | 'error';

export function GeneratorWorkspace() {
  const [jsonText, setJsonText] = useState(EXAMPLE_JSON);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const [rootName, setRootName] = useState('User');
  const [outputType, setOutputType] = useState<TypeScriptOutputKind>('interface');
  const [optionalProperties, setOptionalProperties] = useState(false);
  const [useSemicolon, setUseSemicolon] = useState(true);
  const [exportTypes, setExportTypes] = useState(true);

  const validation = useMemo(() => validateJsonText(jsonText), [jsonText]);

  const runGenerate = useCallback(async () => {
    const result = validateJsonText(jsonText);
    if (!result.valid) {
      setStatus('invalid');
      setErrorMessage(result.message ?? 'Invalid JSON');
      setCode('');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      const data = await generateTypeScript({
        json: result.value,
        rootName: rootName.trim() || 'Root',
        outputType,
        optionalProperties,
        useSemicolon,
        exportTypes,
      });
      setCode(data.code);
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setCode('');
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Failed to generate TypeScript');
      }
    }
  }, [jsonText, rootName, outputType, optionalProperties, useSemicolon, exportTypes]);

  useEffect(() => {
    void runGenerate();
    // Initial generation with example JSON
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = () => {
    setJsonText('');
    setCode('');
    setStatus('idle');
    setErrorMessage(null);
  };

  const handleExample = () => {
    setJsonText(EXAMPLE_JSON);
    setRootName('User');
  };

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1500);
  };

  const handleDownload = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(rootName || 'generated').replace(/[^a-zA-Z0-9_-]/g, '-')}.ts`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const statusLabel =
    status === 'loading'
      ? 'Generating…'
      : status === 'invalid'
        ? 'Invalid JSON'
        : status === 'error'
          ? 'Generation failed'
          : status === 'ready'
            ? 'Ready'
            : 'Waiting for JSON';

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Root type name
          <input
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-teal-400"
            value={rootName}
            onChange={(event) => setRootName(event.target.value)}
            aria-label="Root type name"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Language / output
          <select
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-teal-400"
            value={outputType}
            onChange={(event) => setOutputType(event.target.value as TypeScriptOutputKind)}
            aria-label="Output type"
          >
            <option value="interface">TypeScript Interface</option>
            <option value="type">TypeScript Type</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={optionalProperties}
            onChange={(event) => setOptionalProperties(event.target.checked)}
          />
          Optional properties
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={useSemicolon}
            onChange={(event) => setUseSemicolon(event.target.checked)}
          />
          Use semicolon
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={exportTypes}
            onChange={(event) => setExportTypes(event.target.checked)}
          />
          Export types
        </label>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <section className="flex min-h-[420px] flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              JSON input
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExample}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-teal-400"
              >
                Example JSON
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-rose-400"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="min-h-[320px] flex-1">
            <CodeEditor
              value={jsonText}
              language="json"
              onChange={setJsonText}
              ariaLabel="JSON input editor"
            />
          </div>
          {!validation.valid && jsonText.trim() ? (
            <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200" role="alert">
              {validation.message}
              {validation.line != null && validation.column != null
                ? ` (line ${validation.line}, column ${validation.column})`
                : ''}
            </p>
          ) : null}
        </section>

        <section className="flex min-h-[420px] flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                TypeScript output
              </h2>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                {statusLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runGenerate()}
                disabled={status === 'loading'}
                className="rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-teal-400 disabled:opacity-50"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!code}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-teal-400 disabled:opacity-50"
              >
                {copyState === 'copied' ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!code}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-teal-400 disabled:opacity-50"
              >
                Download .ts
              </button>
            </div>
          </div>
          <div className="min-h-[320px] flex-1">
            {status === 'idle' && !code ? (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
                Paste JSON on the left and click Regenerate to produce TypeScript types.
              </div>
            ) : status === 'loading' ? (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
                Generating TypeScript…
              </div>
            ) : (
              <CodeEditor
                value={code}
                language="typescript"
                readOnly
                height={360}
                ariaLabel="Generated TypeScript editor"
              />
            )}
          </div>
          {errorMessage && status !== 'invalid' ? (
            <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
