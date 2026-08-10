import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  Prisma,
  WorkItemType,
  PdcaStage,
  WorkItemStatus,
  ActivityAction,
  IssueLevel,
} from '@prisma/client';

@Injectable()
export class DecisionsService {
  private readonly logger = new Logger(DecisionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a decision manually
   */
  async createDecision(data: {
    workspaceId: string;
    title: string;
    description?: string;
    cycleId?: string;
    content: string;
    suggestionId?: string;
    reviewId?: string;
    rationale?: string;
    impact?: IssueLevel;
  }) {
    const { workspaceId } = data;

    // Validate workspace
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace with id ${workspaceId} not found`);
    }

    return this.prisma.client.$transaction(async (tx) => {
      const decision = await tx.workItem.create({
        data: {
          workspaceId,
          cycleId: data.cycleId || null,
          itemType: WorkItemType.DECISION,
          pdcaStage: PdcaStage.ACT,
          title: data.title,
          description: data.description || data.content,
          status: WorkItemStatus.ACTIVE,
          createdBy: 'user',
          sourceType: 'MANUAL' as any,
          decisionDetail: {
            create: {
              content: data.content,
              suggestionId: data.suggestionId || null,
              reviewId: data.reviewId || null,
              rationale: data.rationale || null,
              impact: data.impact || null,
              decidedAt: new Date(),
            },
          },
        },
        include: { decisionDetail: true },
      });

      // Write activity event
      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: decision.id,
          action: ActivityAction.CREATE,
          actor: 'user',
          metadata: {
            suggestionId: data.suggestionId,
            reviewId: data.reviewId,
          } as Prisma.InputJsonValue,
        },
      });

      return decision;
    });
  }

  /**
   * Get decision by ID
   */
  async getDecisionById(id: string, workspaceId: string) {
    const decision = await this.prisma.client.workItem.findUnique({
      where: { id },
      include: { decisionDetail: true },
    });

    if (!decision || decision.itemType !== WorkItemType.DECISION || decision.workspaceId !== workspaceId || decision.deletedAt) {
      throw new NotFoundException(`Decision with id ${id} not found`);
    }

    return decision;
  }

  /**
   * List decisions with filters
   */
  async listDecisions(workspaceId: string, queryDto: {
    status?: WorkItemStatus[];
    suggestionId?: string;
    reviewId?: string;
    cycleId?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      suggestionId,
      reviewId,
      cycleId,
      page = 1,
      limit = 20,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.DECISION,
      deletedAt: null,
    };

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    // Build decisionDetail filter
    const detailFilter: any = {};
    if (suggestionId) {
      detailFilter.suggestionId = suggestionId;
    }
    if (reviewId) {
      detailFilter.reviewId = reviewId;
    }

    if (Object.keys(detailFilter).length > 0) {
      where.decisionDetail = { is: detailFilter };
    }

    if (cycleId) {
      where.cycleId = cycleId;
    }

    const [total, decisions] = await Promise.all([
      this.prisma.client.workItem.count({ where }),
      this.prisma.client.workItem.findMany({
        where,
        include: { decisionDetail: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: decisions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a decision
   */
  async updateDecision(
    id: string,
    workspaceId: string,
    updateData: {
      title?: string;
      description?: string;
      content?: string;
      rationale?: string;
      impact?: IssueLevel;
    },
  ) {
    const decision = await this.getDecisionById(id, workspaceId);

    if (decision.status === WorkItemStatus.COMPLETED || decision.status === WorkItemStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a completed or cancelled decision');
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updatePayload: any = {};

      if (updateData.title) updatePayload.title = updateData.title;
      if (updateData.description) updatePayload.description = updateData.description;

      const detailUpdatePayload: any = {};
      if (updateData.content) detailUpdatePayload.content = updateData.content;
      if (updateData.rationale) detailUpdatePayload.rationale = updateData.rationale;
      if (updateData.impact) detailUpdatePayload.impact = updateData.impact;

      const [updatedWorkItem, updatedDetail] = await Promise.all([
        Object.keys(updatePayload).length > 0
          ? tx.workItem.update({ where: { id }, data: updatePayload })
          : Promise.resolve(null),
        Object.keys(detailUpdatePayload).length > 0
          ? tx.decisionDetail.update({ where: { workItemId: id }, data: detailUpdatePayload })
          : Promise.resolve(null),
      ]);

      // Write activity event
      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: id,
          action: ActivityAction.UPDATE,
          actor: 'user',
          metadata: { updatedFields: Object.keys({ ...updatePayload, ...detailUpdatePayload }) } as Prisma.InputJsonValue,
        },
      });

      return this.getDecisionById(id, workspaceId);
    });
  }

  /**
   * Complete a decision
   */
  async completeDecision(id: string, workspaceId: string) {
    const decision = await this.getDecisionById(id, workspaceId);

    if (decision.status !== WorkItemStatus.ACTIVE) {
      throw new BadRequestException(`Decision is not in ACTIVE status (current: ${decision.status})`);
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updatedDecision = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: { decisionDetail: true },
      });

      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: id,
          action: ActivityAction.COMPLETE,
          actor: 'user',
          metadata: { newStatus: 'COMPLETED' } as Prisma.InputJsonValue,
        },
      });

      return updatedDecision;
    });
  }

  /**
   * Cancel a decision
   */
  async cancelDecision(id: string, workspaceId: string) {
    const decision = await this.getDecisionById(id, workspaceId);

    if (decision.status !== WorkItemStatus.ACTIVE) {
      throw new BadRequestException(`Decision is not in ACTIVE status (current: ${decision.status})`);
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updatedDecision = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.CANCELLED,
          completedAt: new Date(),
        },
        include: { decisionDetail: true },
      });

      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: id,
          action: ActivityAction.CANCEL,
          actor: 'user',
          metadata: { newStatus: 'CANCELLED' } as Prisma.InputJsonValue,
        },
      });

      return updatedDecision;
    });
  }

  /**
   * Soft delete a decision
   */
  async deleteDecision(id: string, workspaceId: string) {
    const decision = await this.getDecisionById(id, workspaceId);

    if (decision.deletedAt) {
      throw new BadRequestException('Decision is already deleted');
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.ARCHIVED,
          deletedAt: new Date(),
        },
        include: { decisionDetail: true },
      });

      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: id,
          action: ActivityAction.DELETE,
          actor: 'user',
        },
      });

      return updated;
    });
  }
}
