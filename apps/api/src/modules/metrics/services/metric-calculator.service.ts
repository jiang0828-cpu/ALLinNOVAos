import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { WorkItemStatus, WorkItemType, PdcaStage, Prisma } from '@prisma/client';
import {
  METRIC_DEFINITIONS,
  TASK_DONE_STATUSES,
  TASK_EFFECTIVE_STATUSES,
} from '../constants/metric-definitions';

export interface MetricCalculationResult {
  value: number;
  metadata: Record<string, any>;
  calculationVersion: string;
  sourceType: 'SYSTEM' | 'MANUAL' | 'AI';
}

export interface GapDetectionResult {
  hasGap: boolean;
  gapType?: 'BELOW_TARGET' | 'ABOVE_WARNING' | 'BELOW_WARNING';
  gapValue?: number;
  severity?: string;
  expectedValue?: number;
  actualValue?: number;
}

@Injectable()
export class MetricCalculatorService {
  private readonly logger = new Logger(MetricCalculatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate content_planning_progress
   * Formula: 已完成有效任务数 / 项目有效任务总数 × 100
   * Rule: Must recalculate fresh, not cumulative
   */
  async calculateContentPlanningProgress(
    workspaceId: string,
    cycleId?: string,
    projectId?: string,
  ): Promise<MetricCalculationResult> {
    const whereBase: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.TASK,
      pdcaStage: PdcaStage.DO,
      deletedAt: null,
      status: { in: TASK_EFFECTIVE_STATUSES },
    };

    if (cycleId) {
      whereBase.cycleId = cycleId;
    }

    if (projectId) {
      whereBase.parentId = projectId;
    } else {
      // If no project specified, get all tasks in workspace
      // But we need to filter by projects in the workspace
      const projects = await this.prisma.client.workItem.findMany({
        where: {
          workspaceId,
          itemType: WorkItemType.PROJECT,
          deletedAt: null,
          ...(cycleId ? { cycleId } : {}),
        },
        select: { id: true },
      });
      const projectIds = projects.map((p) => p.id);
      whereBase.parentId = { in: projectIds };
    }

    // Count total effective tasks
    const totalTasks = await this.prisma.client.workItem.count({
      where: whereBase,
    });

    // Count done tasks
    const doneTasks = await this.prisma.client.workItem.count({
      where: {
        ...whereBase,
        status: { in: TASK_DONE_STATUSES },
      },
    });

    const value = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

    return {
      value: Math.round(value * 100) / 100, // Round to 2 decimal places
      metadata: {
        totalTasks,
        doneTasks,
        cycleId: cycleId || null,
        projectId: projectId || null,
        calculationTimestamp: new Date().toISOString(),
      },
      calculationVersion: '1.0',
      sourceType: 'SYSTEM',
    };
  }

  /**
   * Calculate work_task_completion_rate
   * Formula: DONE tasks / Total tasks × 100
   */
  async calculateWorkTaskCompletionRate(
    workspaceId: string,
    cycleId?: string,
  ): Promise<MetricCalculationResult> {
    const whereBase: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.TASK,
      pdcaStage: PdcaStage.DO,
      deletedAt: null,
      status: { in: TASK_EFFECTIVE_STATUSES },
    };

    if (cycleId) {
      whereBase.cycleId = cycleId;
    }

    const totalTasks = await this.prisma.client.workItem.count({
      where: whereBase,
    });

    const doneTasks = await this.prisma.client.workItem.count({
      where: {
        ...whereBase,
        status: { in: TASK_DONE_STATUSES },
      },
    });

    const value = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

    return {
      value: Math.round(value * 100) / 100,
      metadata: {
        totalTasks,
        doneTasks,
        cycleId: cycleId || null,
        calculationTimestamp: new Date().toISOString(),
      },
      calculationVersion: '1.0',
      sourceType: 'SYSTEM',
    };
  }

  /**
   * Calculate content_score
   * Formula: content_planning_progress × 0.4 + goal_achievement × 0.6
   */
  async calculateContentScore(
    workspaceId: string,
    cycleId?: string,
  ): Promise<MetricCalculationResult> {
    const progressResult = await this.calculateContentPlanningProgress(workspaceId, cycleId);

    // Calculate goal achievement
    const goalsWhere: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.GOAL,
      deletedAt: null,
      status: { not: WorkItemStatus.CANCELLED },
    };

    if (cycleId) {
      goalsWhere.cycleId = cycleId;
    }

    const goals = await this.prisma.client.workItem.findMany({
      where: goalsWhere,
      include: { goalDetail: true },
    });

    let totalProgress = 0;
    let validGoals = 0;

    for (const goal of goals) {
      if (goal.goalDetail && goal.goalDetail.targetValue && goal.goalDetail.targetValue > 0) {
        const achievement = (goal.goalDetail.currentValue || 0) / goal.goalDetail.targetValue * 100;
        totalProgress += Math.min(achievement, 100); // Cap at 100
        validGoals++;
      }
    }

    const goalAchievement = validGoals > 0 ? totalProgress / validGoals : 0;

    const value = progressResult.value * 0.4 + goalAchievement * 0.6;

    return {
      value: Math.round(value * 100) / 100,
      metadata: {
        contentPlanningProgress: progressResult.value,
        goalAchievement: Math.round(goalAchievement * 100) / 100,
        totalGoals: goals.length,
        validGoals,
        cycleId: cycleId || null,
        calculationTimestamp: new Date().toISOString(),
      },
      calculationVersion: '1.0',
      sourceType: 'SYSTEM',
    };
  }

  /**
   * Calculate work_score
   * Formula: task_completion_rate × 0.6 + on_time_completion_rate × 0.4
   */
  async calculateWorkScore(
    workspaceId: string,
    cycleId?: string,
  ): Promise<MetricCalculationResult> {
    const completionResult = await this.calculateWorkTaskCompletionRate(workspaceId, cycleId);

    // Calculate on-time completion rate
    const whereBase: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.TASK,
      pdcaStage: PdcaStage.DO,
      deletedAt: null,
      status: { in: TASK_DONE_STATUSES },
    };

    if (cycleId) {
      whereBase.cycleId = cycleId;
    }

    const doneTasks = await this.prisma.client.workItem.findMany({
      where: whereBase,
      include: { taskDetail: true },
    });

    let onTimeCount = 0;
    let totalWithDueDate = 0;

    const now = new Date();
    for (const task of doneTasks) {
      if (task.taskDetail?.dueAt) {
        totalWithDueDate++;
        // Task is on-time if completedAt <= dueAt
        const completedAt = task.completedAt || task.updatedAt;
        if (completedAt <= task.taskDetail.dueAt) {
          onTimeCount++;
        }
      }
    }

    const onTimeRate = totalWithDueDate > 0 ? (onTimeCount / totalWithDueDate) * 100 : 100;

    const value = completionResult.value * 0.6 + onTimeRate * 0.4;

    return {
      value: Math.round(value * 100) / 100,
      metadata: {
        taskCompletionRate: completionResult.value,
        onTimeCompletionRate: Math.round(onTimeRate * 100) / 100,
        onTimeCount,
        totalWithDueDate,
        cycleId: cycleId || null,
        calculationTimestamp: new Date().toISOString(),
      },
      calculationVersion: '1.0',
      sourceType: 'SYSTEM',
    };
  }

  /**
   * Calculate health_score
   * Formula: 100 - (open_high_issue_count / total_tasks × 100)
   */
  async calculateHealthScore(
    workspaceId: string,
    cycleId?: string,
  ): Promise<MetricCalculationResult> {
    // Count total tasks
    const taskWhere: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.TASK,
      pdcaStage: PdcaStage.DO,
      deletedAt: null,
    };

    if (cycleId) {
      taskWhere.cycleId = cycleId;
    }

    const totalTasks = await this.prisma.client.workItem.count({
      where: taskWhere,
    });

    // Count open high-severity issues
    const issueWhere: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.ISSUE,
      pdcaStage: PdcaStage.CHECK,
      deletedAt: null,
      status: WorkItemStatus.ACTIVE,
      issueDetail: {
        is: {
          status: 'OPEN',
          level: 'HIGH',
        },
      },
    };

    if (cycleId) {
      issueWhere.cycleId = cycleId;
    }

    const highIssues = await this.prisma.client.workItem.count({
      where: issueWhere,
    });

    const value = totalTasks > 0 ? 100 - (highIssues / totalTasks * 100) : 100;

    return {
      value: Math.max(0, Math.round(value * 100) / 100),
      metadata: {
        totalTasks,
        highIssueCount: highIssues,
        cycleId: cycleId || null,
        calculationTimestamp: new Date().toISOString(),
      },
      calculationVersion: '1.0',
      sourceType: 'SYSTEM',
    };
  }

  /**
   * Detect if a value has a gap compared to target or warning threshold
   */
  detectGap(
    metricName: string,
    value: number,
  ): GapDetectionResult {
    const definition = METRIC_DEFINITIONS[metricName];
    if (!definition) {
      return { hasGap: false };
    }

    const targetValue = definition.targetValue ?? 100;
    const warningThreshold = definition.warningThreshold ?? 60;

    // Below target
    if (value < targetValue) {
      const gapValue = targetValue - value;
      const severity = value < warningThreshold ? 'high' : 'medium';
      return {
        hasGap: true,
        gapType: 'BELOW_TARGET',
        gapValue,
        severity,
        expectedValue: targetValue,
        actualValue: value,
      };
    }

    return { hasGap: false };
  }

  /**
   * Calculate all metrics for a workspace
   */
  async calculateAllMetrics(
    workspaceId: string,
    cycleId?: string,
  ): Promise<Map<string, MetricCalculationResult>> {
    const results = new Map<string, MetricCalculationResult>();

    try {
      // Calculate all 5 metrics
      const [
        progress,
        completion,
        contentScore,
        workScore,
        healthScore,
      ] = await Promise.all([
        this.calculateContentPlanningProgress(workspaceId, cycleId),
        this.calculateWorkTaskCompletionRate(workspaceId, cycleId),
        this.calculateContentScore(workspaceId, cycleId),
        this.calculateWorkScore(workspaceId, cycleId),
        this.calculateHealthScore(workspaceId, cycleId),
      ]);

      results.set('content_planning_progress', progress);
      results.set('work_task_completion_rate', completion);
      results.set('content_score', contentScore);
      results.set('work_score', workScore);
      results.set('health_score', healthScore);
    } catch (error) {
      this.logger.error(`Failed to calculate metrics: ${error}`);
      throw error;
    }

    return results;
  }
}
