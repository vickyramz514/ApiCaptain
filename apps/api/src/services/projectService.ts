import type {
  CreateProjectRequest,
  DashboardData,
  GenerationHistoryItem,
  ProjectDetail,
  ProjectSourceType,
  ProjectSummary,
  PublicUser,
  UpdateProjectRequest,
} from '@apicaptain/types';
import { AppError } from '../utils/errors.js';
import { memoryStore, useMemoryStore, type StoreGeneration, type StoreProject } from '../db/memoryStore.js';
import { prisma } from '../db/prisma.js';
import { assertCanCreateProject, getUsageSnapshot, recordSuccessfulGeneration } from './usageService.js';
import { resolveEffectivePlan } from './entitlementService.js';

const SOURCE_TYPES = new Set(['JSON', 'API', 'OPENAPI']);

const toSummary = (project: StoreProject | {
  id: string;
  name: string;
  description: string | null;
  sourceType: string;
  framework: string | null;
  library: string | null;
  openApiVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastGeneratedAt: Date | null;
}): ProjectSummary => ({
  id: project.id,
  name: project.name,
  description: project.description,
  sourceType: project.sourceType as ProjectSourceType,
  framework: project.framework,
  library: project.library,
  openApiVersion: project.openApiVersion,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
  lastGeneratedAt: project.lastGeneratedAt ? project.lastGeneratedAt.toISOString() : null,
});

const toDetail = (project: StoreProject | (StoreProject & object)): ProjectDetail => ({
  ...toSummary(project),
  sourceContent: 'sourceContent' in project ? (project.sourceContent as string | null) : null,
  sourceMeta: 'sourceMeta' in project ? project.sourceMeta : null,
});

const toHistoryItem = (item: StoreGeneration | {
  id: string;
  sourceType: string;
  framework: string | null;
  language: string | null;
  library: string | null;
  endpointCount: number | null;
  status: string;
  durationMs: number | null;
  createdAt: Date;
}): GenerationHistoryItem => ({
  id: item.id,
  sourceType: item.sourceType,
  framework: item.framework,
  language: item.language,
  library: item.library,
  endpointCount: item.endpointCount,
  status: item.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
  durationMs: item.durationMs,
  createdAt: item.createdAt.toISOString(),
});

export const createProject = async (
  user: PublicUser,
  request: CreateProjectRequest,
): Promise<ProjectDetail> => {
  if (!request.name?.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Project name is required');
  }
  if (!SOURCE_TYPES.has(request.sourceType)) {
    throw new AppError('VALIDATION_ERROR', 'sourceType must be JSON, API, or OPENAPI');
  }

  await assertCanCreateProject(user.id);

  if (useMemoryStore()) {
    const project = memoryStore.createProject({
      userId: user.id,
      name: request.name.trim(),
      description: request.description?.trim() || null,
      sourceType: request.sourceType,
      sourceContent: request.sourceContent ?? null,
      sourceMeta: request.sourceMeta ?? null,
      openApiVersion: request.openApiVersion ?? null,
      framework: request.framework ?? null,
      library: request.library ?? null,
    });
    return toDetail(project);
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: request.name.trim(),
      description: request.description?.trim() || null,
      sourceType: request.sourceType,
      sourceContent: request.sourceContent ?? null,
      sourceMeta: request.sourceMeta as object | undefined,
      openApiVersion: request.openApiVersion ?? null,
      framework: request.framework ?? null,
      library: request.library ?? null,
    },
  });
  return toDetail(project);
};

export const listProjects = async (user: PublicUser): Promise<ProjectSummary[]> => {
  if (useMemoryStore()) {
    return memoryStore.listProjects(user.id).map(toSummary);
  }
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  });
  return projects.map(toSummary);
};

export const getProject = async (user: PublicUser, projectId: string): Promise<ProjectDetail> => {
  if (useMemoryStore()) {
    const project = memoryStore.findProject(user.id, projectId);
    if (!project) throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
    return toDetail(project);
  }
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
  return toDetail(project);
};

export const updateProject = async (
  user: PublicUser,
  projectId: string,
  request: UpdateProjectRequest,
): Promise<ProjectDetail> => {
  if (useMemoryStore()) {
    const existing = memoryStore.findProject(user.id, projectId);
    if (!existing) throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
    const updated = memoryStore.updateProject(user.id, projectId, {
      name: request.name?.trim() ?? existing.name,
      description:
        request.description === undefined ? existing.description : request.description,
      sourceContent:
        request.sourceContent === undefined ? existing.sourceContent : request.sourceContent,
      sourceMeta: request.sourceMeta === undefined ? existing.sourceMeta : request.sourceMeta,
      openApiVersion:
        request.openApiVersion === undefined ? existing.openApiVersion : request.openApiVersion,
      framework: request.framework === undefined ? existing.framework : request.framework,
      library: request.library === undefined ? existing.library : request.library,
    });
    return toDetail(updated!);
  }

  const existing = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!existing) throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);

  const updated = await prisma.project.update({
    where: { id: existing.id },
    data: {
      name: request.name?.trim() ?? existing.name,
      description:
        request.description === undefined ? existing.description : request.description,
      sourceContent:
        request.sourceContent === undefined ? existing.sourceContent : request.sourceContent,
      sourceMeta:
        request.sourceMeta === undefined
          ? undefined
          : (request.sourceMeta as object | undefined),
      openApiVersion:
        request.openApiVersion === undefined ? existing.openApiVersion : request.openApiVersion,
      framework: request.framework === undefined ? existing.framework : request.framework,
      library: request.library === undefined ? existing.library : request.library,
    },
  });
  return toDetail(updated);
};

export const deleteProject = async (user: PublicUser, projectId: string): Promise<void> => {
  if (useMemoryStore()) {
    const deleted = memoryStore.deleteProject(user.id, projectId);
    if (!deleted) throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
    return;
  }
  const existing = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!existing) throw new AppError('PROJECT_NOT_FOUND', 'Project not found', 404);
  await prisma.project.delete({ where: { id: existing.id } });
};

export const listProjectGenerations = async (
  user: PublicUser,
  projectId: string,
): Promise<GenerationHistoryItem[]> => {
  await getProject(user, projectId);
  if (useMemoryStore()) {
    return memoryStore.listGenerationsForProject(user.id, projectId).map(toHistoryItem);
  }
  const items = await prisma.generation.findMany({
    where: { userId: user.id, projectId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return items.map(toHistoryItem);
};

export const recordProjectGeneration = async (input: {
  user: PublicUser;
  projectId: string;
  sourceType: string;
  framework?: string | null;
  language?: string | null;
  library?: string | null;
  endpointCount?: number | null;
  durationMs?: number | null;
  status: 'SUCCESS' | 'FAILED';
  metadata?: unknown;
}): Promise<GenerationHistoryItem> => {
  const project = await getProject(input.user, input.projectId);

  if (input.status === 'SUCCESS') {
    await recordSuccessfulGeneration(input.user.id);
  }

  if (useMemoryStore()) {
    if (input.status === 'SUCCESS') {
      memoryStore.updateProject(input.user.id, project.id, { lastGeneratedAt: new Date() });
    }
    const generation = memoryStore.createGeneration({
      userId: input.user.id,
      projectId: project.id,
      sourceType: input.sourceType,
      framework: input.framework ?? null,
      language: input.language ?? null,
      library: input.library ?? null,
      endpointCount: input.endpointCount ?? null,
      status: input.status,
      durationMs: input.durationMs ?? null,
      metadata: input.metadata ?? null,
    });
    return toHistoryItem(generation);
  }

  const generation = await prisma.generation.create({
    data: {
      userId: input.user.id,
      projectId: project.id,
      sourceType: input.sourceType,
      framework: input.framework ?? null,
      language: input.language ?? null,
      library: input.library ?? null,
      endpointCount: input.endpointCount ?? null,
      status: input.status,
      durationMs: input.durationMs ?? null,
      metadata: input.metadata as object | undefined,
      generatedCode: '',
      rootName: project.name,
      outputType: input.framework ?? 'api',
      inputJson: {},
    },
  });

  if (input.status === 'SUCCESS') {
    await prisma.project.update({
      where: { id: project.id },
      data: { lastGeneratedAt: new Date() },
    });
  }

  return toHistoryItem(generation);
};

export const getDashboard = async (user: PublicUser): Promise<DashboardData> => {
  const plan = await resolveEffectivePlan(user.id);
  const currentUser = { ...user, plan };
  const usage = await getUsageSnapshot(user.id, plan);
  if (useMemoryStore()) {
    return {
      user: currentUser,
      usage,
      projectCount: usage.projectCount,
      recentGenerations: memoryStore.listRecentGenerations(user.id, 5).map(toHistoryItem),
      recentProjects: memoryStore.listProjects(user.id).slice(0, 5).map(toSummary),
    };
  }

  const [recentGenerations, recentProjects] = await Promise.all([
    prisma.generation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    user: currentUser,
    usage,
    projectCount: usage.projectCount,
    recentGenerations: recentGenerations.map(toHistoryItem),
    recentProjects: recentProjects.map(toSummary),
  };
};
