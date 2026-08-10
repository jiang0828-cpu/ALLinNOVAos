import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  WorkItemType,
  WorkItemStatus,
  SuggestionStatus,
  IssueStatus,
} from '@prisma/client';

/**
 * Aggregated review data structure
 */
export interface AggregatedReviewData {
  // Task completion metrics
  taskCompletion: {
    totalTasks: number;
    doneTasks: number;
    completionRate: number;
  };

  // Project progress changes
  projectProgress: Array<{
    projectId: string;
    title: string;
    progress: number;
    healthStatus: string;
  }>;

  // Metric value changes
  metricChanges: Array<{
    metricName: string;
    displayName: string;
    currentValue: number;
    targetValue: number | null;
    unit: string | null;
  }>;

  // Unresolved issues
  unresolvedIssues: Array<{
    id: string;
    title: string;
    severity: string;
    metricName: string | null;
  }>;

  // Accepted suggestions
  acceptedSuggestions: Array<{
    id: string;
    title: string;
    suggestionType: string;
    impactScore: number;
  }>;

  // Goal progress
  goalProgress: Array<{
    id: string;
    title: string;
    targetValue: number | null;
    currentValue: number | null;
    achievementRate: number;
  }>;

  // Summary calculations
  healthScore: number | null;
  contentPlanningProgress: number | null;
  workTaskCompletionRate: number | null;

  // Auto-generated next cycle focus (based on data)
  suggestedNextCycleFocus: string[];
}

@Injectable()
export class ReviewAggregatorService {
  private readonly logger = new Logger(ReviewAggregatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate all cycle data for review draft generation
   */
  async aggregateCycleData(
    workspaceId: string,
    cycleId: string
  ): Promise<AggregatedReviewData> {
    this.logger.log(
      `Aggregating cycle data for workspace ${workspaceId}, cycle ${cycleId}`
    );

    const [
      taskCompletion,
      projectProgress,
      metricChanges,
      unresolvedIssues,
      acceptedSuggestions,
      goalProgress,
      healthScore,
      contentPlanningProgress,
      workTaskCompletionRate,
    ] = await Promise.all([
      this.aggregateTaskCompletion(workspaceId, cycleId),
      this.aggregateProjectProgress(workspaceId, cycleId),
      this.aggregateMetricChanges(workspaceId, cycleId),
      this.aggregateUnresolvedIssues(workspaceId, cycleId),
      this.aggregateAcceptedSuggestions(workspaceId, cycleId),
      this.aggregateGoalProgress(workspaceId, cycleId),
      this.getLatestMetricValue(workspaceId, 'health_score'),
      this.getLatestMetricValue(workspaceId, 'content_planning_progress'),
      this.getLatestMetricValue(workspaceId, 'work_task_completion_rate'),
    ]);

    const suggestedNextCycleFocus = this.generateNextCycleFocus(
      taskCompletion,
      unresolvedIssues,
      acceptedSuggestions,
      healthScore,
      contentPlanningProgress
    );

    return {
      taskCompletion,
      projectProgress,
      metricChanges,
      unresolvedIssues,
      acceptedSuggestions,
      goalProgress,
      healthScore: healthScore?.value ?? null,
      contentPlanningProgress: contentPlanningProgress?.value ?? null,
      workTaskCompletionRate: workTaskCompletionRate?.value ?? null,
      suggestedNextCycleFocus,
    };
  }

  private async aggregateTaskCompletion(workspaceId: string, cycleId: string) {
    const cycle = await this.prisma.client.pdcaCycle.findUnique({
      where: { id: cycleId },
      select: { startDate: true, endDate: true },
    });

    const whereBase = {
      workspaceId,
      itemType: WorkItemType.TASK,
      deletedAt: null,
      ...(cycle
        ? {
            createdAt: {
              gte: cycle.startDate,
              lte: cycle.endDate,
            },
          }
        : {}),
    };

    const [totalTasks, doneTasks] = await Promise.all([
      this.prisma.client.workItem.count({ where: whereBase }),
      this.prisma.client.workItem.count({
        where: { ...whereBase, status: WorkItemStatus.DONE },
      }),
    ]);

    const completionRate =
      totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 10000) / 100 : 0;

    return { totalTasks, doneTasks, completionRate };
  }

  private async aggregateProjectProgress(workspaceId: string, cycleId: string) {
    const projects = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.PROJECT,
        deletedAt: null,
        cycleId,
      },
      include: {
        projectDetail: true,
      },
    });

    return projects.map((p) => ({
      projectId: p.id,
      title: p.title,
      progress: p.projectDetail?.progress ?? 0,
      healthStatus: p.projectDetail?.healthStatus ?? 'ON_TRACK',
    }));
  }

  private async aggregateMetricChanges(workspaceId: string, cycleId: string) {
    const metrics = await this.prisma.client.metric.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        values: {
          where: { cycleId },
          orderBy: { measuredAt: 'desc' },
          take: 1,
        },
      },
    });

    return metrics
      .filter((m) => m.values.length > 0)
      .map((m) => ({
        metricName: m.name,
        displayName: m.displayName,
        currentValue: m.values[0].value,
        targetValue: m.targetValue,
        unit: m.unit,
      }));
  }

  private async aggregateUnresolvedIssues(
    workspaceId: string,
    cycleId: string
  ) {
    const issues = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.ISSUE,
        deletedAt: null,
        cycleId,
        issueDetail: {
          is: {
            status: IssueStatus.OPEN,
          },
        },
      },
      include: {
        issueDetail: true,
      },
    });

    return issues.map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.issueDetail?.severity ?? 'medium',
      metricName: i.issueDetail?.metricName ?? null,
    }));
  }

  private async aggregateAcceptedSuggestions(
    workspaceId: string,
    cycleId: string
  ) {
    const suggestions = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.SUGGESTION,
        deletedAt: null,
        cycleId,
        suggestionDetail: {
          is: {
            status: SuggestionStatus.ACCEPTED,
          },
        },
      },
      include: {
        suggestionDetail: true,
      },
    });

    return suggestions.map((s) => ({
      id: s.id,
      title: s.title,
      suggestionType:
        s.suggestionDetail?.suggestionType ?? 'RESOURCE_OPTIMIZATION',
      impactScore: s.suggestionDetail?.impactScore ?? 50,
    }));
  }

  private async aggregateGoalProgress(workspaceId: string, cycleId: string) {
    const goals = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.GOAL,
        deletedAt: null,
        cycleId,
      },
      include: {
        goalDetail: true,
      },
    });

    return goals.map((g) => {
      const target = g.goalDetail?.targetValue;
      const actual = g.goalDetail?.currentValue;
      const achievementRate =
        target && target > 0 && actual !== null && actual !== undefined
          ? Math.min(100, Math.round((actual / target) * 10000) / 100)
          : 0;

      return {
        id: g.id,
        title: g.title,
        targetValue: target ?? null,
        currentValue: actual ?? null,
        achievementRate,
      };
    });
  }

  private async getLatestMetricValue(workspaceId: string, metricName: string) {
    return this.prisma.client.metricValue.findFirst({
      where: {
        workspaceId,
        metric: { name: metricName },
      },
      orderBy: { measuredAt: 'desc' },
      select: { value: true },
    });
  }

  /**
   * Generate suggested next cycle focus based on aggregated data
   */
  private generateNextCycleFocus(
    taskCompletion: {
      totalTasks: number;
      doneTasks: number;
      completionRate: number;
    },
    unresolvedIssues: Array<{ severity: string }>,
    acceptedSuggestions: Array<{ impactScore: number }>,
    healthScore: { value: number } | null,
    contentPlanningProgress: { value: number } | null
  ): string[] {
    const focus: string[] = [];

    // Low task completion
    if (taskCompletion.completionRate < 60) {
      focus.push(
        `提升任务完成率（当前 ${taskCompletion.completionRate}%，目标 ≥ 80%）`,
      );
    }

    // Unresolved issues
    if (unresolvedIssues.length > 0) {
      const highSeverity = unresolvedIssues.filter(
        (i) => i.severity === 'high',
      ).length;
      if (highSeverity > 0) {
        focus.push(`优先解决 ${highSeverity} 个高严重度问题`);
      } else {
        focus.push(`跟进 ${unresolvedIssues.length} 个未解决问题`);
      }
    }

    // Accepted suggestions without derived tasks
    if (acceptedSuggestions.length > 0) {
      focus.push(`执行 ${acceptedSuggestions.length} 个已接受建议的调整任务`);
    }

    // Health score
    if (healthScore && healthScore.value < 80) {
      focus.push(
        `提升健康度评分（当前 ${healthScore.value.toFixed(1)}，目标 ≥ 80）`
      );
    }

    // Content planning progress
    if (contentPlanningProgress && contentPlanningProgress.value < 60) {
      focus.push(
        `加速内容规划进度（当前 ${contentPlanningProgress.value.toFixed(1)}%，目标 ≥ 60%）`
      );
    }

    // Default if nothing detected
    if (focus.length === 0) {
      focus.push('维持当前状态，持续优化执行效率');
    }

    return focus;
  }
}
