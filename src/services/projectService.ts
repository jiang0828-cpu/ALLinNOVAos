// src/services/projectService.ts
// 项目管理 API 服务层

import { apiClient } from './apiClient';
import type {
  Project,
  ProjectDetailFull,
  ProjectListResponse,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectFilters,
} from '../types/projects';

const DEFAULT_WORKSPACE_ID = 'ws_default';

function buildQueryString(filters: ProjectFilters & { workspaceId?: string }): string {
  const params = new URLSearchParams();

  if (filters.workspaceId) params.set('workspaceId', filters.workspaceId);
  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }
  if (filters.priority && filters.priority.length > 0) {
    params.set('priority', filters.priority.join(','));
  }
  if (filters.domainId) params.set('domainId', filters.domainId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getProjects(
  filters: ProjectFilters = {}
): Promise<ProjectListResponse> {
  const queryParams: ProjectFilters & { workspaceId: string } = {
    ...filters,
    workspaceId: DEFAULT_WORKSPACE_ID,
    page: filters.page ?? 1,
    limit: filters.limit ?? 50,
  };

  const path = `/v1/projects${buildQueryString(queryParams)}`;
  return apiClient.get<ProjectListResponse>(path);
}

export async function getProjectById(id: string): Promise<ProjectDetailFull> {
  const path = `/v1/projects/${id}?workspaceId=${DEFAULT_WORKSPACE_ID}`;
  return apiClient.get<ProjectDetailFull>(path);
}

export async function createProject(
  payload: Omit<CreateProjectPayload, 'workspaceId'>
): Promise<Project> {
  const data: CreateProjectPayload = {
    ...payload,
    workspaceId: DEFAULT_WORKSPACE_ID,
  };

  return apiClient.post<Project>('/v1/projects', data);
}

export async function updateProject(
  id: string,
  payload: UpdateProjectPayload
): Promise<Project> {
  return apiClient.patch<Project>(`/v1/projects/${id}`, payload);
}

export async function deleteProject(id: string): Promise<Project> {
  return apiClient.delete<Project>(`/v1/projects/${id}?workspaceId=${DEFAULT_WORKSPACE_ID}`);
}
