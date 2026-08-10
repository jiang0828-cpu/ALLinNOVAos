import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Prisma, WorkItemStatus, WorkItemType, PdcaStage, SourceType, Priority } from '@prisma/client';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { QueryGoalDto } from './dto/goal-query.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new goal
   */
  async createGoal(createGoalDto: CreateGoalDto) {
    const { workspaceId } = createGoalDto;

    // Validate workspace exists
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with id ${workspaceId} not found`);
    }

    // Note: domainId / cycleId are free-form labels (e.g. 'wealth', 'health')
    // stored on WorkItem directly, not foreign keys to Domain/PdcaCycle tables.

    // Create goal with transaction
    return this.prisma.client.$transaction(async (tx) => {
      const goal = await tx.workItem.create({
        data: {
          workspaceId: createGoalDto.workspaceId,
          domainId: createGoalDto.domainId,
          cycleId: createGoalDto.cycleId,
          itemType: WorkItemType.GOAL,
          pdcaStage: PdcaStage.PLAN,
          title: createGoalDto.title,
          description: createGoalDto.description,
          status: WorkItemStatus.ACTIVE,
          priority: createGoalDto.priority ?? Priority.P2,
          ownerId: createGoalDto.ownerId,
          createdBy: createGoalDto.createdBy ?? 'system',
          sourceType: createGoalDto.sourceType ?? SourceType.MANUAL,
          externalRef: createGoalDto.externalRef,
          plannedStartAt: createGoalDto.plannedStartAt
            ? new Date(createGoalDto.plannedStartAt)
            : undefined,
          plannedEndAt: createGoalDto.plannedEndAt
            ? new Date(createGoalDto.plannedEndAt)
            : undefined,
          metadata: createGoalDto.metadata as Prisma.InputJsonValue | undefined,
          goalDetail: {
            create: {
              targetValue: createGoalDto.targetValue,
              currentValue: createGoalDto.currentValue,
              unit: createGoalDto.unit,
              progress: createGoalDto.progress ?? 0,
              weight: createGoalDto.weight,
              targetDate: createGoalDto.targetDate
                ? new Date(createGoalDto.targetDate)
                : undefined,
            },
          },
        },
        include: {
          goalDetail: true,
        },
      });

      return goal;
    });
  }

  /**
   * Get goal by ID
   */
  async getGoalById(id: string, workspaceId: string) {
    const goal = await this.prisma.client.workItem.findUnique({
      where: { id },
      include: {
        goalDetail: true,
        parent: {
          select: { id: true, title: true, itemType: true },
        },
      },
    });

    if (!goal || goal.itemType !== WorkItemType.GOAL || goal.workspaceId !== workspaceId || goal.deletedAt) {
      throw new NotFoundException(`Goal with id ${id} not found`);
    }

    return goal;
  }

  /**
   * List goals with filters
   */
  async listGoals(queryDto: QueryGoalDto) {
    const {
      workspaceId,
      status,
      domainId,
      cycleId,
      priority,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const skip = (page - 1) * limit;

    // Build where conditions
    const where: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.GOAL,
      deletedAt: null,
    };

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (domainId) {
      where.domainId = domainId;
    }

    if (cycleId) {
      where.cycleId = cycleId;
    }

    if (priority && priority.length > 0) {
      where.priority = { in: priority };
    }

    // Count total
    const total = await this.prisma.client.workItem.count({ where });

    // Get goals
    const orderBy: Prisma.WorkItemOrderByWithRelationInput = {};
    if (sortBy === 'priority') {
      orderBy.priority = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const goals = await this.prisma.client.workItem.findMany({
      where,
      include: {
        goalDetail: true,
        parent: {
          select: { id: true, title: true, itemType: true },
        },
      },
      skip,
      take: limit,
      orderBy,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: goals,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update goal
   */
  async updateGoal(id: string, workspaceId: string, updateGoalDto: UpdateGoalDto) {
    // Verify goal exists and belongs to workspace
    await this.getGoalById(id, workspaceId);

    const updateData: Prisma.WorkItemUncheckedUpdateInput = {};

    if (updateGoalDto.title) {
      updateData.title = updateGoalDto.title;
    }
    if (updateGoalDto.description !== undefined) {
      updateData.description = updateGoalDto.description;
    }
    if (updateGoalDto.priority) {
      updateData.priority = updateGoalDto.priority;
    }
    if (updateGoalDto.domainId !== undefined) {
      updateData.domainId = updateGoalDto.domainId;
    }
    if (updateGoalDto.cycleId !== undefined) {
      updateData.cycleId = updateGoalDto.cycleId;
    }
    if (updateGoalDto.ownerId !== undefined) {
      updateData.ownerId = updateGoalDto.ownerId;
    }
    if (updateGoalDto.metadata !== undefined) {
      updateData.metadata = updateGoalDto.metadata as Prisma.InputJsonValue;
    }
    if (updateGoalDto.plannedStartAt) {
      updateData.plannedStartAt = new Date(updateGoalDto.plannedStartAt);
    }
    if (updateGoalDto.plannedEndAt) {
      updateData.plannedEndAt = new Date(updateGoalDto.plannedEndAt);
    }

    // GoalDetail updates
    const goalDetailData: Prisma.GoalDetailUncheckedUpdateInput = {};
    if (updateGoalDto.targetValue !== undefined) {
      goalDetailData.targetValue = updateGoalDto.targetValue;
    }
    if (updateGoalDto.currentValue !== undefined) {
      goalDetailData.currentValue = updateGoalDto.currentValue;
    }
    if (updateGoalDto.unit !== undefined) {
      goalDetailData.unit = updateGoalDto.unit;
    }
    if (updateGoalDto.progress !== undefined) {
      goalDetailData.progress = updateGoalDto.progress;
    }
    if (updateGoalDto.weight !== undefined) {
      goalDetailData.weight = updateGoalDto.weight;
    }
    if (updateGoalDto.targetDate) {
      goalDetailData.targetDate = new Date(updateGoalDto.targetDate);
    }

    if (Object.keys(goalDetailData).length > 0) {
      updateData.goalDetail = {
        update: goalDetailData,
      };
    }

    return this.prisma.client.workItem.update({
      where: { id },
      data: updateData,
      include: { goalDetail: true },
    });
  }

  /**
   * Soft delete goal (archive)
   */
  async deleteGoal(id: string, workspaceId: string) {
    const goal = await this.getGoalById(id, workspaceId);

    if (goal.deletedAt) {
      throw new BadRequestException('Goal is already deleted');
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.ARCHIVED,
          deletedAt: new Date(),
        },
        include: { goalDetail: true },
      });

      return updated;
    });
  }
}
