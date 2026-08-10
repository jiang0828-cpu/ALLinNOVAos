import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Prisma, WorkItemStatus, WorkItemType, PdcaStage, IssueStatus, GapType } from '@prisma/client';

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get issue by ID
   */
  async getIssueById(id: string, workspaceId: string) {
    const issue = await this.prisma.client.workItem.findUnique({
      where: { id },
      include: {
        issueDetail: true,
      },
    });

    if (!issue || issue.itemType !== WorkItemType.ISSUE || issue.workspaceId !== workspaceId || issue.deletedAt) {
      throw new NotFoundException(`Issue with id ${id} not found`);
    }

    return issue;
  }

  /**
   * List issues with filters
   */
  async listIssues(workspaceId: string, queryDto: {
    status?: string[];
    cycleId?: string;
    metricName?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      cycleId,
      metricName,
      page = 1,
      limit = 20,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.ISSUE,
      deletedAt: null,
    };

    // Filter by issueDetail status
    if (status && status.length > 0) {
      where.issueDetail = {
        is: {
          status: { in: status as IssueStatus[] },
        },
      };
    }

    if (cycleId) {
      where.cycleId = cycleId;
    }

    if (metricName) {
      where.issueDetail = {
        is: {
          ...(where.issueDetail?.is || {}),
          metricName,
        },
      };
    }

    const [total, issues] = await Promise.all([
      this.prisma.client.workItem.count({ where }),
      this.prisma.client.workItem.findMany({
        where,
        include: {
          issueDetail: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: issues,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Resolve an issue
   */
  async resolveIssue(id: string, workspaceId: string) {
    const issue = await this.getIssueById(id, workspaceId);

    if (issue.issueDetail?.status !== IssueStatus.OPEN) {
      throw new BadRequestException('Issue is not in OPEN status');
    }

    return this.prisma.client.$transaction(async (tx) => {
      // Update issueDetail status
      const updatedIssueDetail = await tx.issueDetail.update({
        where: { workItemId: id },
        data: {
          status: IssueStatus.RESOLVED,
        },
      });

      // Update WorkItem status
      const updatedIssue = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: { issueDetail: true },
      });

      // If linked MetricGap, mark as resolved
      await tx.metricGap.updateMany({
        where: { issueId: id, isOpen: true },
        data: {
          isOpen: false,
          resolvedAt: new Date(),
        },
      });

      return updatedIssue;
    });
  }

  /**
   * Ignore an issue
   */
  async ignoreIssue(id: string, workspaceId: string) {
    const issue = await this.getIssueById(id, workspaceId);

    if (issue.issueDetail?.status !== IssueStatus.OPEN) {
      throw new BadRequestException('Issue is not in OPEN status');
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updatedIssueDetail = await tx.issueDetail.update({
        where: { workItemId: id },
        data: {
          status: IssueStatus.IGNORED,
        },
      });

      const updatedIssue = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.CANCELLED,
          completedAt: new Date(),
        },
        include: { issueDetail: true },
      });

      // If linked MetricGap, mark as resolved (ignored)
      await tx.metricGap.updateMany({
        where: { issueId: id, isOpen: true },
        data: {
          isOpen: false,
          resolvedAt: new Date(),
        },
      });

      return updatedIssue;
    });
  }

  /**
   * Soft delete an issue
   */
  async deleteIssue(id: string, workspaceId: string) {
    const issue = await this.getIssueById(id, workspaceId);

    if (issue.deletedAt) {
      throw new BadRequestException('Issue is already deleted');
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.ARCHIVED,
          deletedAt: new Date(),
        },
        include: { issueDetail: true },
      });

      return updated;
    });
  }

  /**
   * Create an issue manually
   * Includes deduplication check for gap-related issues
   */
  async createIssue(data: {
    workspaceId: string;
    title: string;
    description?: string;
    cycleId?: string;
    metricName?: string;
    expectedValue?: number;
    actualValue?: number;
    gapValue?: number;
    severity?: string;
    gapType?: GapType;
  }) {
    const { workspaceId, title, description, cycleId } = data;

    // Validate workspace
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace with id ${workspaceId} not found`);
    }

    // Check for duplicate open issue if gap-related
    if (data.metricName && data.gapType) {
      const existingIssue = await this.prisma.client.workItem.findFirst({
        where: {
          workspaceId,
          itemType: WorkItemType.ISSUE,
          deletedAt: null,
          status: WorkItemStatus.ACTIVE,
          issueDetail: {
            is: {
              metricName: data.metricName,
              gapType: data.gapType,
              status: IssueStatus.OPEN,
            },
          },
        },
      });

      if (existingIssue) {
        throw new BadRequestException(
          `An open issue already exists for metric '${data.metricName}' with gap type '${data.gapType}'`,
        );
      }
    }

    return this.prisma.client.$transaction(async (tx) => {
      const issue = await tx.workItem.create({
        data: {
          workspaceId,
          cycleId: cycleId || null,
          itemType: WorkItemType.ISSUE,
          pdcaStage: PdcaStage.CHECK,
          title,
          description,
          status: WorkItemStatus.ACTIVE,
          createdBy: 'system',
          sourceType: 'MANUAL' as any,
          issueDetail: {
            create: {
              metricName: data.metricName,
              expectedValue: data.expectedValue,
              actualValue: data.actualValue,
              gapValue: data.gapValue,
              severity: data.severity || 'medium',
              detectedAt: new Date(),
              gapType: data.gapType,
              status: IssueStatus.OPEN,
              level: this.mapSeverityToLevel(data.severity || 'medium'),
            },
          },
        },
        include: { issueDetail: true },
      });

      return issue;
    });
  }

  private mapSeverityToLevel(severity: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    switch (severity) {
      case 'high':
        return 'HIGH';
      case 'low':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }
}
