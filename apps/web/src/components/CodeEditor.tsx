'use client';

import Editor, { type OnMount } from '@monaco-editor/react';

type EditorLanguage =
  | 'json'
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'swift'
  | 'kotlin'
  | 'dart'
  | 'plaintext';

interface CodeEditorProps {
  value: string;
  language: EditorLanguage;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  ariaLabel: string;
  height?: number | string;
}

const monacoLanguage = (language: EditorLanguage): string => {
  if (language === 'dart' || language === 'kotlin') return 'java';
  if (language === 'swift') return 'swift';
  return language;
};

export function CodeEditor({
  value,
  language,
  onChange,
  readOnly = false,
  ariaLabel,
  height = 320,
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
    window.requestAnimationFrame(() => {
      editor.layout();
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-[#0f172a]">
      <Editor
        height={height}
        defaultLanguage={monacoLanguage(language)}
        language={monacoLanguage(language)}
        theme="vs-dark"
        value={value}
        path={`${ariaLabel}-${language}`}
        onChange={(next) => onChange?.(next ?? '')}
        onMount={handleMount}
        loading={<div className="p-4 text-sm text-slate-400">Loading editor…</div>}
        options={{
          automaticLayout: true,
          readOnly,
          domReadOnly: readOnly,
        }}
      />
    </div>
  );
}
