'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CreateProjectRequest, ProjectSummary } from '@apicaptain/types';
import {
  ApiClientError,
  createProject,
  deleteProject,
  listProjects,
} from '../../lib/apiClient';
import { useAuth } from '../../components/AuthProvider';
import { SiteHeader } from '../../components/SiteHeader';

export default function ProjectsPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [showNew, setShowNew] = useState(params.get('new') === '1');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<CreateProjectRequest['sourceType']>('API');
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const data = await listProjects();
    setProjects(data.projects);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?next=/projects');
      return;
    }
    void reload().catch((err) =>
      setError(err instanceof ApiClientError ? err.message : 'Failed to load projects'),
    );
  }, [user, authLoading, router]);

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const project = await createProject({ name, description, sourceType });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not create project');
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this project?')) return;
    await deleteProject(id);
    await reload();
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-white">My Projects</h1>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950"
          >
            + New Project
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        {showNew ? (
          <form
            onSubmit={(event) => void onCreate(event)}
            className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
          >
            <h2 className="text-lg font-semibold text-white">New project</h2>
            <input
              required
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              placeholder="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <select
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value as CreateProjectRequest['sourceType'])
              }
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="API">API</option>
              <option value="OPENAPI">OPENAPI</option>
              <option value="JSON">JSON</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <ul className="mt-8 space-y-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
            >
              <div>
                <p className="font-medium text-white">{project.name}</p>
                <p className="text-xs text-slate-500">
                  {project.sourceType}
                  {project.framework ? ` · ${project.framework}` : ''}
                  {project.library ? ` + ${project.library}` : ''} · Updated{' '}
                  {new Date(project.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <Link
                  href={`/projects/${project.id}`}
                  className="rounded-md border border-slate-600 px-3 py-1.5"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => void onDelete(project.id)}
                  className="rounded-md border border-rose-700/50 px-3 py-1.5 text-rose-300"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {projects.length === 0 ? (
            <li className="text-sm text-slate-500">No projects yet. Create one to save API specs.</li>
          ) : null}
        </ul>
      </main>
    </div>
  );
}
