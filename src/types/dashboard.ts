// src/types/dashboard.ts

// 核心业务对象类型（对齐 work_items.type 枚举）
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

// 优先级
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

// 任务状态
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED';

// 问题级别
export type IssueLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// 通用 work_item 基础结构
export interface WorkItem {
  id: string;
  workspaceId: string;
  type: WorkItemType;
  title: string;
  status: string;
  parentId?: string;
  priority?: Priority;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// Goal
export interface Goal extends WorkItem {
  type: 'GOAL';
  targetValue: number;
  actualValue: number;
  progress: number;
}

// Task
export interface Task extends WorkItem {
  type: 'TASK';
  projectId?: string;
  eta?: string;
  assignee?: string;
}

// Suggestion
export interface Suggestion extends WorkItem {
  type: 'SUGGESTION';
  issueId?: string;
  reason: string;
  source?: string;
  isConverted: boolean;
}

// Issue
export interface Issue extends WorkItem {
  type: 'ISSUE';
  taskId?: string;
  level: IssueLevel;
  description?: string;
}

// Metric 维度（依附于 Issue 或 Task）
export interface MetricDimension {
  name: string;
  targetValue: number;
  actualValue: number;
}

// COMMANDHUB 读模型：聚合数据结构
export interface DashboardSnapshot {
  // Meta
  workspaceId: string;
  generatedAt: string;
  dataSource?: 'online' | 'local' | 'mock';
  operatingLayers?: {
    targets: Array<{
      id: string;
      label: string;
      value: number;
    }>;
    projects: Array<{
      id: string;
      title: string;
      progress: number;
      healthStatus?: string;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      status: TaskStatus;
      priority: Priority;
    }>;
  };

  // STATE / TARGET — 目标达成
  stateTarget: {
    lifeScore: number;
    breakdown: Array<{
      label: string;
      value: number;
      weight: number;
    }>;
  };

  // 今日重点 (Today Focus)
  todayFocus: Array<{
    id: string;
    title: string;
    system: string; // 所属系统（Phase 1 语义标签，后续替换为 parentId）
    priority: Priority;
    eta?: string;
    status: TaskStatus;
    completedAt?: string | null;
    actualMinutes?: number | null;
  }>;

  // 信息资讯 (Feeds)
  feeds: {
    // NEWS — 新闻
    news: Array<{
      id: string;
      source: string;
      time: string;
      title: string;
    }>;
    // IDEAS — 灵感
    ideas: Array<{
      id: string;
      title: string;
    }>;
    // PLANS — 计划
    plans: Array<{
      id: string;
      title: string;
      progress: number;
    }>;
  };

  // 当前问题/风险
  openIssues: Array<{
    id: string;
    title: string;
    level: IssueLevel;
    status: string;
  }>;

  // 最新复盘
  latestReview: {
    id: string;
    title: string;
    reviewType: string;
    status: string;
    reviewedAt: string;
  } | null;

  // 活跃洞察数量
  activeInsightsCount: number;

  // AI 建议 (Suggestion)
  aiSuggestions: Array<{
    id: string;
    title: string;
    source: string;
    reason: string;
    priority: Priority;
    time: string;
    isConverted: boolean;
  }>;
}

// 颜色映射（对齐 score-rules.md）
export const SCORE_COLORS = {
  excellent: '#178a6f', // ≥80 深绿
  watch: '#d59a2f',     // 60-79 金色
  danger: '#bb4d35',    // <60 红色
} as const;

export const PRIORITY_COLORS: Record<Priority, string> = {
  P0: '#173a34',
  P1: '#2d7768',
  P2: '#efd38f',
  P3: '#dce6e1',
} as const;

// 分数颜色判定
export function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 60) return SCORE_COLORS.watch;
  return SCORE_COLORS.danger;
}

// 优先级文本颜色（P2 需金色文字）
export function getPriorityTextColor(priority: Priority): string {
  if (priority === 'P2') return '#573a0a';
  if (priority === 'P3') return '#52625d';
  return '#ffffff';
}
