// src/types/goals.ts
// 目标管理相关类型定义

export type GoalStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'INBOX'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'DONE'
  | 'CANCELLED';

export type GoalPriority = 'P0' | 'P1' | 'P2';

export type DomainName =
  | 'health'
  | 'wealth'
  | 'work'
  | 'content'
  | 'learning'
  | 'agi'
  | 'media'
  | 'other';

export interface GoalDetailMetric {
  id: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  progress: number;
  weight?: number;
  targetDate?: string;
}

export interface Goal {
  id: string;
  workspaceId: string;
  domainId?: string;
  cycleId?: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority?: GoalPriority;
  createdBy: string;
  ownerId?: string;
  sourceType?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  goalDetail?: GoalDetailMetric;
  parent?: { id: string; title: string; itemType: string };
}

export interface GoalListResponse {
  data: Goal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateGoalPayload {
  title: string;
  workspaceId: string;
  description?: string;
  priority?: GoalPriority;
  domainId?: string;
  cycleId?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  progress?: number;
  weight?: number;
  targetDate?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
}

export interface UpdateGoalPayload {
  title?: string;
  description?: string;
  status?: GoalStatus;
  priority?: GoalPriority;
  domainId?: string;
  cycleId?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  progress?: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  weight?: number;
  targetDate?: string;
}

export interface GoalFilters {
  status?: GoalStatus[];
  priority?: GoalPriority[];
  domainId?: string;
  page?: number;
  limit?: number;
}

export const DOMAIN_OPTIONS: { id: string; name: string; label: string }[] = [
  { id: 'health', name: 'health', label: '健康' },
  { id: 'wealth', name: 'wealth', label: '财富' },
  { id: 'work', name: 'work', label: '工作' },
  { id: 'content', name: 'content', label: '生活' },
  { id: 'learning', name: 'learning', label: '学习' },
  { id: 'agi', name: 'agi', label: 'AGI' },
  { id: 'media', name: 'media', label: '市场' },
  { id: 'other', name: 'other', label: '其他' },
];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  PLANNING: '规划中',
  ACTIVE: '活跃',
  INBOX: '收件箱',
  TODO: '待办',
  IN_PROGRESS: '进行中',
  BLOCKED: '阻塞',
  DONE: '已完成',
  CANCELLED: '已取消',
};

export const PRIORITY_LABELS: Record<GoalPriority, string> = {
  P0: '紧急',
  P1: '重要',
  P2: '一般',
};

export function getDomainLabel(domainId?: string): string {
  const map: Record<string, string> = {
    health: '健康',
    wealth: '财富',
    work: '工作',
    content: '生活',
    learning: '学习',
    agi: 'AGI',
    media: '市场',
    other: '其他',
  };
  return map[domainId?.toLowerCase() ?? ''] ?? domainId ?? '未分类';
}
