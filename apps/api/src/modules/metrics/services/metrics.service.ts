import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MetricCalculatorService, MetricCalculationResult, GapDetectionResult } from './metric-calculator.service';
import { METRIC_DEFINITIONS } from '../constants/metric-definitions';
import { Prisma, GapType, MetricSourceType, WorkItemStatus, WorkItemType, PdcaStage, IssueStatus } from '@prisma/client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: MetricCalculatorService,
  ) {}

  /**
   * Get or create default metrics for a workspace
   */
  async ensureDefaultMetrics(workspaceId: string): Promise<void> {
    const existingMetrics = await this.prisma.client.metric.findMany({
      where: { workspaceId },
    });

    const existingNames = new Set(existingMetrics.map((m) => m.name));

    const metricsToCreate = Object.values(METRIC_DEFINITIONS).filter(
      (def) => !existingNames.has(def.name),
    );

    for (const def of metricsToCreate) {
      await this.prisma.client.metric.create({
        data: {
          workspaceId,
          name: def.name,
          displayName: def.displayName,
          description: def.description,
          calculationType: def.calculationType,
          unit: def.unit,
          targetValue: def.targetValue,
          warningThreshold: def.warningThreshold,
        },
      });
    }
  }

  /**
   * Calculate and save a single metric value
   * Rule: Never overwrite historical MetricValues (append-only)
   */
  async calculateAndSaveMetric(
    workspaceId: string,
    metricName: string,
    cycleId?: string,
  ): Promise<{ metricValue: any; gapDetected: boolean; issue: any | null }> {
    const metric = await this.prisma.client.metric.findUnique({
      where: { name: metricName },
    });

    if (!metric) {
      throw new NotFoundException(`Metric '${metricName}' not found`);
    }

    // Calculate fresh value (idempotent - always recalculates from source)
    const calculationResult = await this.executeCalculation(metricName, workspaceId, cycleId);

    // Use transaction to save value and potentially create gap/issue
    return this.prisma.client.$transaction(async (tx) => {
      // 1. Save MetricValue (append-only, never overwrites)
      const metricValue = await tx.metricValue.create({
        data: {
          workspaceId,
          metricId: metric.id,
          cycleId: cycleId || null,
          value: calculationResult.value,
          calculationVersion: calculationResult.calculationVersion,
          metadata: calculationResult.metadata as Prisma.InputJsonValue | undefined,
          sourceType: calculationResult.sourceType as MetricSourceType,
          measuredAt: new Date(),
        },
      });

      // 2. Detect gap
      const gapResult = this.calculator.detectGap(metricName, calculationResult.value);

      let issue = null;
      if (gapResult.hasGap) {
        issue = await this.createOrUpdateIssueFromGap(
          tx,
          workspaceId,
          metric,
          cycleId,
          calculationResult,
          gapResult,
        );
      }

      return { metricValue, gapDetected: gapResult.hasGap, issue };
    });
  }

  /**
   * Calculate and save all metrics for a workspace
   */
  async calculateAndSaveAllMetrics(
    workspaceId: string,
    cycleId?: string,
  ): Promise<Array<{ metricValue: any; gapDetected: boolean; issue: any | null }>> {
    // Ensure default metrics exist
    await this.ensureDefaultMetrics(workspaceId);

    const metrics = await this.prisma.client.metric.findMany({
      where: { workspaceId, isActive: true },
    });

    const results = [];
    for (const metric of metrics) {
      try {
        const result = await this.calculateAndSaveMetric(workspaceId, metric.name, cycleId);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to calculate metric ${metric.name}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Get metrics with optional filters
   */
  async listMetrics(workspaceId: string, options?: { isActive?: boolean }) {
    const where: Prisma.MetricWhereInput = { workspaceId };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.prisma.client.metric.findMany({
      where,
      include: {
        values: {
          orderBy: { measuredAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get metric values for a metric
   */
  async getMetricValues(
    workspaceId: string,
    metricId: string,
    options?: { page?: number; limit?: number; cycleId?: string },
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.MetricValueWhereInput = {
      workspaceId,
      metricId,
    };

    if (options?.cycleId) {
      where.cycleId = options.cycleId;
    }

    const [total, values] = await Promise.all([
      this.prisma.client.metricValue.count({ where }),
      this.prisma.client.metricValue.findMany({
        where,
        orderBy: { measuredAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: values,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get metric gaps for a workspace
   */
  async listGaps(
    workspaceId: string,
    options?: { isOpen?: boolean; metricId?: string; cycleId?: string },
  ) {
    const where: Prisma.MetricGapWhereInput = { workspaceId };

    if (options?.isOpen !== undefined) {
      where.isOpen = options.isOpen;
    }

    if (options?.metricId) {
      where.metricId = options.metricId;
    }

    if (options?.cycleId) {
      where.cycleId = options.cycleId;
    }

    return this.prisma.client.metricGap.findMany({
      where,
      include: {
        metric: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { detectedAt: 'desc' },
    });
  }

  /**
   * Create or update an issue from a gap
   * Rule: Same workspace + metric + cycle + gapType -> only one OPEN issue
   */
  private async createOrUpdateIssueFromGap(
    tx: any,
    workspaceId: string,
    metric: any,
    cycleId: string | undefined,
    calculationResult: MetricCalculationResult,
    gapResult: GapDetectionResult,
  ): Promise<any> {
    const gapType = gapResult.gapType!;

    // Check if an open issue already exists for this gap
    const existingGap = await tx.metricGap.findFirst({
      where: {
        workspaceId,
        metricId: metric.id,
        cycleId: cycleId || null,
        gapType,
        isOpen: true,
      },
      include: {
        issue: true,
      },
    });

    if (existingGap?.issueId) {
      // Update existing gap
      const updatedGap = await tx.metricGap.update({
        where: { id: existingGap.id },
        data: {
          expectedValue: gapResult.expectedValue!,
          actualValue: gapResult.actualValue!,
          gapValue: gapResult.gapValue!,
          severity: gapResult.severity!,
          detectedAt: new Date(),
        },
      });

      // Update existing issue's issueDetail
      if (existingGap.issueId) {
        await tx.issueDetail.update({
          where: { workItemId: existingGap.issueId },
          data: {
            expectedValue: gapResult.expectedValue,
            actualValue: gapResult.actualValue,
            gapValue: gapResult.gapValue,
            severity: gapResult.severity,
            detectedAt: new Date(),
            metricName: metric.name,
            gapType,
            level: this.mapSeverityToLevel(gapResult.severity!),
          },
        });
      }

      return { gap: updatedGap, issueId: existingGap.issueId };
    }

    // Create new issue and gap
    const severity = gapResult.severity || 'medium';
    const issueLevel = this.mapSeverityToLevel(severity);

    // Create WorkItem for the issue
    const issue = await tx.workItem.create({
      data: {
        workspaceId,
        cycleId: cycleId || null,
        itemType: WorkItemType.ISSUE,
        pdcaStage: PdcaStage.CHECK,
        title: `指标未达标: ${metric.displayName}`,
        description: `指标 ${metric.displayName} 当前值 ${calculationResult.value}${metric.unit || ''}，低于目标值 ${gapResult.expectedValue}${metric.unit || ''}`,
        status: WorkItemStatus.ACTIVE,
        createdBy: 'system',
        sourceType: 'SYSTEM' as any,
        issueDetail: {
          create: {
            metricName: metric.name,
            expectedValue: gapResult.expectedValue,
            actualValue: gapResult.actualValue,
            gapValue: gapResult.gapValue,
            severity,
            detectedAt: new Date(),
            gapType,
            level: issueLevel,
            status: IssueStatus.OPEN,
            description: `自动检测: ${metric.displayName} 未达标`,
          },
        },
      },
    });

    // Create MetricGap linked to the issue
    const gap = await tx.metricGap.create({
      data: {
        workspaceId,
        metricId: metric.id,
        cycleId: cycleId || null,
        gapType,
        expectedValue: gapResult.expectedValue!,
        actualValue: gapResult.actualValue!,
        gapValue: gapResult.gapValue!,
        severity,
        isOpen: true,
        issueId: issue.id,
        detectedAt: new Date(),
      },
    });

    return { gap, issueId: issue.id };
  }

  /**
   * Map severity string to IssueLevel enum
   */
  private mapSeverityToLevel(severity: string): string {
    switch (severity) {
      case 'high':
        return 'HIGH';
      case 'low':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Execute calculation based on metric name
   */
  private async executeCalculation(
    metricName: string,
    workspaceId: string,
    cycleId?: string,
  ): Promise<MetricCalculationResult> {
    switch (metricName) {
      case 'content_planning_progress':
        return this.calculator.calculateContentPlanningProgress(workspaceId, cycleId);
      case 'work_task_completion_rate':
        return this.calculator.calculateWorkTaskCompletionRate(workspaceId, cycleId);
      case 'content_score':
        return this.calculator.calculateContentScore(workspaceId, cycleId);
      case 'work_score':
        return this.calculator.calculateWorkScore(workspaceId, cycleId);
      case 'health_score':
        return this.calculator.calculateHealthScore(workspaceId, cycleId);
      default:
        throw new NotFoundException(`Unknown metric: ${metricName}`);
    }
  }
}
