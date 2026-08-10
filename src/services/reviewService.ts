// src/services/reviewService.ts
// 复盘 (Review) API 服务层

import { apiClient } from './apiClient';
import type {
  ReviewFilters,
  ReviewListResponse,
  ReviewStatus,
  ReviewWorkItem,
  UpdateReviewPayload,
  GenerateDraftPayload,
} from '../types/reviews';

const DEFAULT_WORKSPACE_ID = 'ws_default';

function buildQueryString(filters: ReviewFilters & { workspaceId?: string }): string {
  const params = new URLSearchParams();

  if (filters.workspaceId) params.set('workspaceId', filters.workspaceId);
  if (filters.status && filters.status.length > 0) {
    params.set('status', filters.status.join(','));
  }
  if (filters.reviewType) params.set('reviewType', filters.reviewType);
  if (filters.cycleId) params.set('cycleId', filters.cycleId);
  // 注意：后端 QueryReviewsDto 的 page/limit 字段缺少 @Transform 转换，
  // 传字符串会被 class-validator 拒绝 (400)。此处不发送分页参数，使用后端默认值。

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// 获取复盘列表
export async function getReviews(
  filters: ReviewFilters = {}
): Promise<ReviewListResponse> {
  const queryParams: ReviewFilters & { workspaceId: string } = {
    ...filters,
    workspaceId: DEFAULT_WORKSPACE_ID,
  };

  const path = `/reviews${buildQueryString(queryParams)}`;
  return apiClient.get<ReviewListResponse>(path);
}

// 按状态便捷过滤
export async function getReviewsByStatus(
  status: ReviewStatus[]
): Promise<ReviewListResponse> {
  return getReviews({ status });
}

// 获取复盘详情
export async function getReviewById(id: string): Promise<ReviewWorkItem> {
  const path = `/reviews/${id}?workspaceId=${DEFAULT_WORKSPACE_ID}`;
  return apiClient.get<ReviewWorkItem>(path);
}

// 生成复盘草稿
export async function generateReviewDraft(
  cycleId: string,
  reviewedBy?: string
): Promise<ReviewWorkItem> {
  const payload: GenerateDraftPayload = {
    workspaceId: DEFAULT_WORKSPACE_ID,
    cycleId,
    reviewedBy,
  };
  return apiClient.post<ReviewWorkItem>('/reviews/generate-draft', payload);
}

// 更新复盘内容（用户编辑）
export async function updateReview(
  id: string,
  updateData: Omit<UpdateReviewPayload, 'workspaceId'>
): Promise<ReviewWorkItem> {
  const payload: UpdateReviewPayload = {
    ...updateData,
    workspaceId: DEFAULT_WORKSPACE_ID,
  };
  return apiClient.patch<ReviewWorkItem>(`/reviews/${id}`, payload);
}

// 确认复盘（状态从 DRAFT → COMPLETED）
// 注意：后端 complete 端点返回 ReviewDetail（而非完整 WorkItem），
// 所以此处先调用 complete，再重新获取完整 WorkItem 以保证前端类型一致。
export async function completeReview(
  id: string,
  reviewedBy?: string
): Promise<ReviewWorkItem> {
  const payload = {
    workspaceId: DEFAULT_WORKSPACE_ID,
    reviewedBy,
  };
  await apiClient.patch(`/reviews/${id}/complete`, payload);
  return getReviewById(id);
}
