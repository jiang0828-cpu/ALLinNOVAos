// Shared types for NOVA OS
// These types are used by both frontend and backend

// ============================================
// Enums (枚举类型)
// ============================================

export type WorkItemType =
  | 'GOAL'
  | 'PROJECT'
  | 'TASK'
  | 'IDEA'
  | 'ISSUE'
  | 'SUGGESTION'
  | 'REVIEW'
  | 'INSIGHT'
  | 'DECISION';

export type Priority = 'P0' | 'P1' | 'P2';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

export type IssueLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type CycleType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export type ReviewStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type SuggestionStatus = 'PENDING' | 'ADOPTED' | 'REJECTED';

export type IssueStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';

export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'CONVERT' | 'PUBLISH';

// ============================================
// Core Entities (核心实体)
// ============================================

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface WorkItem {
  id: string;
  workspaceId: string;
  type: WorkItemType;
  title: string;
  status: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Goal extends WorkItem {
  type: 'GOAL';
  targetValue?: number | null;
  actualValue?: number | null;
  priority: Priority;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface Project extends WorkItem {
  type: 'PROJECT';
  goalId?: string | null;
  summary?: string | null;
  progress: number;
}

export interface Task extends WorkItem {
  type: 'TASK';
  projectId?: string | null;
  priority: Priority;
  eta?: string | null;
  assignee?: string | null;
  isDraft: boolean;
  status: TaskStatus;
}

export interface Idea extends WorkItem {
  type: 'IDEA';
  content: string;
  tags: string[];
  convertedToGoalId?: string | null;
}

export interface Issue extends WorkItem {
  type: 'ISSUE';
  taskId?: string | null;
  metricName?: string | null;
  metricTargetValue?: number | null;
  metricActualValue?: number | null;
  level: IssueLevel;
  description?: string | null;
  status: IssueStatus;
}

export interface Suggestion extends WorkItem {
  type: 'SUGGESTION';
  issueId?: string | null;
  reason: string;
  priority: Priority;
  source?: string | null;
  isConverted: boolean;
  convertedTaskId?: string | null;
  status: SuggestionStatus;
}

export interface Review extends WorkItem {
  type: 'REVIEW';
  cycleType: CycleType;
  period: string;
  summary?: string | null;
  score?: number | null;
  isDraft: boolean;
  status: ReviewStatus;
}

export interface Insight extends WorkItem {
  type: 'INSIGHT';
  reviewId: string;
  content: string;
  tags: string[];
}

export interface Decision extends WorkItem {
  type: 'DECISION';
  reviewId: string;
  content: string;
  impact?: IssueLevel | null;
}

// ============================================
// Dashboard Read Model (读模型)
// ============================================

export interface DashboardStateTarget {
  lifeScore: number;
  breakdown: Array<{
    label: string;
    value: number;
    weight: number;
  }>;
}

export interface DashboardFocusItem {
  id: string;
  title: string;
  system: string;
  priority: Priority;
  eta?: string | null;
  status: TaskStatus;
}

export interface DashboardNewsItem {
  id: string;
  source: string;
  time: string;
  title: string;
}

export interface DashboardIdeaItem {
  id: string;
  title: string;
}

export interface DashboardPlanItem {
  id: string;
  title: string;
  progress: number;
}

export interface DashboardFeeds {
  news: DashboardNewsItem[];
  ideas: DashboardIdeaItem[];
  plans: DashboardPlanItem[];
}

export interface DashboardSuggestion {
  id: string;
  title: string;
  source: string;
  reason: string;
  priority: Priority;
  time: string;
  isConverted: boolean;
}

export interface DashboardSnapshot {
  workspaceId: string;
  generatedAt: string;
  stateTarget: DashboardStateTarget;
  todayFocus: DashboardFocusItem[];
  feeds: DashboardFeeds;
  aiSuggestions: DashboardSuggestion[];
}

// ============================================
// API DTOs (数据传输对象)
// ============================================

export interface CreateWorkItemDto {
  type: WorkItemType;
  title: string;
  workspaceId: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateWorkItemDto {
  title?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface ConvertSuggestionDto {
  suggestionId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================
// Color Tokens (颜色标记)
// ============================================

export const SCORE_COLORS = {
  excellent: '#178a6f',
  watch: '#d59a2f',
  danger: '#bb4d35',
} as const;

export const PRIORITY_COLORS: Record<Priority, string> = {
  P0: '#173a34',
  P1: '#2d7768',
  P2: '#efd38f',
};

export const PRIORITY_TEXT_COLORS: Record<Priority, string> = {
  P0: '#ffffff',
  P1: '#ffffff',
  P2: '#573a0a',
};

export function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 60) return SCORE_COLORS.watch;
  return SCORE_COLORS.danger;
}
