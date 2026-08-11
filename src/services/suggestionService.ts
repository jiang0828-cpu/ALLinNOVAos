// src/services/suggestionService.ts
// 行动建议 (Suggestion) API 服务层

import { apiClient } from './apiClient';
import type {
  SuggestionFilters,
  SuggestionListResponse,
  SuggestionStatus,
  SuggestionWorkItem,
} from '../types/suggestions';

const DEFAULT_WORKSPACE_ID = 'ws_default';

function buildQueryString(filters: SuggestionFilters & { workspaceId?: string }): string {
  const params = new URLSearchParams();

  if (filters.workspaceId) params.set('workspaceId', filters.workspaceId);
  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }
  if (filters.sourceType) params.set('sourceType', filters.sourceType);
  if (filters.suggestionType) params.set('suggestionType', filters.suggestionType);
  if (filters.cycleId) params.set('cycleId', filters.cycleId);
  // 注意：后端 QuerySuggestionsDto 的 page/limit 字段缺少 @Transform 转换，
  // 传字符串会被 class-validator 拒绝 (400)。此处不发送分页参数，使用后端默认值 (page=1, limit=20)。

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getSuggestions(
  filters: SuggestionFilters = {}
): Promise<SuggestionListResponse> {
  const queryParams: SuggestionFilters & { workspaceId: string } = {
    ...filters,
    workspaceId: DEFAULT_WORKSPACE_ID,
  };

  // 后端 SuggestionsController 实际路由为 /api/suggestions（无 v1 前缀）
  const path = `/suggestions${buildQueryString(queryParams)}`;
  return apiClient.get<SuggestionListResponse>(path);
}

// 按状态便捷过滤
export async function getSuggestionsByStatus(
  status: SuggestionStatus[]
): Promise<SuggestionListResponse> {
  return getSuggestions({ status });
}

/**
 * 接受建议并创建任务
 * 后端限制：必须先 accept（生成 Decision），再 create-adjustment-task
 * 返回最终创建的任务
 */
export async function acceptAndCreateTask(
  id: string
): Promise<{ suggestion: unknown; decision: unknown; task: unknown }> {
  // 1. 接受建议 → 生成 Decision
  const acceptResult = await apiClient.patch<{
    suggestion: unknown;
    decision: { id: string };
  }>(`/suggestions/${id}/accept`, { workspaceId: DEFAULT_WORKSPACE_ID });

  // 2. 基于已接受建议创建调整任务
  const task = await apiClient.post<unknown>(
    `/suggestions/${id}/create-adjustment-task`,
    { workspaceId: DEFAULT_WORKSPACE_ID }
  );

  return {
    suggestion: acceptResult?.suggestion,
    decision: acceptResult?.decision,
    task,
  };
}

/** 忽略建议 */
export async function dismissSuggestion(id: string): Promise<unknown> {
  return apiClient.patch<unknown>(
    `/suggestions/${id}/dismiss?workspaceId=${DEFAULT_WORKSPACE_ID}`
  );
}

/** 稍后处理（延后） */
export async function deferSuggestion(id: string): Promise<unknown> {
  return apiClient.patch<unknown>(
    `/suggestions/${id}/defer?workspaceId=${DEFAULT_WORKSPACE_ID}`
  );
}

export async function updateSuggestion(
  id: string,
  updateData: {
    title?: string;
    description?: string;
    priority?: string;
    status?: SuggestionStatus;
    suggestionDetail?: Record<string, unknown>;
  }
): Promise<SuggestionWorkItem> {
  return apiClient.patch<SuggestionWorkItem>(`/suggestions/${id}`, {
    ...updateData,
    workspaceId: DEFAULT_WORKSPACE_ID,
  });
}
