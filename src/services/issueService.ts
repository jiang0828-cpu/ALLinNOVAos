// src/services/issueService.ts
// 问题 (Issue) API 服务层

import { apiClient } from './apiClient';
import type { IssueFilters, IssueListResponse, IssueStatus } from '../types/issues';

const DEFAULT_WORKSPACE_ID = 'ws_default';

function buildQueryString(filters: IssueFilters & { workspaceId?: string }): string {
  const params = new URLSearchParams();

  if (filters.workspaceId) params.set('workspaceId', filters.workspaceId);
  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }
  if (filters.cycleId) params.set('cycleId', filters.cycleId);
  if (filters.metricName) params.set('metricName', filters.metricName);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getIssues(
  filters: IssueFilters = {}
): Promise<IssueListResponse> {
  const queryParams: IssueFilters & { workspaceId: string } = {
    ...filters,
    workspaceId: DEFAULT_WORKSPACE_ID,
    page: filters.page ?? 1,
    limit: filters.limit ?? 50,
  };

  // 后端 IssuesController 实际路由为 /api/issues（无 v1 前缀）
  const path = `/issues${buildQueryString(queryParams)}`;
  return apiClient.get<IssueListResponse>(path);
}

// 按状态便捷过滤
export async function getIssuesByStatus(
  status: IssueStatus[]
): Promise<IssueListResponse> {
  return getIssues({ status });
}
