import type { NextFunction, Response } from 'express';
import {
  createProject,
  deleteProject,
  getDashboard,
  getProject,
  listProjectGenerations,
  listProjects,
  recordProjectGeneration,
  updateProject,
} from '../services/projectService.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { validateCreateProject, validateUpdateProject } from '../validators/saas.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { assertCanGenerate } from '../services/usageService.js';
import { generateApiCodeService } from '../services/generateApiCodeService.js';
import { generateOpenApiService } from '../services/openapiService.js';
import { generateTypeScriptService } from '../services/generateTypeScriptService.js';
import { validateGenerateApiCodeRequest } from '../validators/generateApiCode.js';
import { validateGenerateTypeScriptRequest } from '../validators/generateTypeScript.js';
import { validateOpenApiGenerateRequest } from '../validators/openapi.js';

export const dashboardController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    sendSuccess(res, await getDashboard(req.user));
  } catch (error) {
    next(error);
  }
};

export const createProjectController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    const body = validateCreateProject(req.body);
    sendSuccess(res, await createProject(req.user, body), 201);
  } catch (error) {
    next(error);
  }
};

export const listProjectsController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    sendSuccess(res, { projects: await listProjects(req.user) });
  } catch (error) {
    next(error);
  }
};

export const getProjectController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    const id = String(req.params.id ?? '');
    sendSuccess(res, await getProject(req.user, id));
  } catch (error) {
    next(error);
  }
};

export const updateProjectController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    const id = String(req.params.id ?? '');
    const body = validateUpdateProject(req.body);
    sendSuccess(res, await updateProject(req.user, id, body));
  } catch (error) {
    next(error);
  }
};

export const deleteProjectController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    const id = String(req.params.id ?? '');
    await deleteProject(req.user, id);
    sendSuccess(res, { ok: true });
  } catch (error) {
    next(error);
  }
};

export const projectHistoryController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    const id = String(req.params.id ?? '');
    sendSuccess(res, { generations: await listProjectGenerations(req.user, id) });
  } catch (error) {
    next(error);
  }
};

export const projectGenerateController = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const started = Date.now();
  try {
    if (!req.user) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);
    const id = String(req.params.id ?? '');
    const project = await getProject(req.user, id);
    await assertCanGenerate(req.user.id);

    let files: unknown;
    let meta: Record<string, unknown> = {};
    let endpointCount: number | null = null;
    let language: string | null = null;

    if (project.sourceType === 'OPENAPI') {
      if (!project.sourceMeta || typeof project.sourceMeta !== 'object') {
        throw new AppError('VALIDATION_ERROR', 'Project is missing OpenAPI specification metadata');
      }
      const sourceMeta = project.sourceMeta as Record<string, unknown>;
      const request = validateOpenApiGenerateRequest({
        specification: sourceMeta.specification,
        endpointIds: sourceMeta.endpointIds ?? 'all',
        framework: project.framework ?? sourceMeta.framework ?? 'react-native',
        library: project.library ?? sourceMeta.library,
        baseUrlOverride: sourceMeta.baseUrlOverride,
      });
      const data = generateOpenApiService(request);
      files = data.files;
      meta = data.meta as unknown as Record<string, unknown>;
      endpointCount = data.meta.endpointCount;
      language = data.files[0]?.language ?? null;
    } else if (project.sourceType === 'API') {
      const sourceMeta = (project.sourceMeta ?? {}) as Record<string, unknown>;
      const request = validateGenerateApiCodeRequest({
        method: sourceMeta.method,
        endpoint: sourceMeta.endpoint,
        requestJson: sourceMeta.requestJson,
        responseJson: sourceMeta.responseJson,
        framework: project.framework ?? sourceMeta.framework,
        library: project.library ?? sourceMeta.library,
        rootName: sourceMeta.rootName,
      });
      const data = generateApiCodeService(request);
      files = data.files;
      meta = data.meta as unknown as Record<string, unknown>;
      language = data.files[0]?.language ?? null;
    } else {
      const sourceMeta = (project.sourceMeta ?? {}) as Record<string, unknown>;
      const json =
        sourceMeta.json ??
        (project.sourceContent ? JSON.parse(project.sourceContent) : undefined);
      const request = validateGenerateTypeScriptRequest({
        json,
        rootName: sourceMeta.rootName ?? project.name,
        outputType: sourceMeta.outputType,
        optionalProperties: sourceMeta.optionalProperties,
        useSemicolon: sourceMeta.useSemicolon,
        exportTypes: sourceMeta.exportTypes,
      });
      const data = generateTypeScriptService(request);
      files = [{ filename: `${project.name || 'types'}.ts`, content: data.code, language: 'typescript' }];
      language = 'typescript';
      meta = { rootName: request.rootName };
    }

    await recordProjectGeneration({
      user: req.user,
      projectId: project.id,
      sourceType: project.sourceType,
      framework: project.framework,
      language,
      library: project.library,
      endpointCount,
      durationMs: Date.now() - started,
      status: 'SUCCESS',
      metadata: meta,
    });

    sendSuccess(res, { files, meta, projectId: project.id });
  } catch (error) {
    next(error);
  }
};
