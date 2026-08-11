// src/services/taskService.ts
// 任务管理 API 服务层

import { apiClient } from './apiClient';
import type {
  TaskDetail,
  TaskListResponse,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskFilters,
} from '../types/tasks';

const DEFAULT_WORKSPACE_ID = 'ws_default';

/**
 * 构建查询字符串
 */
function buildQueryString(filters: TaskFilters & { workspaceId?: string }): string {
  const params = new URLSearchParams();

  if (filters.workspaceId) params.set('workspaceId', filters.workspaceId);
  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }
  if (filters.priority && filters.priority.length > 0) {
    params.set('priority', filters.priority.join(','));
  }
  if (filters.domainId) params.set('domainId', filters.domainId);
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * 获取任务列表
 */
export async function getTasks(
  filters: TaskFilters = {}
): Promise<TaskListResponse> {
  const queryParams: TaskFilters & { workspaceId: string } = {
    ...filters,
    workspaceId: DEFAULT_WORKSPACE_ID,
    page: filters.page ?? 1,
    limit: filters.limit ?? 50,
  };

  const path = `/v1/tasks${buildQueryString(queryParams)}`;
  return apiClient.get<TaskListResponse>(path);
}

/**
 * 获取单个任务
 */
export async function getTaskById(id: string): Promise<TaskDetail> {
  const path = `/v1/tasks/${id}?workspaceId=${DEFAULT_WORKSPACE_ID}`;
  return apiClient.get<TaskDetail>(path);
}

/**
 * 创建任务
 */
export async function createTask(
  payload: Omit<CreateTaskPayload, 'workspaceId'>
): Promise<TaskDetail> {
  const data: CreateTaskPayload = {
    ...payload,
    workspaceId: DEFAULT_WORKSPACE_ID,
  };

  return apiClient.post<TaskDetail>('/v1/tasks', data);
}

/**
 * 更新任务
 */
export async function updateTask(
  id: string,
  payload: UpdateTaskPayload
): Promise<TaskDetail> {
  return apiClient.patch<TaskDetail>(`/v1/tasks/${id}`, payload);
}

/**
 * 开始任务（TODO -> IN_PROGRESS）
 */
export async function startTask(id: string): Promise<TaskDetail> {
  return apiClient.post<TaskDetail>(`/v1/tasks/${id}/start`, {
    workspaceId: DEFAULT_WORKSPACE_ID,
  });
}

/**
 * 完成任务（IN_PROGRESS -> DONE）
 */
export async function completeTask(
  id: string,
  completionNote?: string,
  actualMinutes?: number
): Promise<TaskDetail> {
  return apiClient.post<TaskDetail>(`/v1/tasks/${id}/complete`, {
    workspaceId: DEFAULT_WORKSPACE_ID,
    completionNote,
    actualMinutes,
  });
}

/**
 * 取消任务
 */
export async function cancelTask(id: string): Promise<TaskDetail> {
  return apiClient.post<TaskDetail>(`/v1/tasks/${id}/cancel`, {
    workspaceId: DEFAULT_WORKSPACE_ID,
  });
}

/**
 * 删除任务（软删除）
 */
export async function deleteTask(id: string): Promise<TaskDetail> {
  return apiClient.delete<TaskDetail>(`/v1/tasks/${id}?workspaceId=${DEFAULT_WORKSPACE_ID}`);
}

/**
 * 估算任务数量（按状态统计）
 */
export async function getTaskCountsByStatus(): Promise<Record<string, number>> {
  try {
    const response = await getTasks({ limit: 100 });
    const counts: Record<string, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      BLOCKED: 0,
      DONE: 0,
      CANCELLED: 0,
    };

    response.data.forEach((task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });

    return counts;
  } catch {
    return { TODO: 0, IN_PROGRESS: 0, BLOCKED: 0, DONE: 0, CANCELLED: 0 };
  }
}
