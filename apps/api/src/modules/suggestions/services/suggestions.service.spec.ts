import { Test, TestingModule } from '@nestjs/testing';
import { SuggestionsService } from './suggestions.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SuggestionRuleEngineService } from './suggestion-rule-engine.service';
import {
  WorkItemType,
  PdcaStage,
  WorkItemStatus,
  SuggestionStatus,
  SuggestionType,
  SuggestionSourceType,
  Priority,
  WorkItemRelationType,
  ActivityAction,
} from '@prisma/client';

const mockPrismaClient = {
  workspace: {
    findUnique: jest.fn(),
  },
  workItem: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  suggestionDetail: {
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  decisionDetail: {
    update: jest.fn(),
  },
  workItemRelation: {
    create: jest.fn(),
  },
  activityEvent: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (callback: any) => callback(mockPrismaClient)),
};

const mockPrismaService = {
  client: mockPrismaClient,
};

const mockRuleEngineService = {
  evaluateRules: jest.fn(),
};

describe('SuggestionsService', () => {
  let service: SuggestionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SuggestionRuleEngineService, useValue: mockRuleEngineService },
      ],
    }).compile();

    service = module.get<SuggestionsService>(SuggestionsService);
  });

  describe('executeRuleEngine', () => {
    it('should create suggestions for detected signals', async () => {
      const signals = [
        {
          ruleId: 'health_below_80' as const,
          suggestionType: SuggestionType.HEALTH_IMPROVEMENT,
          sourceType: SuggestionSourceType.METRIC_GAP,
          sourceRefId: 'gap-1',
          confidence: 0.85,
          impactScore: 75,
          urgencyScore: 80,
          reason: 'health_score 65 低于 80',
          evidence: { metric: 'health_score', value: 65 },
          dedupKey: 'ws-1:METRIC_GAP:gap-1:HEALTH_IMPROVEMENT',
        },
      ];

      mockRuleEngineService.evaluateRules.mockResolvedValue(signals);
      mockPrismaClient.workItem.findFirst.mockResolvedValue(null); // No existing suggestion
      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'sug-1',
        title: '[健康改善建议] 系统自动生成',
        status: WorkItemStatus.ACTIVE,
        suggestionDetail: { status: SuggestionStatus.PENDING },
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.executeRuleEngine('ws-1');

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockPrismaClient.workItem.create).toHaveBeenCalled();
      expect(mockPrismaClient.activityEvent.create).toHaveBeenCalled();
    });

    it('should skip suggestions with same dedupKey that are active', async () => {
      const signals = [
        {
          ruleId: 'health_below_80' as const,
          suggestionType: SuggestionType.HEALTH_IMPROVEMENT,
          sourceType: SuggestionSourceType.METRIC_GAP,
          sourceRefId: 'gap-1',
          confidence: 0.85,
          impactScore: 75,
          urgencyScore: 80,
          reason: 'health_score 65 低于 80',
          evidence: { metric: 'health_score', value: 65 },
          dedupKey: 'ws-1:METRIC_GAP:gap-1:HEALTH_IMPROVEMENT',
        },
      ];

      mockRuleEngineService.evaluateRules.mockResolvedValue(signals);
      mockPrismaClient.workItem.findFirst.mockResolvedValue({
        id: 'existing-sug',
        suggestionDetail: { status: SuggestionStatus.PENDING },
      });

      const result = await service.executeRuleEngine('ws-1');

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('createSuggestion', () => {
    it('should create a suggestion successfully', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrismaClient.workItem.findFirst.mockResolvedValue(null);
      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'sug-1',
        title: 'Test Suggestion',
        suggestionDetail: { status: SuggestionStatus.PENDING },
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.createSuggestion({
        workspaceId: 'ws-1',
        title: 'Test Suggestion',
        suggestionType: SuggestionType.HEALTH_IMPROVEMENT,
        sourceType: SuggestionSourceType.METRIC_GAP,
        sourceRefId: 'gap-1',
        reason: 'Test reason',
      });

      expect(result).toBeDefined();
      expect(mockPrismaClient.workItem.create).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate dedupKey', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrismaClient.workItem.findFirst.mockResolvedValue({ id: 'existing-sug' });

      await expect(service.createSuggestion({
        workspaceId: 'ws-1',
        title: 'Test',
        suggestionType: SuggestionType.HEALTH_IMPROVEMENT,
        sourceType: SuggestionSourceType.METRIC_GAP,
        sourceRefId: 'gap-1',
        dedupKey: 'duplicate-key',
      })).rejects.toThrow();
    });
  });

  describe('acceptSuggestion', () => {
    it('should accept suggestion and create decision', async () => {
      const suggestion = {
        id: 'sug-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.SUGGESTION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        title: 'Test Suggestion',
        description: 'Test description',
        cycleId: null,
        suggestionDetail: {
          status: SuggestionStatus.PENDING,
          reason: 'Test reason',
        },
      };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(suggestion) // getSuggestionById
        .mockResolvedValueOnce({ ...suggestion, suggestionDetail: { status: SuggestionStatus.ACCEPTED } });

      mockPrismaClient.suggestionDetail.update.mockResolvedValue({
        workItemId: 'sug-1',
        status: SuggestionStatus.ACCEPTED,
      });
      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'dec-1',
        itemType: WorkItemType.DECISION,
        decisionDetail: { suggestionId: 'sug-1' },
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.acceptSuggestion('sug-1', 'ws-1');

      expect(result).toBeDefined();
      expect(result.decision).toBeDefined();
      expect(mockPrismaClient.suggestionDetail.update).toHaveBeenCalled();
      expect(mockPrismaClient.workItem.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for already accepted suggestion', async () => {
      const suggestion = {
        id: 'sug-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.SUGGESTION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        suggestionDetail: {
          status: SuggestionStatus.ACCEPTED,
        },
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(suggestion);

      await expect(service.acceptSuggestion('sug-1', 'ws-1')).rejects.toThrow();
    });
  });

  describe('dismissSuggestion', () => {
    it('should dismiss a pending suggestion', async () => {
      const suggestion = {
        id: 'sug-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.SUGGESTION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        suggestionDetail: {
          status: SuggestionStatus.PENDING,
        },
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(suggestion);
      mockPrismaClient.suggestionDetail.update.mockResolvedValue({
        workItemId: 'sug-1',
        status: SuggestionStatus.DISMISSED,
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.dismissSuggestion('sug-1', 'ws-1');

      expect(result.status).toBe(SuggestionStatus.DISMISSED);
    });
  });

  describe('createAdjustmentTaskFromSuggestion', () => {
    it('should create adjustment task with DERIVED_FROM relation', async () => {
      const suggestion = {
        id: 'sug-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.SUGGESTION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        title: 'Test Suggestion',
        description: 'Test',
        cycleId: null,
        priority: Priority.P1,
        suggestionDetail: {
          status: SuggestionStatus.ACCEPTED,
        },
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(suggestion);
      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'task-1',
        itemType: WorkItemType.TASK,
        taskDetail: {},
      });
      mockPrismaClient.workItemRelation.create.mockResolvedValue({ id: 'rel-1' });
      mockPrismaClient.suggestionDetail.update.mockResolvedValue({
        workItemId: 'sug-1',
        isConverted: true,
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.createAdjustmentTaskFromSuggestion('sug-1', 'ws-1');

      expect(result).toBeDefined();
      expect(mockPrismaClient.workItem.create).toHaveBeenCalled();
      expect(mockPrismaClient.workItemRelation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            relationType: WorkItemRelationType.DERIVED_FROM,
          }),
        }),
      );
    });

    it('should throw BadRequestException for non-accepted suggestion', async () => {
      const suggestion = {
        id: 'sug-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.SUGGESTION,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        suggestionDetail: {
          status: SuggestionStatus.PENDING,
        },
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(suggestion);

      await expect(service.createAdjustmentTaskFromSuggestion('sug-1', 'ws-1')).rejects.toThrow();
    });
  });

  describe('expireSuggestions', () => {
    it('should expire pending suggestions past their expiry', async () => {
      mockPrismaClient.suggestionDetail.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.expireSuggestions('ws-1');

      expect(result.expiredCount).toBe(3);
      expect(mockPrismaClient.suggestionDetail.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SuggestionStatus.EXPIRED,
          }),
        }),
      );
    });
  });
});
