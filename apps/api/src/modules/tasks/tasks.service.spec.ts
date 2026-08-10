import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { WorkItemStatus, WorkItemType, PdcaStage, Priority } from '@prisma/client';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let mockPrismaClient: any;

  beforeEach(async () => {
    mockPrismaClient = {
      workItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      workItemRelation: {
        create: jest.fn(),
      },
      taskDetail: {
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: any) => {
        return callback(mockPrismaClient);
      }),
    };

    const mockPrismaService = {
      get client() {
        return mockPrismaClient;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('createTask', () => {
    const createTaskDto = {
      title: 'Test Task',
      workspaceId: 'ws-1',
      description: 'Test description',
      priority: Priority.P1,
    };

    it('should create a task successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        workspaceId: 'ws-1',
        status: WorkItemStatus.TODO,
        itemType: WorkItemType.TASK,
        pdcaStage: PdcaStage.DO,
      };

      mockPrismaClient.workItem.create.mockResolvedValue(mockTask);

      const result = await service.createTask(createTaskDto);

      expect(result).toEqual(mockTask);
      expect(mockPrismaClient.workItem.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when project belongs to different workspace', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        workspaceId: 'ws-other',
        itemType: WorkItemType.PROJECT,
      });

      await expect(
        service.createTask({ ...createTaskDto, projectId: 'project-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue(null);

      await expect(
        service.createTask({ ...createTaskDto, projectId: 'project-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create CONTAINS relation when projectId is provided', async () => {
      const mockProject = {
        workspaceId: 'ws-1',
        itemType: WorkItemType.PROJECT,
      };
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
      };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(mockTask);
      mockPrismaClient.workItem.create.mockResolvedValue(mockTask);

      await service.createTask({ ...createTaskDto, projectId: 'project-1' });

      expect(mockPrismaClient.workItemRelation.create).toHaveBeenCalled();
    });

    it('should create SUPPORTS relation when goalId is provided', async () => {
      const mockGoal = {
        workspaceId: 'ws-1',
        itemType: WorkItemType.GOAL,
      };
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
      };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(mockGoal)
        .mockResolvedValueOnce(mockTask);
      mockPrismaClient.workItem.create.mockResolvedValue(mockTask);

      await service.createTask({ ...createTaskDto, goalId: 'goal-1' });

      expect(mockPrismaClient.workItemRelation.create).toHaveBeenCalled();
    });
  });

  describe('getTaskById', () => {
    it('should return task when it exists and belongs to workspace', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
        title: 'Test Task',
        status: WorkItemStatus.TODO,
        deletedAt: null,
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(mockTask);

      const result = await service.getTaskById('task-1', 'ws-1');

      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue(null);

      await expect(service.getTaskById('task-1', 'ws-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when task belongs to different workspace', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-other',
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.TODO,
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(mockTask);

      await expect(service.getTaskById('task-1', 'ws-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when itemType is not TASK', async () => {
      const mockProject = {
        id: 'project-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.PROJECT,
        status: WorkItemStatus.ACTIVE,
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(mockProject);

      await expect(service.getTaskById('project-1', 'ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listTasks', () => {
    it('should return paginated tasks', async () => {
      const mockTasks = [
        { id: 'task-1', title: 'Task 1' },
        { id: 'task-2', title: 'Task 2' },
      ];

      mockPrismaClient.workItem.count.mockResolvedValue(10);
      mockPrismaClient.workItem.findMany.mockResolvedValue(mockTasks);

      const result = await service.listTasks({ workspaceId: 'ws-1', page: 1, limit: 20 });

      expect(result.data).toEqual(mockTasks);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaClient.workItem.count.mockResolvedValue(5);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      await service.listTasks({
        workspaceId: 'ws-1',
        status: [WorkItemStatus.TODO],
      });

      expect(mockPrismaClient.workItem.count).toHaveBeenCalled();
    });
  });

  describe('startTask', () => {
    it('should transition TODO -> IN_PROGRESS', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.TODO,
        deletedAt: null,
      };
      const updatedTask = { ...mockTask, status: WorkItemStatus.IN_PROGRESS };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(updatedTask);
      mockPrismaClient.workItem.update.mockResolvedValue(updatedTask);

      const result = await service.startTask('task-1', 'ws-1', {});

      expect(result.status).toBe(WorkItemStatus.IN_PROGRESS);
    });

    it('should throw ConflictException when starting a DONE task', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.DONE,
        deletedAt: null,
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(mockTask);

      await expect(service.startTask('task-1', 'ws-1', {})).rejects.toThrow(ConflictException);
    });
  });

  describe('completeTask', () => {
    it('should transition IN_PROGRESS -> DONE and set completedAt', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.IN_PROGRESS,
        deletedAt: null,
      };
      const updatedTask = { ...mockTask, status: WorkItemStatus.DONE, completedAt: new Date() };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(updatedTask);
      mockPrismaClient.workItem.update.mockResolvedValue(updatedTask);

      const result = await service.completeTask('task-1', 'ws-1', {});

      expect(result.status).toBe(WorkItemStatus.DONE);
      expect(result.completedAt).toBeDefined();
    });

    it('should not allow DONE -> IN_PROGRESS', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.DONE,
        deletedAt: null,
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(mockTask);

      await expect(service.completeTask('task-1', 'ws-1', {})).rejects.toThrow(ConflictException);
    });
  });

  describe('blockTask', () => {
    it('should transition TODO -> BLOCKED', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.TODO,
        deletedAt: null,
      };
      const updatedTask = { ...mockTask, status: WorkItemStatus.BLOCKED };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(updatedTask);
      mockPrismaClient.workItem.update.mockResolvedValue(updatedTask);

      const result = await service.blockTask('task-1', 'ws-1', {});

      expect(result.status).toBe(WorkItemStatus.BLOCKED);
    });
  });

  describe('cancelTask', () => {
    it('should transition TODO -> CANCELLED', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.TODO,
        deletedAt: null,
      };
      const updatedTask = { ...mockTask, status: WorkItemStatus.CANCELLED };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(updatedTask);
      mockPrismaClient.workItem.update.mockResolvedValue(updatedTask);

      const result = await service.cancelTask('task-1', 'ws-1', {});

      expect(result.status).toBe(WorkItemStatus.CANCELLED);
    });
  });

  describe('deleteTask', () => {
    it('should soft delete task by setting deletedAt', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.TODO,
        deletedAt: null,
      };
      const updatedTask = { ...mockTask, deletedAt: new Date(), status: WorkItemStatus.CANCELLED };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(updatedTask);
      mockPrismaClient.workItem.update.mockResolvedValue(updatedTask);

      const result = await service.deleteTask('task-1', 'ws-1');

      expect(result.deletedAt).toBeDefined();
    });

    it('should throw NotFoundException when task is already deleted', async () => {
      const mockTask = {
        id: 'task-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.TASK,
        status: WorkItemStatus.CANCELLED,
        deletedAt: new Date(),
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(mockTask);

      await expect(service.deleteTask('task-1', 'ws-1')).rejects.toThrow(NotFoundException);
    });
  });
});
