'use client';

import { Suspense } from 'react';
import ProjectsPageInner from './ProjectsPageInner';

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <ProjectsPageInner />
    </Suspense>
  );
}
