import { WorkItemStatus } from '@prisma/client';

export interface MetricDefinition {
  name: string;
  displayName: string;
  description: string;
  calculationType: string;
  unit?: string;
  targetValue?: number;
  warningThreshold?: number;
  formula: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  content_planning_progress: {
    name: 'content_planning_progress',
    displayName: '内容规划进度',
    description: '项目中已完成任务的比例，反映规划执行进度',
    calculationType: 'ratio',
    unit: '%',
    targetValue: 100,
    warningThreshold: 60,
    formula: '已完成有效任务数 / 项目有效任务总数 × 100',
  },
  work_task_completion_rate: {
    name: 'work_task_completion_rate',
    displayName: '工作任务完成率',
    description: '工作区中所有任务的完成比例',
    calculationType: 'ratio',
    unit: '%',
    targetValue: 100,
    warningThreshold: 70,
    formula: '状态为 DONE 的任务数 / 总任务数 × 100',
  },
  content_score: {
    name: 'content_score',
    displayName: '内容质量分',
    description: '基于任务完成质量和目标达成度的综合评分',
    calculationType: 'score',
    unit: '分',
    targetValue: 100,
    warningThreshold: 60,
    formula: '内容规划进度 × 0.4 + 目标达成度 × 0.6',
  },
  work_score: {
    name: 'work_score',
    displayName: '工作效率分',
    description: '基于任务完成率和及时性的综合评分',
    calculationType: 'score',
    unit: '分',
    targetValue: 100,
    warningThreshold: 70,
    formula: '任务完成率 × 0.6 + 准时完成率 × 0.4',
  },
  health_score: {
    name: 'health_score',
    displayName: '健康度评分',
    description: '基于 Issue 数量和严重程度的系统健康评分',
    calculationType: 'score',
    unit: '分',
    targetValue: 100,
    warningThreshold: 60,
    formula: '1 - (高严重度 Issue 数 / 总任务数) × 100',
  },
};

export const TASK_DONE_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.DONE,
  WorkItemStatus.COMPLETED,
];

export const TASK_EFFECTIVE_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.TODO,
  WorkItemStatus.IN_PROGRESS,
  WorkItemStatus.DONE,
  WorkItemStatus.COMPLETED,
  WorkItemStatus.BLOCKED,
];
