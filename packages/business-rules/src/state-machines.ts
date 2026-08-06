// State Machines (状态机定义)

import type { TaskStatus, IssueStatus, SuggestionStatus, ReviewStatus } from '@nova-os/shared-types';

// Task State Machine
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['DONE', 'BLOCKED', 'TODO'],
  DONE: [],
  BLOCKED: ['IN_PROGRESS', 'TODO'],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

// Issue State Machine
export const ISSUE_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  OPEN: ['RESOLVED', 'IGNORED'],
  RESOLVED: [],
  IGNORED: ['OPEN'],
};

export function canTransitionIssue(from: IssueStatus, to: IssueStatus): boolean {
  return ISSUE_TRANSITIONS[from]?.includes(to) ?? false;
}

// Suggestion State Machine
export const SUGGESTION_TRANSITIONS: Record<SuggestionStatus, SuggestionStatus[]> = {
  PENDING: ['ADOPTED', 'REJECTED'],
  ADOPTED: [],
  REJECTED: ['PENDING'],
};

export function canTransitionSuggestion(
  from: SuggestionStatus,
  to: SuggestionStatus
): boolean {
  return SUGGESTION_TRANSITIONS[from]?.includes(to) ?? false;
}

// Review State Machine
export const REVIEW_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function canTransitionReview(from: ReviewStatus, to: ReviewStatus): boolean {
  return REVIEW_TRANSITIONS[from]?.includes(to) ?? false;
}

// Global constraints
export const STATE_MACHINE_RULES = {
  // SM-001: Task belongs to one Project
  taskUniqueProject: true,
  // SM-002: Suggestion must link to Issue
  suggestionRequiresIssue: true,
  // SM-003: Suggestion becomes Task after conversion
  suggestionConversionMarked: true,
  // SM-004: Review must specify cycleType
  reviewRequiresCycleType: true,
  // SM-005: Insight/Decision must link to Review
  insightDecisionRequireReview: true,
  // SM-006: Goal COMPLETED → no new Tasks
  completedGoalRestrictsTasks: true,
  // SM-007: Status changes logged to activity_events
  statusChangeRequiresAudit: true,
  // SM-008: Cross-table changes use transaction
  crossTableRequiresTransaction: true,
  // SM-009: AI drafts need user confirmation
  aiDraftRequiresConfirmation: true,
  // SM-010: All queries filtered by workspace
  workspaceIsolationRequired: true,
} as const;
