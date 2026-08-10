// src/types/reviews.ts
// 复盘 (Review) 类型定义 —— 对齐后端 WorkItem + ReviewDetail 模型

// ---- 枚举类型 ----
export type ReviewStatus = 'DRAFT' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED';
export type ReviewType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'PROJECT' | 'CUSTOM';
export type CycleType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'SPRINT' | 'CUSTOM';

// ---- 结构化内容项（achievements / challenges / rootCauses / lessonsLearned 中的元素） ----
export interface ReviewContentItem {
  type?: string;
  description: string;
  metric?: number;
  impactScore?: number;
  severity?: string;
  projectName?: string;
  evidence?: Record<string, unknown>;
}

// ---- 聚合数据 (aggregatedData) ----
export interface TaskCompletion {
  doneTasks: number;
  totalTasks: number;
  completionRate: number;
}

export interface ProjectProgressItem {
  title: string;
  progress: number;
  projectId: string;
  healthStatus?: string;
}

export interface MetricChangeItem {
  metricName?: string;
  before?: number | null;
  after?: number | null;
  change?: number | null;
}

export interface GoalProgressItem {
  title?: string;
  progress?: number;
  goalId?: string;
}

export interface UnresolvedIssueItem {
  title?: string;
  level?: string;
  issueId?: string;
}

export interface AcceptedSuggestionItem {
  title?: string;
  suggestionId?: string;
}

export interface AggregatedReviewData {
  healthScore?: number | null;
  goalProgress?: GoalProgressItem[];
  metricChanges?: MetricChangeItem[];
  taskCompletion?: TaskCompletion;
  projectProgress?: ProjectProgressItem[];
  unresolvedIssues?: UnresolvedIssueItem[];
  acceptedSuggestions?: AcceptedSuggestionItem[];
  workTaskCompletionRate?: number | null;
  contentPlanningProgress?: number | null;
  suggestedNextCycleFocus?: string[];
}

// ---- ReviewDetail 子结构 ----
export interface ReviewDetail {
  id: string;
  workItemId: string;
  reviewType: ReviewType;
  cycleType: CycleType;
  period: string;
  summary?: string | null;
  achievements?: ReviewContentItem[] | null;
  challenges?: ReviewContentItem[] | null;
  rootCauses?: ReviewContentItem[] | null;
  lessonsLearned?: ReviewContentItem[] | null;
  nextCycleFocus?: string[] | ReviewContentItem[] | null;
  scoreBefore?: number | null;
  scoreAfter?: number | null;
  score?: number | null;
  completionRate?: number | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  isDraft: boolean;
  status: ReviewStatus;
  aggregatedData?: AggregatedReviewData | null;
}

// ---- WorkItem (带 reviewDetail) 的完整结构 ----
export interface ReviewWorkItem {
  id: string;
  workspaceId: string;
  domainId?: string | null;
  cycleId?: string | null;
  itemType: 'REVIEW';
  pdcaStage: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  ownerId?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  reviewDetail: ReviewDetail | null;
}

// ---- 列表响应 ----
export interface ReviewListResponse {
  data: ReviewWorkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- 筛选条件 ----
export interface ReviewFilters {
  status?: ReviewStatus[];
  reviewType?: ReviewType;
  cycleId?: string;
  page?: number;
  limit?: number;
}

// ---- 更新请求 ----
export interface UpdateReviewPayload {
  workspaceId: string;
  title?: string;
  description?: string;
  summary?: string;
  achievements?: ReviewContentItem[];
  challenges?: ReviewContentItem[];
  rootCauses?: ReviewContentItem[];
  lessonsLearned?: ReviewContentItem[];
  nextCycleFocus?: string[];
  scoreBefore?: number;
  scoreAfter?: number;
  score?: number;
}

// ---- 生成草稿请求 ----
export interface GenerateDraftPayload {
  workspaceId: string;
  cycleId: string;
  reviewedBy?: string;
}

// ---- Cycle 选项（用于生成草稿时的选择） ----
export interface CycleOption {
  id: string;
  cycleType: CycleType;
  status: string;
  name?: string;
  startDate: string;
  endDate: string;
}

// ---- 标签映射 ----
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  DRAFT: '草稿',
  COMPLETED: '已完成',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

export const REVIEW_STATUS_CLASS: Record<ReviewStatus, string> = {
  DRAFT: 'draft',
  COMPLETED: 'completed',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
  DAILY: '日复盘',
  WEEKLY: '周复盘',
  MONTHLY: '月复盘',
  QUARTERLY: '季复盘',
  YEARLY: '年复盘',
  PROJECT: '项目复盘',
  CUSTOM: '自定义',
};

export const CYCLE_TYPE_LABELS: Record<CycleType, string> = {
  DAILY: '日度',
  WEEKLY: '周度',
  MONTHLY: '月度',
  QUARTERLY: '季度',
  YEARLY: '年度',
  SPRINT: '冲刺',
  CUSTOM: '自定义',
};
