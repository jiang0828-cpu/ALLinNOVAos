import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SUGGESTION_RULES, SuggestionRuleId } from '../constants/suggestion-rules';
import {
  SuggestionType,
  SuggestionSourceType,
  WorkItemStatus,
  WorkItemType,
  PdcaStage,
  Priority,
} from '@prisma/client';

export interface SuggestionRuleResult {
  ruleId: SuggestionRuleId;
  suggestionType: SuggestionType;
  sourceType: SuggestionSourceType;
  sourceRefId: string;
  confidence: number;
  impactScore: number;
  urgencyScore: number;
  reason: string;
  evidence: Record<string, unknown>;
  dedupKey: string;
}

@Injectable()
export class SuggestionRuleEngineService {
  private readonly logger = new Logger(SuggestionRuleEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute all rules for a workspace and return detected suggestion signals
   * This is a read-only operation that gathers data and evaluates rules
   */
  async evaluateRules(
    workspaceId: string,
    cycleId?: string,
  ): Promise<SuggestionRuleResult[]> {
    const results: SuggestionRuleResult[] = [];

    // Rule 1: health_score < 80
    const healthResult = await this.checkHealthScoreBelow80(workspaceId, cycleId);
    if (healthResult) results.push(healthResult);

    // Rule 2: content_planning_progress below target
    const progressResult = await this.checkProgressBelowTarget(workspaceId, cycleId);
    if (progressResult) results.push(progressResult);

    // Rule 3: P0 task overdue
    const overdueResults = await this.checkP0TasksOverdue(workspaceId);
    results.push(...overdueResults);

    // Rule 4: Project delayed or blocked
    const projectResults = await this.checkProjectsAtRisk(workspaceId);
    results.push(...projectResults);

    return results;
  }

  private async checkHealthScoreBelow80(
    workspaceId: string,
    cycleId?: string,
  ): Promise<SuggestionRuleResult | null> {
    const rule = SUGGESTION_RULES.health_below_80;

    // Get latest health_score metric value
    const metricValue = await this.prisma.client.metricValue.findFirst({
      where: {
        workspaceId,
        metric: { name: 'health_score' },
        ...(cycleId ? { cycleId } : {}),
      },
      orderBy: { measuredAt: 'desc' },
    });

    if (!metricValue) return null;

    const healthScore = metricValue.value;
    if (!rule.check(healthScore)) return null;

    // Find related metric gap
    const gap = await this.prisma.client.metricGap.findFirst({
      where: {
        workspaceId,
        metric: { name: 'health_score' },
        ...(cycleId ? { cycleId } : {}),
        isOpen: true,
      },
      orderBy: { detectedAt: 'desc' },
    });

    const sourceRefId = gap?.id || metricValue.id;

    return {
      ruleId: rule.id,
      suggestionType: rule.suggestionType,
      sourceType: SuggestionSourceType.METRIC_GAP,
      sourceRefId,
      confidence: rule.calculateConfidence(healthScore),
      impactScore: rule.calculateImpact(healthScore),
      urgencyScore: rule.calculateUrgency(healthScore),
      reason: `健康度评分 ${healthScore.toFixed(1)} 低于 80 分阈值`,
      evidence: {
        metricName: 'health_score',
        currentValue: healthScore,
        threshold: 80,
        gapId: gap?.id,
      },
      dedupKey: this.buildDedupKey(workspaceId, SuggestionSourceType.METRIC_GAP, sourceRefId, rule.suggestionType, cycleId),
    };
  }

  private async checkProgressBelowTarget(
    workspaceId: string,
    cycleId?: string,
  ): Promise<SuggestionRuleResult | null> {
    const rule = SUGGESTION_RULES.progress_below_target;

    const metric = await this.prisma.client.metric.findUnique({
      where: { name: 'content_planning_progress' },
    });

    if (!metric) return null;

    const metricValue = await this.prisma.client.metricValue.findFirst({
      where: {
        workspaceId,
        metric: { name: 'content_planning_progress' },
        ...(cycleId ? { cycleId } : {}),
      },
      orderBy: { measuredAt: 'desc' },
    });

    if (!metricValue || metric.targetValue === null) return null;

    const currentProgress = metricValue.value;
    const targetProgress = metric.targetValue;

    if (!rule.check(currentProgress, targetProgress)) return null;

    const gap = await this.prisma.client.metricGap.findFirst({
      where: {
        workspaceId,
        metric: { name: 'content_planning_progress' },
        ...(cycleId ? { cycleId } : {}),
        isOpen: true,
      },
      orderBy: { detectedAt: 'desc' },
    });

    const sourceRefId = gap?.id || metricValue.id;

    return {
      ruleId: rule.id,
      suggestionType: rule.suggestionType,
      sourceType: SuggestionSourceType.METRIC_GAP,
      sourceRefId,
      confidence: rule.calculateConfidence(currentProgress, targetProgress),
      impactScore: rule.calculateImpact(currentProgress, targetProgress),
      urgencyScore: rule.calculateUrgency(currentProgress, targetProgress),
      reason: `内容规划进度 ${currentProgress.toFixed(1)}% 低于目标 ${targetProgress}%`,
      evidence: {
        metricName: 'content_planning_progress',
        currentValue: currentProgress,
        targetValue: targetProgress,
        gap: targetProgress - currentProgress,
        gapId: gap?.id,
      },
      dedupKey: this.buildDedupKey(workspaceId, SuggestionSourceType.METRIC_GAP, sourceRefId, rule.suggestionType, cycleId),
    };
  }

  private async checkP0TasksOverdue(
    workspaceId: string,
  ): Promise<SuggestionRuleResult[]> {
    const rule = SUGGESTION_RULES.p0_task_overdue;
    const results: SuggestionRuleResult[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const overdueTasks = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.TASK,
        status: { in: [WorkItemStatus.TODO, WorkItemStatus.IN_PROGRESS, WorkItemStatus.BLOCKED] },
        priority: Priority.P0,
        taskDetail: {
          is: {
            dueAt: { lte: today },
          },
        },
        deletedAt: null,
      },
      include: {
        taskDetail: true,
      },
    });

    for (const task of overdueTasks) {
      const priority = task.priority || 'P0';
      const isOverdue = task.taskDetail?.dueAt ? new Date(task.taskDetail.dueAt) <= today : false;

      if (!rule.check(isOverdue, priority)) continue;

      results.push({
        ruleId: rule.id,
        suggestionType: rule.suggestionType,
        sourceType: SuggestionSourceType.TASK,
        sourceRefId: task.id,
        confidence: rule.calculateConfidence(),
        impactScore: rule.calculateImpact(),
        urgencyScore: rule.calculateUrgency(),
        reason: `P0 任务 "${task.title}" 已于 ${task.taskDetail?.dueAt?.toISOString().split('T')[0] || '今日'} 到期但尚未完成`,
        evidence: {
          taskId: task.id,
          taskTitle: task.title,
          dueAt: task.taskDetail?.dueAt,
          currentStatus: task.status,
          priority,
        },
        dedupKey: this.buildDedupKey(workspaceId, SuggestionSourceType.TASK, task.id, rule.suggestionType),
      });
    }

    return results;
  }

  private async checkProjectsAtRisk(
    workspaceId: string,
  ): Promise<SuggestionRuleResult[]> {
    const rule = SUGGESTION_RULES.project_delayed_or_blocked;
    const results: SuggestionRuleResult[] = [];

    const atRiskProjects = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.PROJECT,
        deletedAt: null,
        projectDetail: {
          is: {
            healthStatus: { in: ['OFF_TRACK', 'ON_HOLD'] },
          },
        },
      },
      include: {
        projectDetail: true,
      },
    });

    for (const project of atRiskProjects) {
      const healthStatus = project.projectDetail?.healthStatus || 'ON_TRACK';

      if (!rule.check(healthStatus)) continue;

      results.push({
        ruleId: rule.id,
        suggestionType: rule.suggestionType,
        sourceType: SuggestionSourceType.PROJECT,
        sourceRefId: project.id,
        confidence: rule.calculateConfidence(healthStatus),
        impactScore: rule.calculateImpact(healthStatus),
        urgencyScore: rule.calculateUrgency(healthStatus),
        reason: `项目 "${project.title}" 状态为 ${healthStatus === 'OFF_TRACK' ? '已偏离轨道' : '已暂停'}，需要立即关注`,
        evidence: {
          projectId: project.id,
          projectTitle: project.title,
          healthStatus,
          progress: project.projectDetail?.progress,
        },
        dedupKey: this.buildDedupKey(workspaceId, SuggestionSourceType.PROJECT, project.id, rule.suggestionType),
      });
    }

    return results;
  }

  private buildDedupKey(
    workspaceId: string,
    sourceType: SuggestionSourceType,
    sourceRefId: string,
    suggestionType: SuggestionType,
    cycleId?: string,
  ): string {
    return `${workspaceId}:${sourceType}:${sourceRefId}:${suggestionType}:${cycleId || 'no-cycle'}`;
  }
}
