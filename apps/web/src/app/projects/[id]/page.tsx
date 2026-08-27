'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import type { GeneratedFile, ProjectDetail } from '@apicaptain/types';
import {
  ApiClientError,
  deleteProject,
  fetchProjectHistory,
  generateProject,
  getProject,
  updateProject,
} from '../../../lib/apiClient';
import { useAuth } from '../../../components/AuthProvider';
import { SiteHeader } from '../../../components/SiteHeader';
import { CodeEditor } from '../../../components/CodeEditor';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [activeFile, setActiveFile] = useState(0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=/projects/${id}`);
      return;
    }
    void (async () => {
      try {
        const data = await getProject(id);
        setProject(data);
        setName(data.name);
        setDescription(data.description ?? '');
        const hist = await fetchProjectHistory(id);
        setHistory(hist.generations);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load project');
      }
    })();
  }, [user, authLoading, router, id]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const updated = await updateProject(id, { name, description });
      setProject(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  };

  const onGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await generateProject(id);
      setFiles((result.files as GeneratedFile[]) ?? []);
      setActiveFile(0);
      const hist = await fetchProjectHistory(id);
      setHistory(hist.generations);
      const refreshed = await getProject(id);
      setProject(refreshed);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this project permanently?')) return;
    await deleteProject(id);
    router.push('/projects');
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/projects" className="text-sm text-teal-400 hover:underline">
          ← Projects
        </Link>
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
        {project ? (
          <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold text-white">{project.name}</h1>
                <p className="mt-1 text-sm text-slate-400">{project.description || 'No description'}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Source: {project.sourceType}
                  {project.framework ? ` · ${project.framework}` : ''}
                  {project.library ? ` + ${project.library}` : ''}
                  {project.openApiVersion ? ` · OpenAPI ${project.openApiVersion}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onGenerate()}
                  className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
                >
                  {busy ? 'Generating…' : 'Generate'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                  className="rounded-md border border-slate-600 px-4 py-2 text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete()}
                  className="rounded-md border border-rose-700/50 px-4 py-2 text-sm text-rose-300"
                >
                  Delete
                </button>
              </div>
            </div>

            {editing ? (
              <form onSubmit={(event) => void onSave(event)} className="mt-4 space-y-3 rounded-xl border border-slate-800 p-4">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  rows={3}
                />
                <button type="submit" className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950">
                  Save changes
                </button>
              </form>
            ) : null}

            {project.sourceType === 'OPENAPI' && project.sourceContent ? (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-white">Saved OpenAPI source</h2>
                <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                  {project.sourceContent.slice(0, 4000)}
                  {project.sourceContent.length > 4000 ? '\n…' : ''}
                </pre>
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="text-lg font-semibold text-white">Generation history</h2>
              <ul className="mt-3 space-y-2">
                {history.length === 0 ? (
                  <li className="text-sm text-slate-500">No generations yet.</li>
                ) : (
                  history.map((item) => (
                    <li key={String(item.id)} className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
                      {String(item.framework ?? item.sourceType)}
                      {item.library ? ` + ${String(item.library)}` : ''} ·{' '}
                      {String(item.status)} · {new Date(String(item.createdAt)).toLocaleString()}
                      {item.durationMs ? ` · ${item.durationMs}ms` : ''}
                    </li>
                  ))
                )}
              </ul>
            </section>

            {files.length > 0 ? (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-white">Generated files</h2>
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
                    language="typescript"
                    readOnly
                    ariaLabel="Generated project file"
                    height={360}
                  />
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <p className="mt-6 text-sm text-slate-500">Loading…</p>
        )}
      </main>
    </div>
  );
}
