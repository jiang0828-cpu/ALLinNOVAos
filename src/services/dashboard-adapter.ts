/**
// src/services/dashboard-adapter.ts
// Backend DTO → Frontend type adapter
//
// Maps DashboardOverviewResponseDto from the API
// into the DashboardSnapshot shape used by the UI.

import type { DashboardSnapshot, IssueLevel, Priority, TaskStatus } from '../types/dashboard';

/** Mirrors the backend DTO exactly. */
export interface DashboardOverviewResponse {
  overallScore?: number | null;
  domainScores: Array<{
    domainId?: string | null;
    domainName?: string | null;
    score?: number | null;
  }> | null;
  todayFocus: Array<{
    id: string;
    title: string;
    itemType: string;
    status?: string;
    priority?: string;
    completedAt?: string | null;
    taskDetail?: {
      actualMinutes?: number | null;
    };
  }> | null;
  activeProjects: Array<{
    id: string;
    title: string;
    progress?: number | null;
    healthStatus?: string | null;
  }> | null;
  openIssues: Array<{
    id: string;
    title: string;
    level?: string | null;
    status?: string | null;
  }> | null;
  pendingSuggestions: Array<{
    id: string;
    title: string;
    status?: string | null;
    impactScore?: number | null;
  }> | null;
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
  }> | null;
  lastUpdatedAt?: string | null;
}

/** Default workspace ID for local dev */
const DEFAULT_WORKSPACE_ID = 'ws_default';
const M2NEWS_LATEST_URL = 'https://lifeos-personal-manager.github.io/M2news/news/latest.html';
const TODAY_TOP_NEWS = [
  '中国第九批赴南苏丹（朱巴）维和步兵营完成指挥权交接',
  '习近平将向《生物多样性公约》第十五次缔约方大会第二阶段高级别会议开幕式致辞',
  '学习进行时｜二十大后重要外交活动，这些关键词习近平总书记反复提及',
  '中国多家驻土机构参加土耳其创新周',
  '匈牙利说就解冻恢复基金与欧盟达成协议',
].map((title, index) => ({
  id: `m2news-today-${index + 1}`,
  source: 'M2NEWS',
  time: '今日大事',
  title,
  url: M2NEWS_LATEST_URL,
}));

/**
 * Convert backend priority string to frontend Priority type.
 */
function toPriority(raw: string | undefined): Priority {
  if (raw === 'P0' || raw === 'P1' || raw === 'P2' || raw === 'P3') return raw;
  return 'P1';
}

function toTaskStatus(raw: string | undefined): TaskStatus {
  const map: Record<string, TaskStatus> = {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE',
    BLOCKED: 'BLOCKED',
    CANCELLED: 'CANCELLED',
  };
  return map[raw ?? ''] ?? 'TODO';
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

/**
 * Map: backend itemType → frontend "system" label.
 */
function itemTypeToSystem(itemType: string | null | undefined): string {
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
  const key = String(itemType || '').toUpperCase();
  return map[key] ?? (itemType ? String(itemType) : 'Item');
}

/**
 * Map: backend domainName → frontend Chinese label.
 */
function domainNameToLabel(domainName?: string | null, domainId?: string | null): string {
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
  const fallback = String(domainName || domainId || '').trim();
  const key = fallback.toLowerCase().replace(/^domain_/, '');
  return map[key] ?? (fallback || '未分类');
}

/**
 * Transform a DashboardOverviewResponse from the backend
 * into the DashboardSnapshot shape consumed by CommandHub.
 */
export function adaptBackendToSnapshot(
  backend: DashboardOverviewResponse,
  workspaceId: string = DEFAULT_WORKSPACE_ID
): DashboardSnapshot {
  const domainScores = asArray(backend.domainScores);
  const todayFocusItems = asArray(backend.todayFocus);
  const openIssueItems = asArray(backend.openIssues);
  const suggestionItems = asArray(backend.pendingSuggestions);
  const activeProjectItems = asArray(backend.activeProjects);

  // --- State / Target ---
  const breakdown = domainScores.map((d) => ({
    label: domainNameToLabel(d.domainName, d.domainId),
    value: toNumber(d.score),
    weight: 0,
  }));

  // --- Today Focus ---
  const todayFocus = todayFocusItems
    .filter((t) => t.status !== 'CANCELLED')
    .map((t) => ({
      id: t.id,
      title: t.title,
      system: itemTypeToSystem(t.itemType),
      priority: toPriority(t.priority),
      eta: t.status,
      status: toTaskStatus(t.status),
      completedAt: t.completedAt,
      actualMinutes: t.taskDetail?.actualMinutes ?? null,
    }));

  // --- Feeds ---
  // 信息资讯模块保持独立 API 预留，不再同步问题、建议或项目数据。
  // 后续接入资讯服务时，可在这里改为读取 news/ideas/plans 专用 DTO。
  const news: Array<{ id: string; source: string; time: string; title: string; url?: string }> = TODAY_TOP_NEWS;
  const ideas: Array<{ id: string; title: string }> = [];
  const plans: Array<{ id: string; title: string; progress: number }> = [];

  // --- Open Issues (当前问题/风险) ---
  const openIssues = openIssueItems.map((i) => ({
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
  const activeInsightsCount = asArray(backend.activeInsights).length;

  // --- AI Suggestions ---
  const aiSuggestions = suggestionItems.map((s) => ({
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
    targets: domainScores.slice(0, 5).map((d) => ({
      id: d.domainId || d.domainName || 'domain_unknown',
      label: domainNameToLabel(d.domainName, d.domainId),
      value: Math.round(toNumber(d.score)),
    })),
    projects: activeProjectItems.slice(0, 4).map((p) => ({
      id: p.id,
      title: p.title,
      progress: Math.round(toNumber(p.progress)),
      healthStatus: p.healthStatus || 'ON_TRACK',
    })),
    tasks: todayFocusItems.slice(0, 4).map((t) => ({
      id: t.id,
      title: t.title,
      status: toTaskStatus(t.status),
      priority: toPriority(t.priority),
    })),
  };

  return {
    workspaceId,
    generatedAt: backend.lastUpdatedAt || new Date().toISOString(),
    operatingLayers,
    stateTarget: {
      lifeScore: Math.round(toNumber(backend.overallScore)),
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
