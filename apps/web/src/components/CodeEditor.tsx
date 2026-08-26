'use client';

import Editor, { type OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  language: 'json' | 'typescript';
  onChange?: (value: string) => void;
  readOnly?: boolean;
  ariaLabel: string;
  /** Explicit height avoids Monaco collapsing to 0px with height="100%". */
  height?: number | string;
}

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
    // Ensure layout after mount in dynamic panels
    window.requestAnimationFrame(() => {
      editor.layout();
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-[#0f172a]">
      <Editor
        height={height}
        defaultLanguage={language}
        language={language}
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
