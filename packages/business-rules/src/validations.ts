// Validations (数据验证规则)

import type { Priority, WorkItemType } from '@nova-os/shared-types';

// Priority validation
const VALID_PRIORITIES: Priority[] = ['P0', 'P1', 'P2'];

export function isValidPriority(priority: string): priority is Priority {
  return VALID_PRIORITIES.includes(priority as Priority);
}

// WorkItemType validation
const VALID_TYPES: WorkItemType[] = [
  'GOAL',
  'PROJECT',
  'TASK',
  'IDEA',
  'ISSUE',
  'SUGGESTION',
  'REVIEW',
  'INSIGHT',
  'DECISION',
];

export function isValidWorkItemType(type: string): type is WorkItemType {
  return VALID_TYPES.includes(type as WorkItemType);
}

// UUID validation
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Score range validation
export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

// Percentage validation
export function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

// Required field validation
export function validateRequired<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    const value = obj[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`Field '${String(field)}' is required`);
    }
  }
  return errors;
}

// Cross-workspace reference check
export function canReferenceWorkspace(
  sourceWorkspaceId: string,
  targetWorkspaceId: string
): boolean {
  return sourceWorkspaceId === targetWorkspaceId;
}

// AI permission rules
export const AI_PERMISSION_RULES = {
  // AI can generate drafts
  canGenerateDrafts: true,
  // AI cannot delete data
  cannotDeleteData: true,
  // AI cannot modify target values or scoring rules
  cannotModifyTargets: true,
  cannotModifyScoringRules: true,
  // AI needs user confirmation before creating real tasks
  requireConfirmationForTasks: true,
  // AI cannot send sensitive data externally by default
  sensitiveDataRestricted: true,
} as const;

export function canAiPerformAction(action: string): boolean {
  const restrictedActions = [
    'delete',
    'modify_target',
    'modify_scoring_rules',
    'modify_history',
  ];
  return !restrictedActions.includes(action.toLowerCase());
}
