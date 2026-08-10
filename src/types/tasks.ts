// src/types/tasks.ts
// 任务管理相关类型定义

// 任务状态（对齐后端 WorkItemStatus）
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';

// 任务优先级
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

// 领域类型
export type DomainName =
  | 'health'
  | 'wealth'
  | 'work'
  | 'content'
  | 'learning'
  | 'agi'
  | 'media';

// 任务详情（来自后端 TaskResponseDto）
export interface TaskDetail {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  domainId?: string;
  domainName?: DomainName;
  cycleId?: string;
  projectId?: string;
  sourceType?: string;
  ownerId?: string;
  createdBy: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  completedAt?: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  taskDetail?: {
    id: string;
    dueAt?: string;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
    estimatedMinutes?: number;
    actualMinutes?: number;
    completionNote?: string;
  };
}

// 任务列表响应
export interface TaskListResponse {
  data: TaskDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 创建任务请求体
export interface CreateTaskPayload {
  title: string;
  workspaceId: string;
  description?: string;
  priority?: TaskPriority;
  domainId?: string;
  dueAt?: string;
  estimatedMinutes?: number;
  projectId?: string;
  goalId?: string;
}

// 更新任务请求体
export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  domainId?: string;
  dueAt?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  estimatedMinutes?: number;
}

// 任务筛选参数
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  domainId?: string;
  projectId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'dueAt' | 'priority' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// 领域选项（用于筛选下拉）
export const DOMAIN_OPTIONS: { id: string; name: string; label: string }[] = [
  { id: 'health', name: 'health', label: '健康' },
  { id: 'wealth', name: 'wealth', label: '财富' },
  { id: 'work', name: 'work', label: '工作' },
  { id: 'content', name: 'content', label: '内容' },
  { id: 'learning', name: 'learning', label: '学习' },
  { id: 'agi', name: 'agi', label: 'AGI' },
  { id: 'media', name: 'media', label: '媒体' },
];

// 状态标签映射
export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: '待办',
  IN_PROGRESS: '进行中',
  BLOCKED: '阻塞',
  DONE: '已完成',
  CANCELLED: '已取消',
};

// 状态样式类名
export const STATUS_CLASS_MAP: Record<TaskStatus, string> = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  BLOCKED: 'blocked',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

// 优先级标签映射
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P0: '紧急',
  P1: '重要',
  P2: '一般',
  P3: '可选',
};

// 领域名称映射
export function getDomainLabel(domainName?: string): string {
  const map: Record<string, string> = {
    health: '健康',
    wealth: '财富',
    work: '工作',
    content: '内容',
    learning: '学习',
    agi: 'AGI',
    media: '媒体',
  };
  return map[domainName?.toLowerCase() ?? ''] ?? domainName ?? '未分类';
}
