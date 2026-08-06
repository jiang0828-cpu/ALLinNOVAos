// Score Rules (评分规则)

import { getScoreColor, type Priority } from '@nova-os/shared-types';

// Score thresholds
export const SCORE_THRESHOLDS = {
  excellent: 80,
  watch: 60,
} as const;

// Breakdown dimensions and weights
export const SCORE_BREAKDOWN = [
  { label: '健康', weight: 0.2 },
  { label: '财富', weight: 0.2 },
  { label: '工作', weight: 0.2 },
  { label: '内容', weight: 0.2 },
  { label: '学习', weight: 0.2 },
] as const;

// Calculate composite Life Score
export function calculateLifeScore(
  breakdown: Array<{ label: string; value: number }>
): number {
  const weightMap = Object.fromEntries(
    SCORE_BREAKDOWN.map((d) => [d.label, d.weight])
  );

  const score = breakdown.reduce(
    (sum, item) => sum + item.value * (weightMap[item.label] || 0),
    0
  );

  return Math.min(100, Math.max(0, Math.round(score)));
}

// Get score color (idempotent, pure function)
export function getColorForScore(score: number): string {
  return getScoreColor(score);
}

// Calculate goal achievement percentage
export function calculateGoalAchievement(
  targetValue: number | null | undefined,
  actualValue: number | null | undefined
): number {
  if (!targetValue || targetValue === 0) return 0;
  if (!actualValue) return 0;
  return Math.min(100, Math.round((actualValue / targetValue) * 100));
}

// Calculate task completion rate
export function calculateTaskCompletionRate(
  totalCount: number,
  doneCount: number
): number {
  if (totalCount === 0) return 0;
  return Math.min(100, Math.round((doneCount / totalCount) * 100));
}

// Calculate issue health score
export function calculateIssueHealthScore(
  totalIssues: number,
  openHighIssues: number
): number {
  if (totalIssues === 0) return 100;
  const health = 100 - (openHighIssues / totalIssues) * 100;
  return Math.min(100, Math.max(0, Math.round(health)));
}

// Priority weight for sorting
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  P0: 3,
  P1: 2,
  P2: 1,
};

export function compareByPriority(a: Priority, b: Priority): number {
  return PRIORITY_WEIGHT[b] - PRIORITY_WEIGHT[a];
}
