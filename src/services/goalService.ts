// src/services/goalService.ts
// 目标管理 API 服务层

import { apiClient } from './apiClient';
import type {
  Goal,
  GoalListResponse,
  CreateGoalPayload,
  UpdateGoalPayload,
  GoalFilters,
} from '../types/goals';

const DEFAULT_WORKSPACE_ID = 'ws_default';

function buildQueryString(filters: GoalFilters & { workspaceId?: string }): string {
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

export async function getGoals(
  filters: GoalFilters = {}
): Promise<GoalListResponse> {
  const queryParams: GoalFilters & { workspaceId: string } = {
    ...filters,
    workspaceId: DEFAULT_WORKSPACE_ID,
    page: filters.page ?? 1,
    limit: filters.limit ?? 50,
  };

  const path = `/v1/goals${buildQueryString(queryParams)}`;
  return apiClient.get<GoalListResponse>(path);
}

export async function getGoalById(id: string): Promise<Goal> {
  const path = `/v1/goals/${id}?workspaceId=${DEFAULT_WORKSPACE_ID}`;
  return apiClient.get<Goal>(path);
}

export async function createGoal(
  payload: Omit<CreateGoalPayload, 'workspaceId'>
): Promise<Goal> {
  const data: CreateGoalPayload = {
    ...payload,
    workspaceId: DEFAULT_WORKSPACE_ID,
  };

  return apiClient.post<Goal>('/v1/goals', data);
}

export async function updateGoal(
  id: string,
  payload: UpdateGoalPayload
): Promise<Goal> {
  return apiClient.patch<Goal>(`/v1/goals/${id}`, payload);
}

export async function deleteGoal(id: string): Promise<Goal> {
  return apiClient.delete<Goal>(`/v1/goals/${id}?workspaceId=${DEFAULT_WORKSPACE_ID}`);
}
