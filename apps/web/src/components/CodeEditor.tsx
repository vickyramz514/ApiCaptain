'use client';

import Editor, { type OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  language: 'json' | 'typescript';
  onChange?: (value: string) => void;
  readOnly?: boolean;
  ariaLabel: string;
}

export function CodeEditor({
  value,
  language,
  onChange,
  readOnly = false,
  ariaLabel,
}: CodeEditorProps) {
  const handleMount: OnMount = (editor) => {
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      readOnly,
      ariaLabel,
    });
  };

  return (
    <div className="h-full min-h-[280px] overflow-hidden rounded-xl border border-slate-700/80 bg-[#0f172a]">
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(next) => onChange?.(next ?? '')}
        onMount={handleMount}
        loading={<div className="p-4 text-sm text-slate-400">Loading editor…</div>}
        options={{
          automaticLayout: true,
          readOnly,
        }}
      />
    </div>
  );
}
