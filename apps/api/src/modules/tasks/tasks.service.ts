import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Prisma, WorkItemStatus, WorkItemType, PdcaStage, SourceType, Priority } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto, StartTaskDto, BlockTaskDto, CompleteTaskDto, CancelTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/task-query.dto';
import { isValidTransition, getValidTransitions, TASK_INITIAL_STATUS } from './constants/task-status-machine';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new task
   */
  async createTask(createTaskDto: CreateTaskDto) {
    const { workspaceId, projectId, goalId } = createTaskDto;

    // Validate project belongs to same workspace
    if (projectId) {
      const project = await this.prisma.client.workItem.findUnique({
        where: { id: projectId },
        select: { workspaceId: true, itemType: true },
      });

      if (!project) {
        throw new NotFoundException(`Project with id ${projectId} not found`);
      }
      if (project.workspaceId !== workspaceId) {
        throw new BadRequestException('Project does not belong to the specified workspace');
      }
      if (project.itemType !== WorkItemType.PROJECT) {
        throw new BadRequestException('Specified item is not a project');
      }
    }

    // Validate goal belongs to same workspace
    if (goalId) {
      const goal = await this.prisma.client.workItem.findUnique({
        where: { id: goalId },
        select: { workspaceId: true, itemType: true },
      });

      if (!goal) {
        throw new NotFoundException(`Goal with id ${goalId} not found`);
      }
      if (goal.workspaceId !== workspaceId) {
        throw new BadRequestException('Goal does not belong to the specified workspace');
      }
      if (goal.itemType !== WorkItemType.GOAL) {
        throw new BadRequestException('Specified item is not a goal');
      }
    }

    // Create task with transaction
    return this.prisma.client.$transaction(async (tx) => {
      // Create WorkItem
      const task = await tx.workItem.create({
        data: {
          workspaceId: createTaskDto.workspaceId,
          domainId: createTaskDto.domainId,
          cycleId: createTaskDto.cycleId,
          itemType: WorkItemType.TASK,
          pdcaStage: PdcaStage.DO,
          title: createTaskDto.title,
          description: createTaskDto.description,
          status: TASK_INITIAL_STATUS,
          priority: createTaskDto.priority ?? Priority.P2,
          ownerId: createTaskDto.ownerId,
          createdBy: createTaskDto.createdBy ?? 'system',
          sourceType: createTaskDto.sourceType ?? SourceType.MANUAL,
          externalRef: createTaskDto.externalRef,
          parentId: projectId,
          plannedStartAt: createTaskDto.scheduledStartAt ? new Date(createTaskDto.scheduledStartAt) : undefined,
          plannedEndAt: createTaskDto.scheduledEndAt ? new Date(createTaskDto.scheduledEndAt) : undefined,
          metadata: createTaskDto.metadata as Prisma.InputJsonValue | undefined,
          taskDetail: {
            create: {
              dueAt: createTaskDto.dueAt ? new Date(createTaskDto.dueAt) : undefined,
              scheduledStartAt: createTaskDto.scheduledStartAt ? new Date(createTaskDto.scheduledStartAt) : undefined,
              scheduledEndAt: createTaskDto.scheduledEndAt ? new Date(createTaskDto.scheduledEndAt) : undefined,
              estimatedMinutes: createTaskDto.estimatedMinutes,
            },
          },
        },
        include: {
          taskDetail: true,
        },
      });

      // Create CONTAINS relation if projectId provided
      if (projectId) {
        await tx.workItemRelation.create({
          data: {
            sourceItemId: projectId,
            targetItemId: task.id,
            relationType: 'CONTAINS',
          },
        });
      }

      // Create SUPPORTS relation if goalId provided
      if (goalId) {
        await tx.workItemRelation.create({
          data: {
            sourceItemId: task.id,
            targetItemId: goalId,
            relationType: 'SUPPORTS',
          },
        });
      }

      return task;
    });
  }

  /**
   * Get task by ID
   */
  async getTaskById(id: string, workspaceId: string) {
    const task = await this.prisma.client.workItem.findUnique({
      where: { id },
      include: {
        taskDetail: true,
        parent: {
          select: { id: true, title: true, itemType: true },
        },
      },
    });

    if (!task || task.itemType !== WorkItemType.TASK || task.workspaceId !== workspaceId || task.deletedAt) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }

    return task;
  }

  /**
   * List tasks with filters
   */
  async listTasks(queryDto: QueryTaskDto) {
    const {
      workspaceId,
      status,
      projectId,
      goalId,
      domainId,
      cycleId,
      priority,
      dueDateFrom,
      dueDateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const skip = (page - 1) * limit;

    // Build where conditions
    const where: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.TASK,
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

    // Project filter: tasks where parentId matches
    if (projectId) {
      where.parentId = projectId;
    }

    // Goal filter: tasks with SUPPORTS relation to goal
    if (goalId) {
      where.outgoingRelations = {
        some: {
          targetItemId: goalId,
          relationType: 'SUPPORTS',
        },
      };
    }

    // Due date filter via taskDetail
    if (dueDateFrom || dueDateTo) {
      where.taskDetail = {};
      if (dueDateFrom && dueDateTo) {
        where.taskDetail = {
          dueAt: {
            gte: new Date(dueDateFrom),
            lte: new Date(dueDateTo),
          },
        };
      } else if (dueDateFrom) {
        where.taskDetail = {
          dueAt: { gte: new Date(dueDateFrom) },
        };
      } else if (dueDateTo) {
        where.taskDetail = {
          dueAt: { lte: new Date(dueDateTo) },
        };
      }
    }

    // Count total
    const total = await this.prisma.client.workItem.count({ where });

    // Get tasks
    const orderBy: Prisma.WorkItemOrderByWithRelationInput = {};
    if (sortBy === 'dueAt') {
      orderBy.taskDetail = { dueAt: sortOrder };
    } else if (sortBy === 'priority') {
      orderBy.priority = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const tasks = await this.prisma.client.workItem.findMany({
      where,
      include: {
        taskDetail: true,
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
      data: tasks,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update task
   */
  async updateTask(id: string, workspaceId: string, updateTaskDto: UpdateTaskDto) {
    // Verify task exists and belongs to workspace
    await this.getTaskById(id, workspaceId);

    const updateData: Prisma.WorkItemUncheckedUpdateInput = {};

    if (updateTaskDto.title) {
      updateData.title = updateTaskDto.title;
    }
    if (updateTaskDto.description !== undefined) {
      updateData.description = updateTaskDto.description;
    }
    if (updateTaskDto.priority) {
      updateData.priority = updateTaskDto.priority;
    }
    if (updateTaskDto.domainId !== undefined) {
      updateData.domainId = updateTaskDto.domainId;
    }
    if (updateTaskDto.cycleId !== undefined) {
      updateData.cycleId = updateTaskDto.cycleId;
    }
    if (updateTaskDto.ownerId !== undefined) {
      updateData.ownerId = updateTaskDto.ownerId;
    }
    if (updateTaskDto.metadata !== undefined) {
      updateData.metadata = updateTaskDto.metadata as Prisma.InputJsonValue;
    }
    if (updateTaskDto.scheduledStartAt) {
      updateData.plannedStartAt = new Date(updateTaskDto.scheduledStartAt);
    }
    if (updateTaskDto.scheduledEndAt) {
      updateData.plannedEndAt = new Date(updateTaskDto.scheduledEndAt);
    }

    // TaskDetail updates
    const taskDetailData: Prisma.TaskDetailUncheckedUpdateInput = {};
    if (updateTaskDto.dueAt) {
      taskDetailData.dueAt = new Date(updateTaskDto.dueAt);
    }
    if (updateTaskDto.scheduledStartAt) {
      taskDetailData.scheduledStartAt = new Date(updateTaskDto.scheduledStartAt);
    }
    if (updateTaskDto.scheduledEndAt) {
      taskDetailData.scheduledEndAt = new Date(updateTaskDto.scheduledEndAt);
    }
    if (updateTaskDto.estimatedMinutes !== undefined) {
      taskDetailData.estimatedMinutes = updateTaskDto.estimatedMinutes;
    }

    if (Object.keys(taskDetailData).length > 0) {
      updateData.taskDetail = {
        update: taskDetailData,
      };
    }

    return this.prisma.client.workItem.update({
      where: { id },
      data: updateData,
      include: { taskDetail: true },
    });
  }

  /**
   * Start task: TODO -> IN_PROGRESS
   */
  async startTask(id: string, workspaceId: string, _dto: StartTaskDto) {
    const task = await this.getTaskById(id, workspaceId);

    if (!isValidTransition(task.status, WorkItemStatus.IN_PROGRESS)) {
      throw new ConflictException(
        `Cannot start task in status "${task.status}". Valid transitions: ${getValidTransitions(task.status).join(', ')}`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.IN_PROGRESS,
          plannedStartAt: new Date(),
        },
        include: { taskDetail: true },
      });

      return updated;
    });
  }

  /**
   * Block task: TODO/IN_PROGRESS -> BLOCKED
   */
  async blockTask(id: string, workspaceId: string, _dto: BlockTaskDto) {
    const task = await this.getTaskById(id, workspaceId);

    if (!isValidTransition(task.status, WorkItemStatus.BLOCKED)) {
      throw new ConflictException(
        `Cannot block task in status "${task.status}". Valid transitions: ${getValidTransitions(task.status).join(', ')}`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.BLOCKED,
        },
        include: { taskDetail: true },
      });

      return updated;
    });
  }

  /**
   * Complete task: IN_PROGRESS -> DONE
   */
  async completeTask(id: string, workspaceId: string, dto: CompleteTaskDto) {
    const task = await this.getTaskById(id, workspaceId);

    if (!isValidTransition(task.status, WorkItemStatus.DONE)) {
      throw new ConflictException(
        `Cannot complete task in status "${task.status}". Valid transitions: ${getValidTransitions(task.status).join(', ')}`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.DONE,
          completedAt: new Date(),
        },
        include: { taskDetail: true },
      });

      // Update task detail with completion info
      const updateData: Prisma.TaskDetailUncheckedUpdateInput = {};
      if (dto.completionNote) {
        updateData.completionNote = dto.completionNote;
      }
      if (dto.actualMinutes !== undefined) {
        updateData.actualMinutes = dto.actualMinutes;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.taskDetail.update({
          where: { workItemId: id },
          data: updateData,
        });
      }

      return updated;
    });
  }

  /**
   * Cancel task: any non-terminal -> CANCELLED
   */
  async cancelTask(id: string, workspaceId: string, _dto: CancelTaskDto) {
    const task = await this.getTaskById(id, workspaceId);

    if (!isValidTransition(task.status, WorkItemStatus.CANCELLED)) {
      throw new ConflictException(
        `Cannot cancel task in status "${task.status}". Valid transitions: ${getValidTransitions(task.status).join(', ')}`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.CANCELLED,
        },
        include: { taskDetail: true },
      });

      return updated;
    });
  }

  /**
   * Soft delete task (archive)
   */
  async deleteTask(id: string, workspaceId: string) {
    const task = await this.getTaskById(id, workspaceId);

    if (task.deletedAt) {
      throw new BadRequestException('Task is already deleted');
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.CANCELLED,
          deletedAt: new Date(),
        },
        include: { taskDetail: true },
      });

      return updated;
    });
  }
}
