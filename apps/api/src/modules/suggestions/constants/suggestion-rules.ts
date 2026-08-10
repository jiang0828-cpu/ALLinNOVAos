/**
 * Suggestion rule definitions for the first release
 */

export const SUGGESTION_RULES = {
  health_below_80: {
    id: 'health_below_80',
    suggestionType: 'HEALTH_IMPROVEMENT' as const,
    description: 'health_score < 80',
    check: (healthScore: number) => healthScore < 80,
    calculateConfidence: (healthScore: number) => {
      if (healthScore < 50) return 0.9;
      if (healthScore < 65) return 0.75;
      return 0.6;
    },
    calculateImpact: (healthScore: number) => {
      if (healthScore < 50) return 90;
      if (healthScore < 65) return 70;
      return 50;
    },
    calculateUrgency: (healthScore: number) => {
      if (healthScore < 50) return 95;
      if (healthScore < 65) return 75;
      return 55;
    },
  },
  progress_below_target: {
    id: 'progress_below_target',
    suggestionType: 'PROGRESS_ACCELERATION' as const,
    description: 'content_planning_progress below target',
    check: (currentProgress: number, targetProgress: number) => currentProgress < targetProgress,
    calculateConfidence: (currentProgress: number, targetProgress: number) => {
      const gap = targetProgress - currentProgress;
      if (gap > 40) return 0.9;
      if (gap > 20) return 0.75;
      return 0.6;
    },
    calculateImpact: (currentProgress: number, targetProgress: number) => {
      const gap = targetProgress - currentProgress;
      return Math.min(100, gap * 2);
    },
    calculateUrgency: (currentProgress: number, targetProgress: number) => {
      const gap = targetProgress - currentProgress;
      if (gap > 40) return 95;
      if (gap > 20) return 75;
      return 55;
    },
  },
  p0_task_overdue: {
    id: 'p0_task_overdue',
    suggestionType: 'TASK_RESOLUTION' as const,
    description: 'P0 task due today but not completed',
    check: (isOverdue: boolean, priority: string) => isOverdue && priority === 'P0',
    calculateConfidence: () => 0.95,
    calculateImpact: () => 85,
    calculateUrgency: () => 100,
  },
  project_delayed_or_blocked: {
    id: 'project_delayed_or_blocked',
    suggestionType: 'RISK_MITIGATION' as const,
    description: 'Project healthStatus is delayed or blocked',
    check: (healthStatus: string) => healthStatus === 'OFF_TRACK' || healthStatus === 'ON_HOLD',
    calculateConfidence: (healthStatus: string) => {
      if (healthStatus === 'ON_HOLD') return 0.9;
      return 0.8;
    },
    calculateImpact: (healthStatus: string) => {
      if (healthStatus === 'ON_HOLD') return 90;
      return 75;
    },
    calculateUrgency: (healthStatus: string) => {
      if (healthStatus === 'ON_HOLD') return 85;
      return 70;
    },
  },
} as const;

export type SuggestionRuleId = keyof typeof SUGGESTION_RULES;
