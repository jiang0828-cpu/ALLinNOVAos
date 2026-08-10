import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Prisma, WorkItemStatus, WorkItemType, PdcaStage, SourceType, Priority, HealthStatus } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/project-query.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(createProjectDto: CreateProjectDto) {
    const { workspaceId } = createProjectDto;

    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with id ${workspaceId} not found`);
    }

    // Note: domainId is a free-form label (e.g. 'wealth', 'health')
    // stored on WorkItem directly, not a foreign key to Domain table.

    return this.prisma.client.$transaction(async (tx) => {
      const project = await tx.workItem.create({
        data: {
          workspaceId: createProjectDto.workspaceId,
          domainId: createProjectDto.domainId,
          cycleId: createProjectDto.cycleId,
          itemType: WorkItemType.PROJECT,
          pdcaStage: PdcaStage.PLAN,
          title: createProjectDto.title,
          description: createProjectDto.description,
          status: WorkItemStatus.ACTIVE,
          priority: createProjectDto.priority ?? Priority.P2,
          ownerId: createProjectDto.ownerId,
          createdBy: createProjectDto.createdBy ?? 'system',
          sourceType: createProjectDto.sourceType ?? SourceType.MANUAL,
          externalRef: createProjectDto.externalRef,
          plannedStartAt: createProjectDto.plannedStartAt
            ? new Date(createProjectDto.plannedStartAt)
            : undefined,
          plannedEndAt: createProjectDto.plannedEndAt
            ? new Date(createProjectDto.plannedEndAt)
            : undefined,
          metadata: createProjectDto.metadata as Prisma.InputJsonValue | undefined,
          projectDetail: {
            create: {
              progress: createProjectDto.progress ?? 0,
              healthStatus: createProjectDto.healthStatus ?? HealthStatus.ON_TRACK,
              budget: createProjectDto.budget,
              actualCost: createProjectDto.actualCost,
            },
          },
        },
        include: {
          projectDetail: true,
        },
      });

      return project;
    });
  }

  async getProjectById(id: string, workspaceId: string) {
    const project = await this.prisma.client.workItem.findUnique({
      where: { id },
      include: {
        projectDetail: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    if (project.workspaceId !== workspaceId) {
      throw new BadRequestException('Project does not belong to the specified workspace');
    }

    return project;
  }

  async getProjectDetail(id: string, workspaceId: string) {
    const project = await this.getProjectById(id, workspaceId);

    // Get tasks belonging to this project
    const tasks = await this.prisma.client.workItemRelation.findMany({
      where: {
        sourceItemId: id,
        relationType: 'CONTAINS',
      },
      include: {
        targetItem: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    // Get issues related to this project
    const issues = await this.prisma.client.workItem.findMany({
      where: {
        workspaceId,
        itemType: WorkItemType.ISSUE,
        deletedAt: null,
      },
      include: {
        issueDetail: true,
      },
      take: 10,
    });

    // Fetch parent if any (parent goal)
    let parent = null;
    if (project.parentId) {
      const parentItem = await this.prisma.client.workItem.findUnique({
        where: { id: project.parentId },
        select: { id: true, title: true, itemType: true },
      });
      if (parentItem) {
        parent = parentItem;
      }
    }

    const { parentId: _omit, ...projectWithoutParentId } = project as any;

    return {
      ...projectWithoutParentId,
      parent,
      tasks: tasks.map((r) => r.targetItem).filter(Boolean),
      issues: issues.map((i) => ({
        id: i.id,
        title: i.title,
        level: i.issueDetail?.level ?? 'MEDIUM',
        status: i.status,
      })),
    };
  }

  async listProjects(queryDto: QueryProjectDto) {
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

    const where: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.PROJECT,
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

    const total = await this.prisma.client.workItem.count({ where });

    const orderBy: Prisma.WorkItemOrderByWithRelationInput = {};
    if (sortBy === 'priority') {
      orderBy.priority = sortOrder;
    } else if (sortBy === 'progress') {
      orderBy.projectDetail = { progress: sortOrder };
    } else {
      orderBy.createdAt = sortOrder;
    }

    const projects = await this.prisma.client.workItem.findMany({
      where,
      include: {
        projectDetail: true,
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
      data: projects,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async updateProject(id: string, workspaceId: string, updateProjectDto: UpdateProjectDto) {
    await this.getProjectById(id, workspaceId);

    const updateData: Prisma.WorkItemUncheckedUpdateInput = {};

    if (updateProjectDto.title) {
      updateData.title = updateProjectDto.title;
    }
    if (updateProjectDto.description !== undefined) {
      updateData.description = updateProjectDto.description;
    }
    if (updateProjectDto.priority) {
      updateData.priority = updateProjectDto.priority;
    }
    if (updateProjectDto.domainId !== undefined) {
      updateData.domainId = updateProjectDto.domainId;
    }
    if (updateProjectDto.cycleId !== undefined) {
      updateData.cycleId = updateProjectDto.cycleId;
    }
    if (updateProjectDto.ownerId !== undefined) {
      updateData.ownerId = updateProjectDto.ownerId;
    }
    if (updateProjectDto.metadata !== undefined) {
      updateData.metadata = updateProjectDto.metadata as Prisma.InputJsonValue;
    }
    if (updateProjectDto.plannedStartAt) {
      updateData.plannedStartAt = new Date(updateProjectDto.plannedStartAt);
    }
    if (updateProjectDto.plannedEndAt) {
      updateData.plannedEndAt = new Date(updateProjectDto.plannedEndAt);
    }

    const projectDetailData: Prisma.ProjectDetailUncheckedUpdateInput = {};
    if (updateProjectDto.progress !== undefined) {
      projectDetailData.progress = updateProjectDto.progress;
    }
    if (updateProjectDto.healthStatus) {
      projectDetailData.healthStatus = updateProjectDto.healthStatus;
    }
    if (updateProjectDto.budget !== undefined) {
      projectDetailData.budget = updateProjectDto.budget;
    }
    if (updateProjectDto.actualCost !== undefined) {
      projectDetailData.actualCost = updateProjectDto.actualCost;
    }

    if (Object.keys(projectDetailData).length > 0) {
      updateData.projectDetail = {
        update: projectDetailData,
      };
    }

    return this.prisma.client.workItem.update({
      where: { id },
      data: updateData,
      include: { projectDetail: true },
    });
  }

  async deleteProject(id: string, workspaceId: string) {
    const project = await this.getProjectById(id, workspaceId);

    if (project.deletedAt) {
      throw new BadRequestException('Project is already deleted');
    }

    return this.prisma.client.workItem.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: { projectDetail: true },
    });
  }
}
