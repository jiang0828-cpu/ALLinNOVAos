import { Test, TestingModule } from '@nestjs/testing';
import { DecisionsService } from './decisions.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { WorkItemStatus, WorkItemType, PdcaStage, IssueLevel } from '@prisma/client';

const mockPrismaClient = {
  workspace: {
    findUnique: jest.fn(),
  },
  workItem: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  decisionDetail: {
    update: jest.fn(),
  },
  activityEvent: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (callback: any) => callback(mockPrismaClient)),
};

const mockPrismaService = {
  client: mockPrismaClient,
};

describe('DecisionsService', () => {
  let service: DecisionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DecisionsService>(DecisionsService);
  });

  describe('createDecision', () => {
    it('should create a decision successfully', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'dec-1',
        title: 'Test Decision',
        decisionDetail: { content: 'Test content' },
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.createDecision({
        workspaceId: 'ws-1',
        title: 'Test Decision',
        content: 'Test content',
      });

      expect(result).toBeDefined();
      expect(mockPrismaClient.workItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemType: WorkItemType.DECISION,
            pdcaStage: PdcaStage.ACT,
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent workspace', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(null);

      await expect(service.createDecision({
        workspaceId: 'ws-1',
        title: 'Test',
        content: 'Test',
      })).rejects.toThrow();
    });

    it('should associate with suggestion when provided', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'dec-1',
        decisionDetail: { suggestionId: 'sug-1' },
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.createDecision({
        workspaceId: 'ws-1',
        title: 'Test Decision',
        content: 'Test content',
        suggestionId: 'sug-1',
      });

      expect(mockPrismaClient.workItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decisionDetail: expect.objectContaining({
              create: expect.objectContaining({
                suggestionId: 'sug-1',
              }),
            }),
          }),
        }),
      );
    });
  });

  describe('getDecisionById', () => {
    it('should return decision when it exists', async () => {
      const decision = {
        id: 'dec-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.DECISION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        decisionDetail: { content: 'Test' },
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(decision);

      const result = await service.getDecisionById('dec-1', 'ws-1');

      expect(result.id).toBe('dec-1');
    });

    it('should throw NotFoundException for non-existent decision', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue(null);

      await expect(service.getDecisionById('dec-1', 'ws-1')).rejects.toThrow();
    });

    it('should throw NotFoundException for wrong workspace', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        id: 'dec-1',
        workspaceId: 'ws-2',
        itemType: WorkItemType.DECISION,
        deletedAt: null,
      });

      await expect(service.getDecisionById('dec-1', 'ws-1')).rejects.toThrow();
    });
  });

  describe('completeDecision', () => {
    it('should complete an active decision', async () => {
      const decision = {
        id: 'dec-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.DECISION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
      };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(decision)
        .mockResolvedValueOnce({ ...decision, status: WorkItemStatus.COMPLETED });
      mockPrismaClient.workItem.update.mockResolvedValue({
        id: 'dec-1',
        status: WorkItemStatus.COMPLETED,
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.completeDecision('dec-1', 'ws-1');

      expect(result.status).toBe(WorkItemStatus.COMPLETED);
    });

    it('should throw BadRequestException for non-active decision', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        id: 'dec-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.DECISION,
        status: WorkItemStatus.COMPLETED,
        deletedAt: null,
      });

      await expect(service.completeDecision('dec-1', 'ws-1')).rejects.toThrow();
    });
  });

  describe('cancelDecision', () => {
    it('should cancel an active decision', async () => {
      const decision = {
        id: 'dec-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.DECISION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
      };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(decision)
        .mockResolvedValueOnce({ ...decision, status: WorkItemStatus.CANCELLED });
      mockPrismaClient.workItem.update.mockResolvedValue({
        id: 'dec-1',
        status: WorkItemStatus.CANCELLED,
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.cancelDecision('dec-1', 'ws-1');

      expect(result.status).toBe(WorkItemStatus.CANCELLED);
    });
  });

  describe('deleteDecision', () => {
    it('should soft delete a decision', async () => {
      const decision = {
        id: 'dec-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.DECISION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(decision);
      mockPrismaClient.workItem.update.mockResolvedValue({
        id: 'dec-1',
        status: WorkItemStatus.ARCHIVED,
        deletedAt: new Date(),
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.deleteDecision('dec-1', 'ws-1');

      expect(result.status).toBe(WorkItemStatus.ARCHIVED);
    });

    it('should throw BadRequestException for already deleted decision', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        id: 'dec-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.DECISION,
        deletedAt: new Date(),
      });

      await expect(service.deleteDecision('dec-1', 'ws-1')).rejects.toThrow();
    });
  });

  describe('updateDecision', () => {
    it('should update decision content', async () => {
      const decision = {
        id: 'dec-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.DECISION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        decisionDetail: { content: 'Old content' },
      };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(decision)
        .mockResolvedValueOnce({ ...decision, decisionDetail: { content: 'New content' } });
      mockPrismaClient.workItem.update.mockResolvedValue({ id: 'dec-1' });
      mockPrismaClient.decisionDetail.update.mockResolvedValue({ workItemId: 'dec-1' });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.updateDecision('dec-1', 'ws-1', {
        content: 'New content',
      });

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for completed decision', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        id: 'dec-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.DECISION,
        status: WorkItemStatus.COMPLETED,
        deletedAt: null,
      });

      await expect(service.updateDecision('dec-1', 'ws-1', { title: 'New Title' })).rejects.toThrow();
    });
  });
});
