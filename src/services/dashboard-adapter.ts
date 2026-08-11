/**
// src/services/dashboard-adapter.ts
// Backend DTO → Frontend type adapter
//
// Maps DashboardOverviewResponseDto from the API
// into the DashboardSnapshot shape used by the UI.

import type { DashboardSnapshot, IssueLevel, Priority, TaskStatus } from '../types/dashboard';

/** Mirrors the backend DTO exactly. */
export interface DashboardOverviewResponse {
  overallScore: number;
  domainScores: Array<{
    domainId: string;
    domainName: string;
    score: number;
  }>;
  todayFocus: Array<{
    id: string;
    title: string;
    itemType: string;
    status?: string;
    priority?: string;
  }>;
  activeProjects: Array<{
    id: string;
    title: string;
    progress: number;
    healthStatus: string;
  }>;
  openIssues: Array<{
    id: string;
    title: string;
    level: string;
    status: string;
  }>;
  pendingSuggestions: Array<{
    id: string;
    title: string;
    status: string;
    impactScore?: number;
  }>;
  latestReview: {
    id: string;
    title: string;
    reviewType: string;
    status: string;
    reviewedAt: string;
  } | null;
  activeInsights: Array<{
    id: string;
    statement: string;
    insightType: string;
    confidence: number;
    impactScore: number;
  }>;
  lastUpdatedAt: string;
}

/** Default workspace ID for local dev */
const DEFAULT_WORKSPACE_ID = 'ws_default';

/**
 * Convert backend priority string to frontend Priority type.
 */
function toPriority(raw: string | undefined): Priority {
  if (raw === 'P0' || raw === 'P1' || raw === 'P2') return raw;
  return 'P1';
}

function toTaskStatus(raw: string | undefined): TaskStatus {
  const map: Record<string, TaskStatus> = {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE',
    BLOCKED: 'BLOCKED',
  };
  return map[raw ?? ''] ?? 'TODO';
}

/**
 * Map: backend itemType → frontend "system" label.
 */
function itemTypeToSystem(itemType: string): string {
  const map: Record<string, string> = {
    TASK: 'Task',
    GOAL: 'Goal',
    PROJECT: 'Project',
    ISSUE: 'Issue',
    SUGGESTION: 'Suggestion',
    REVIEW: 'Review',
    DECISION: 'Decision',
    IDEA: 'Idea',
    METRIC: 'Metric',
  };
  return map[itemType] ?? itemType ?? 'Item';
}

/**
 * Map: backend domainName → frontend Chinese label.
 */
function domainNameToLabel(domainName: string): string {
  const map: Record<string, string> = {
    health: '健康',
    wealth: '财富',
    work: '工作',
    content: '生活',
    learning: '学习',
    agi: 'AGI',
    media: '市场',
    relationship: '关系',
    personal: '个人',
    career: '事业',
  };
  return map[domainName.toLowerCase()] ?? domainName;
}

/**
 * Transform a DashboardOverviewResponse from the backend
 * into the DashboardSnapshot shape consumed by CommandHub.
 */
export function adaptBackendToSnapshot(
  backend: DashboardOverviewResponse,
  workspaceId: string = DEFAULT_WORKSPACE_ID
): DashboardSnapshot {
  // --- State / Target ---
  const breakdown = backend.domainScores.map((d) => ({
    label: domainNameToLabel(d.domainName),
    value: d.score,
    weight: 0,
  }));

  // --- Today Focus ---
  const todayFocus = backend.todayFocus
    .filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
    .map((t) => ({
      id: t.id,
      title: t.title,
      system: itemTypeToSystem(t.itemType),
      priority: toPriority(t.priority),
      eta: t.status,
      status: toTaskStatus(t.status),
    }));

  // --- Feeds ---
  // 信息资讯模块保持独立 API 预留，不再同步问题、建议或项目数据。
  // 后续接入资讯服务时，可在这里改为读取 news/ideas/plans 专用 DTO。
  const news: Array<{ id: string; source: string; time: string; title: string }> = [];
  const ideas: Array<{ id: string; title: string }> = [];
  const plans: Array<{ id: string; title: string; progress: number }> = [];

  // --- Open Issues (当前问题/风险) ---
  const openIssues = backend.openIssues.map((i) => ({
    id: i.id,
    title: i.title,
    level: (i.level || 'MEDIUM') as IssueLevel,
    status: i.status || 'OPEN',
  }));

  // --- Latest Review (最新复盘) ---
  const latestReview = backend.latestReview
    ? {
        id: backend.latestReview.id,
        title: backend.latestReview.title,
        reviewType: backend.latestReview.reviewType,
        status: backend.latestReview.status,
        reviewedAt: backend.latestReview.reviewedAt,
      }
    : null;

  // --- Active Insights Count ---
  const activeInsightsCount = backend.activeInsights?.length ?? 0;

  // --- AI Suggestions ---
  const aiSuggestions = backend.pendingSuggestions.map((s) => ({
    id: s.id,
    title: s.title,
    source: `Suggestion · ${s.status}`,
    reason: s.impactScore
      ? `影响评分 ${s.impactScore}，建议确认后转为行动`
      : '建议确认后转为行动',
    priority: 'P1' as Priority,
    time: '15 分钟',
    isConverted: false,
  }));

  const operatingLayers = {
    targets: backend.domainScores.slice(0, 5).map((d) => ({
      id: d.domainId,
      label: domainNameToLabel(d.domainName),
      value: Math.round(d.score),
    })),
    projects: backend.activeProjects.slice(0, 4).map((p) => ({
      id: p.id,
      title: p.title,
      progress: Math.round(p.progress),
      healthStatus: p.healthStatus,
    })),
    tasks: backend.todayFocus.slice(0, 4).map((t) => ({
      id: t.id,
      title: t.title,
      status: toTaskStatus(t.status),
      priority: toPriority(t.priority),
    })),
  };

  return {
    workspaceId,
    generatedAt: backend.lastUpdatedAt,
    operatingLayers,
    stateTarget: {
      lifeScore: Math.round(backend.overallScore),
      breakdown,
    },
    todayFocus,
    feeds: {
      news,
      ideas,
      plans,
    },
    openIssues,
    latestReview,
    activeInsightsCount,
    aiSuggestions,
  };
}
