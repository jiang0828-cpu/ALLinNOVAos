// src/types/issues.ts
// 问题 (Issue) 类型定义 —— 对齐后端 WorkItem + IssueDetail 模型

import type { IssueLevel, Priority } from './dashboard';

// 问题状态（对齐 Prisma IssueStatus 枚举）
export type IssueStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';

// 偏差类型（对齐 Prisma GapType 枚举）
export type GapType = 'BELOW_TARGET' | 'ABOVE_WARNING' | 'BELOW_WARNING';

// IssueDetail 子结构
export interface IssueDetail {
  id: string;
  workItemId: string;
  taskId?: string | null;
  metricName?: string | null;
  metricTargetValue?: number | null;
  metricActualValue?: number | null;
  level: IssueLevel;
  description?: string | null;
  status: IssueStatus;
  expectedValue?: number | null;
  actualValue?: number | null;
  gapValue?: number | null;
  severity?: string | null;
  detectedAt?: string | null;
  gapType?: GapType | null;
}

// WorkItem（带 issueDetail）的完整结构 —— 对齐后端 listIssues 返回
export interface IssueWorkItem {
  id: string;
  workspaceId: string;
  domainId?: string | null;
  cycleId?: string | null;
  itemType: 'ISSUE';
  pdcaStage: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: Priority | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  issueDetail: IssueDetail | null;
}

// 列表响应
export interface IssueListResponse {
  data: IssueWorkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 筛选条件
export interface IssueFilters {
  status?: IssueStatus[];
  cycleId?: string;
  metricName?: string;
  page?: number;
  limit?: number;
}

// ---- 展示用标签映射 ----
export const ISSUE_LEVEL_LABELS: Record<IssueLevel, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
};

export const ISSUE_LEVEL_CLASS: Record<IssueLevel, string> = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: '待处理',
  RESOLVED: '已解决',
  IGNORED: '已忽略',
};

export const ISSUE_STATUS_CLASS: Record<IssueStatus, string> = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  IGNORED: 'ignored',
};

export const GAP_TYPE_LABELS: Record<GapType, string> = {
  BELOW_TARGET: '低于目标',
  ABOVE_WARNING: '高于警戒',
  BELOW_WARNING: '低于警戒',
};
