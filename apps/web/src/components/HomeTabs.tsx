'use client';

import { useState } from 'react';
import { ApiCodeWorkspace } from './ApiCodeWorkspace';
import { GeneratorWorkspace } from './GeneratorWorkspace';

type Tab = 'api-code' | 'json-typescript';

export function HomeTabs() {
  const [tab, setTab] = useState<Tab>('api-code');

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {tab === 'api-code'
            ? 'React Native API Code Generator'
            : 'JSON to TypeScript Converter'}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
          {tab === 'api-code'
            ? 'Provide method, endpoint, request/response JSON, and generate reusable Axios or Fetch TypeScript files for React Native.'
            : 'Paste an API JSON response and generate clean TypeScript interfaces or type aliases.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Generator mode">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'api-code'}
            onClick={() => setTab('api-code')}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === 'api-code'
                ? 'bg-teal-500 font-medium text-slate-950'
                : 'border border-slate-600 text-slate-300 hover:border-teal-400'
            }`}
          >
            API Code Generator
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'json-typescript'}
            onClick={() => setTab('json-typescript')}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === 'json-typescript'
                ? 'bg-teal-500 font-medium text-slate-950'
                : 'border border-slate-600 text-slate-300 hover:border-teal-400'
            }`}
          >
            JSON → TypeScript
          </button>
        </div>
      </div>

      {tab === 'api-code' ? <ApiCodeWorkspace /> : <GeneratorWorkspace />}
    </div>
  );
}
