// PDCAr Stages (PDCAr 阶段)
// Plan-Do-Check-Act-Review

export const PDCAR_STAGES = {
  PLAN: 'plan',
  DO: 'do',
  CHECK: 'check',
  ACT: 'act',
  REVIEW: 'review',
} as const;

export type PdcarStage = typeof PDCAR_STAGES[keyof typeof PDCAR_STAGES];

// PDCAr Object Type Mapping
export const PDCAR_MAPPING: Record<string, string[]> = {
  [PDCAR_STAGES.PLAN]: ['goal', 'project', 'idea'],
  [PDCAR_STAGES.DO]: ['task'],
  [PDCAR_STAGES.CHECK]: ['issue', 'metric'],
  [PDCAR_STAGES.ACT]: ['suggestion', 'decision'],
  [PDCAR_STAGES.REVIEW]: ['review', 'insight'],
};

// Business Chain (业务链路)
export const BUSINESS_CHAIN = [
  'IDEA',
  'GOAL',
  'PROJECT',
  'TASK',
  'ISSUE',
  'SUGGESTION',
  'DECISION',
  'REVIEW',
  'INSIGHT',
  'NEXT_CYCLE_PLAN',
] as const;

export type BusinessChainNode = typeof BUSINESS_CHAIN[number];

// Helper: get stage for object type
export function getStageForObjectType(type: string): PdcarStage | null {
  for (const [stage, types] of Object.entries(PDCAR_MAPPING)) {
    if (types.includes(type.toLowerCase())) {
      return stage as PdcarStage;
    }
  }
  return null;
}

// Helper: validate business chain transition
export function isValidChainTransition(
  from: BusinessChainNode,
  to: BusinessChainNode
): boolean {
  const fromIndex = BUSINESS_CHAIN.indexOf(from);
  const toIndex = BUSINESS_CHAIN.indexOf(to);
  return toIndex === fromIndex + 1;
}
