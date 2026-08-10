import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  WorkItemType,
  WorkItemStatus,
  ReviewStatus,
  InsightStatus,
  SuggestionStatus,
  Domain,
} from '@prisma/client';
import {
  DashboardOverviewResponseDto,
  DomainScoreDto,
  TodayFocusItemDto,
  ActiveProjectDto,
  OpenIssueDto,
  PendingSuggestionDto,
  LatestReviewDto,
  ActiveInsightDto,
} from '../dto/dashboard-response.dto';

/**
 * DashboardQueryService
 *
 * Real-time aggregation layer for the dashboard.
 * This is a READ-ONLY query service — it never writes to business tables.
 * It directly queries Prisma to avoid circular dependencies with business modules.
 *
 * Design rules (from ai-development-rules.md §5):
 * - Dashboard is a read model, not the source of truth.
 * - Must not become the data source for business facts.
 * - Prefers real-time queries over cached snapshots.
 */
@Injectable()
export class DashboardQueryService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Build the full dashboard overview for a workspace, optionally scoped
   * to a specific reference date.
   */
  async getOverview(
    workspaceId: string,
    referenceDate?: Date
  ): Promise<DashboardOverviewResponseDto> {
    // Validate workspace
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, timezone: true },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    const refDate = referenceDate || new Date();
    const tz = workspace.timezone || 'Asia/Shanghai';

    // Run all independent queries in parallel
    const [
      domainScores,
      todayFocus,
      activeProjects,
      openIssues,
      pendingSuggestions,
      latestReview,
      activeInsights,
    ] = await Promise.all([
      this.buildDomainScores(workspaceId),
      this.buildTodayFocus(workspaceId, refDate, tz),
      this.buildActiveProjects(workspaceId),
      this.buildOpenIssues(workspaceId),
      this.buildPendingSuggestions(workspaceId),
      this.buildLatestReview(workspaceId),
      this.buildActiveInsights(workspaceId),
    ]);

    const overallScore = this.computeOverallScore(domainScores);

    return {
      overallScore,
      domainScores,
      todayFocus,
      activeProjects,
      openIssues,
      pendingSuggestions,
      latestReview,
      activeInsights,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  // ------------------------------------------------------------------
  // Scoring
  // ------------------------------------------------------------------

  /**
   * Weighted average of all domain scores (0-100).
   */
  private computeOverallScore(domainScores: DomainScoreDto[]): number {
    if (domainScores.length === 0) return 0;
    const total = domainScores.reduce((sum, d) => sum + d.score, 0);
    return Math.round((total / domainScores.length) * 10) / 10;
  }

  // ------------------------------------------------------------------
  // Builders
  // ------------------------------------------------------------------

  /**
   * Per-domain score based on: task completion rate, goal progress,
   * issue resolution rate, active project health.
   */
  private async buildDomainScores(
    workspaceId: string
  ): Promise<DomainScoreDto[]> {
    const domains = await this.prisma.client.domain.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });

    if (domains.length === 0) return [];

    const result: DomainScoreDto[] = [];

    for (const domain of domains) {
      const score = await this.computeDomainScore(workspaceId, domain);
      result.push({
        domainId: domain.id,
        domainName: domain.name,
        score: Math.round(score * 10) / 10,
      });
    }

    return result;
  }

  private async computeDomainScore(
    workspaceId: string,
    domain: Pick<Domain, 'id'>
  ): Promise<number> {
    // Task completion: done / total (weight 0.3)
    const taskCounts = await this.prisma.client.workItem.aggregate({
      where: {
        workspaceId,
        domainId: domain.id,
        itemType: WorkItemType.TASK,
        deletedAt: null,
      },
      _count: { id: true },
    });

    const doneTasks = await this.prisma.client.workItem.count({
      where: {
        workspaceId,
        domainId: domain.id,
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.COMPLETED,
        deletedAt: null,
      },
    });

    const totalTasks = taskCounts._count.id;
    const taskRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

    // Goal progress (weight 0.3)
    const goals = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        domainId: domain.id,
        itemType: WorkItemType.GOAL,
        status: { in: [WorkItemStatus.ACTIVE, WorkItemStatus.PLANNING] },
        deletedAt: null,
      },
      include: { goalDetail: true },
    });

    const goalProgress =
      goals.length > 0
        ? goals.reduce((sum, g) => sum + (g.goalDetail?.progress || 0), 0) /
          goals.length
        : 0;

    // Issue resolution: (total - open) / total (weight 0.2)
    const totalIssues = await this.prisma.client.workItem.count({
      where: {
        workspaceId,
        domainId: domain.id,
        itemType: WorkItemType.ISSUE,
        deletedAt: null,
      },
    });
    const openIssues = await this.prisma.client.workItem.count({
      where: {
        workspaceId,
        domainId: domain.id,
        itemType: WorkItemType.ISSUE,
        issueDetail: { status: 'OPEN' },
        deletedAt: null,
      },
    });
    const issueResolution =
      totalIssues > 0 ? ((totalIssues - openIssues) / totalIssues) * 100 : 100;

    // Project health (weight 0.2)
    const projects = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        domainId: domain.id,
        itemType: WorkItemType.PROJECT,
        status: { in: [WorkItemStatus.ACTIVE, WorkItemStatus.PLANNING] },
        deletedAt: null,
      },
      include: { projectDetail: true },
    });
    const healthMap: Record<string, number> = {
      ON_TRACK: 100,
      AT_RISK: 60,
      OFF_TRACK: 20,
      ON_HOLD: 50,
    };
    const projectHealth =
      projects.length > 0
        ? projects.reduce(
            (sum, p) =>
              sum +
              (healthMap[p.projectDetail?.healthStatus || 'ON_TRACK'] || 50),
            0
          ) / projects.length
        : 80;

    // Weighted composite
    return (
      taskRate * 0.3 +
      goalProgress * 0.3 +
      issueResolution * 0.2 +
      projectHealth * 0.2
    );
  }

  /**
   * Items focused for the given date:
   * - Tasks with plannedStartAt / plannedEndAt on the reference date
   * - Goals with targetDate on the reference date
   */
  private async buildTodayFocus(
    workspaceId: string,
    refDate: Date,
    _tz: string
  ): Promise<TodayFocusItemDto[]> {
    void _tz;
    // Start and end of the reference day
    const dayStart = new Date(refDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(refDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const [tasks, goals] = await Promise.all([
      this.prisma.client.workItem.findMany({
        where: {
          workspaceId,
          itemType: WorkItemType.TASK,
          deletedAt: null,
          OR: [
            { plannedStartAt: { gte: dayStart, lte: dayEnd } },
            { plannedEndAt: { gte: dayStart, lte: dayEnd } },
          ],
        },
        orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
        take: 20,
      }),
      this.prisma.client.workItem.findMany({
        where: {
          workspaceId,
          itemType: WorkItemType.GOAL,
          deletedAt: null,
          goalDetail: { targetDate: { gte: dayStart, lte: dayEnd } },
        },
        orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
        take: 10,
      }),
    ]);

    const taskItems: TodayFocusItemDto[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      itemType: 'TASK',
      status: t.status,
      priority: t.priority ?? undefined,
    }));

    const goalItems: TodayFocusItemDto[] = goals.map((g) => ({
      id: g.id,
      title: g.title,
      itemType: 'GOAL',
      status: g.status,
      priority: g.priority ?? undefined,
    }));

    return [...taskItems, ...goalItems];
  }

  private async buildActiveProjects(
    workspaceId: string
  ): Promise<ActiveProjectDto[]> {
    const projects = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.PROJECT,
        status: { in: [WorkItemStatus.ACTIVE, WorkItemStatus.PLANNING] },
        deletedAt: null,
      },
      include: { projectDetail: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      progress: p.projectDetail?.progress ?? 0,
      healthStatus: p.projectDetail?.healthStatus ?? 'ON_TRACK',
    }));
  }

  private async buildOpenIssues(workspaceId: string): Promise<OpenIssueDto[]> {
    const issues = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.ISSUE,
        deletedAt: null,
        issueDetail: { status: 'OPEN' },
      },
      include: { issueDetail: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return issues.map((i) => ({
      id: i.id,
      title: i.title,
      level: i.issueDetail?.level ?? 'MEDIUM',
      status: i.issueDetail?.status ?? 'OPEN',
    }));
  }

  private async buildPendingSuggestions(
    workspaceId: string
  ): Promise<PendingSuggestionDto[]> {
    const suggestions = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.SUGGESTION,
        deletedAt: null,
        suggestionDetail: {
          status: { in: [SuggestionStatus.PENDING, SuggestionStatus.DEFERRED] },
        },
      },
      include: { suggestionDetail: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return suggestions.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.suggestionDetail?.status ?? 'PENDING',
      impactScore: s.suggestionDetail?.impactScore,
    }));
  }

  private async buildLatestReview(
    workspaceId: string
  ): Promise<LatestReviewDto | null> {
    const review = await this.prisma.client.workItem.findFirst({
      where: {
        workspaceId,
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        reviewDetail: {
          status: { in: [ReviewStatus.COMPLETED, ReviewStatus.DRAFT] },
        },
      },
      include: { reviewDetail: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!review) return null;

    return {
      id: review.id,
      title: review.title,
      reviewType: review.reviewDetail?.reviewType ?? 'CUSTOM',
      status: review.reviewDetail?.status ?? ReviewStatus.DRAFT,
      reviewedAt:
        review.reviewDetail?.reviewedAt?.toISOString() ??
        review.updatedAt.toISOString(),
    };
  }

  private async buildActiveInsights(
    workspaceId: string
  ): Promise<ActiveInsightDto[]> {
    const insights = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.INSIGHT,
        deletedAt: null,
        insightDetail: { status: InsightStatus.ACTIVE },
      },
      include: { insightDetail: true },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    });

    return insights.map((ins) => ({
      id: ins.id,
      statement: ins.insightDetail?.statement ?? ins.title,
      insightType: ins.insightDetail?.insightType ?? 'STRATEGY',
      confidence: ins.insightDetail?.confidence ?? 0.5,
      impactScore: ins.insightDetail?.impactScore ?? 50,
    }));
  }
}
