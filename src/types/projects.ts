// src/types/projects.ts
// 项目管理相关类型定义

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'INBOX' | 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';

export type ProjectPriority = 'P0' | 'P1' | 'P2';

export type HealthStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'ON_HOLD';

export type DomainName =
  | 'health'
  | 'wealth'
  | 'work'
  | 'content'
  | 'learning'
  | 'agi'
  | 'media';

export interface ProjectDetail {
  id: string;
  progress: number;
  healthStatus: HealthStatus;
  budget?: number;
  actualCost?: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: string;
  priority?: string;
}

export interface ProjectIssue {
  id: string;
  title: string;
  level: string;
  status: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  domainId?: string;
  cycleId?: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  priority?: ProjectPriority;
  createdBy: string;
  ownerId?: string;
  sourceType?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  projectDetail?: ProjectDetail;
  parent?: { id: string; title: string; itemType: string };
}

export interface ProjectDetailFull extends Project {
  tasks?: ProjectTask[];
  issues?: ProjectIssue[];
}

export interface ProjectListResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProjectPayload {
  title: string;
  workspaceId: string;
  description?: string;
  priority?: ProjectPriority;
  domainId?: string;
  cycleId?: string;
  progress?: number;
  healthStatus?: HealthStatus;
  budget?: number;
  actualCost?: number;
  plannedStartAt?: string;
  plannedEndAt?: string;
}

export interface UpdateProjectPayload {
  title?: string;
  description?: string;
  priority?: ProjectPriority;
  domainId?: string;
  progress?: number;
  healthStatus?: HealthStatus;
  budget?: number;
  actualCost?: number;
  plannedStartAt?: string;
  plannedEndAt?: string;
}

export interface ProjectFilters {
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  domainId?: string;
  page?: number;
  limit?: number;
}

export const DOMAIN_OPTIONS: { id: string; name: string; label: string }[] = [
  { id: 'health', name: 'health', label: '健康' },
  { id: 'wealth', name: 'wealth', label: '财富' },
  { id: 'work', name: 'work', label: '工作' },
  { id: 'content', name: 'content', label: '内容' },
  { id: 'learning', name: 'learning', label: '学习' },
  { id: 'agi', name: 'agi', label: 'AGI' },
  { id: 'media', name: 'media', label: '媒体' },
];

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  ON_TRACK: '正常',
  AT_RISK: '有风险',
  OFF_TRACK: '已偏离',
  ON_HOLD: '搁置',
};

export const HEALTH_STATUS_COLORS: Record<HealthStatus, string> = {
  ON_TRACK: '#178a6f',
  AT_RISK: '#d59a2f',
  OFF_TRACK: '#bb4d35',
  ON_HOLD: '#6b7280',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: '规划中',
  ACTIVE: '进行中',
  IN_PROGRESS: '进行中',
  BLOCKED: '阻塞',
  DONE: '已完成',
  CANCELLED: '已取消',
  INBOX: '收件箱',
  TODO: '待办',
};

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  P0: '紧急',
  P1: '重要',
  P2: '一般',
};

export function getDomainLabel(domainId?: string): string {
  const map: Record<string, string> = {
    health: '健康',
    wealth: '财富',
    work: '工作',
    content: '内容',
    learning: '学习',
    agi: 'AGI',
    media: '媒体',
  };
  return map[domainId?.toLowerCase() ?? ''] ?? domainId ?? '未分类';
}
