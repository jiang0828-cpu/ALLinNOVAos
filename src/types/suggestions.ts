// src/types/suggestions.ts
// 行动建议 (Suggestion) 类型定义 —— 对齐后端 WorkItem + SuggestionDetail 模型

import type { Priority } from './dashboard';

// 建议状态（对齐 Prisma SuggestionStatus 枚举）
export type SuggestionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DISMISSED'
  | 'DEFERRED'
  | 'EXPIRED';

// 建议来源类型（对齐 Prisma SuggestionSourceType 枚举）
export type SuggestionSourceType = 'ISSUE' | 'METRIC_GAP' | 'TASK' | 'PROJECT';

// 建议类型（对齐 Prisma SuggestionType 枚举）
export type SuggestionType =
  | 'HEALTH_IMPROVEMENT'
  | 'PROGRESS_ACCELERATION'
  | 'TASK_RESOLUTION'
  | 'RISK_MITIGATION'
  | 'RESOURCE_OPTIMIZATION';

// SuggestionDetail 子结构
export interface SuggestionDetail {
  id: string;
  workItemId: string;
  suggestionType: SuggestionType;
  confidence: number;
  impactScore: number;
  urgencyScore: number;
  evidence?: Record<string, unknown> | null;
  dedupKey: string;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  dismissedAt?: string | null;
  deferredAt?: string | null;
  expiredAt?: string | null;
  sourceType: SuggestionSourceType;
  sourceRefId: string;
  issueId?: string | null;
  reason: string;
  priority: Priority;
  source?: string | null;
  isConverted: boolean;
  convertedTaskId?: string | null;
  status: SuggestionStatus;
}

// WorkItem（带 suggestionDetail）的完整结构 —— 对齐后端 listSuggestions 返回
export interface SuggestionWorkItem {
  id: string;
  workspaceId: string;
  domainId?: string | null;
  cycleId?: string | null;
  itemType: 'SUGGESTION';
  pdcaStage: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: Priority | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  suggestionDetail: SuggestionDetail | null;
}

// 列表响应
export interface SuggestionListResponse {
  data: SuggestionWorkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 筛选条件
export interface SuggestionFilters {
  status?: SuggestionStatus[];
  sourceType?: SuggestionSourceType;
  suggestionType?: SuggestionType;
  cycleId?: string;
  page?: number;
  limit?: number;
}

// ---- 展示用标签映射 ----
export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  PENDING: '待处理',
  ACCEPTED: '已接受',
  DISMISSED: '已忽略',
  DEFERRED: '已延后',
  EXPIRED: '已过期',
};

export const SUGGESTION_STATUS_CLASS: Record<SuggestionStatus, string> = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DISMISSED: 'dismissed',
  DEFERRED: 'deferred',
  EXPIRED: 'expired',
};

export const SUGGESTION_TYPE_LABELS: Record<SuggestionType, string> = {
  HEALTH_IMPROVEMENT: '健康改善',
  PROGRESS_ACCELERATION: '进度加速',
  TASK_RESOLUTION: '任务解决',
  RISK_MITIGATION: '风险缓解',
  RESOURCE_OPTIMIZATION: '资源优化',
};

export const SUGGESTION_SOURCE_LABELS: Record<SuggestionSourceType, string> = {
  ISSUE: '问题',
  METRIC_GAP: '指标偏差',
  TASK: '任务',
  PROJECT: '项目',
};

export const SUGGESTION_PRIORITY_LABELS: Record<Priority, string> = {
  P0: '紧急',
  P1: '重要',
  P2: '一般',
};
