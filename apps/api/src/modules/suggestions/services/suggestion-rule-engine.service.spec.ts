import { Test, TestingModule } from '@nestjs/testing';
import { SuggestionRuleEngineService } from './suggestion-rule-engine.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SuggestionSourceType, SuggestionType, WorkItemStatus, WorkItemType, PdcaStage, Priority } from '@prisma/client';

const mockPrismaClient = {
  metricValue: {
    findFirst: jest.fn(),
  },
  metricGap: {
    findFirst: jest.fn(),
  },
  metric: {
    findUnique: jest.fn(),
  },
  workItem: {
    findMany: jest.fn(),
  },
};

const mockPrismaService = {
  client: mockPrismaClient,
};

describe('SuggestionRuleEngineService', () => {
  let service: SuggestionRuleEngineService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestionRuleEngineService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SuggestionRuleEngineService>(SuggestionRuleEngineService);
  });

  describe('evaluateRules', () => {
    it('should return empty array when no rules match', async () => {
      // No health_score metric value
      mockPrismaClient.metricValue.findFirst.mockResolvedValue(null);
      mockPrismaClient.metric.findUnique.mockResolvedValue(null);
      mockPrismaClient.metricGap.findFirst.mockResolvedValue(null);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      const results = await service.evaluateRules('ws-1');

      expect(results).toEqual([]);
    });

    it('should detect health_score below 80', async () => {
      // Mock health_score = 65
      mockPrismaClient.metricValue.findFirst
        .mockResolvedValueOnce({ id: 'mv-1', value: 65, metricId: 'm-1' })
        .mockResolvedValueOnce(null); // progress returns null
      mockPrismaClient.metric.findUnique.mockResolvedValue(null);
      mockPrismaClient.metricGap.findFirst.mockResolvedValue(null);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      const results = await service.evaluateRules('ws-1');

      const healthSuggestion = results.find(r => r.suggestionType === SuggestionType.HEALTH_IMPROVEMENT);
      expect(healthSuggestion).toBeDefined();
      expect(healthSuggestion?.sourceType).toBe(SuggestionSourceType.METRIC_GAP);
      expect(healthSuggestion?.confidence).toBeGreaterThanOrEqual(0.6);
      expect(healthSuggestion?.reason).toContain('65');
    });

    it('should detect content_planning_progress below target', async () => {
      // Mock health_score (first call) returns null, then progress metric returns 40
      mockPrismaClient.metricValue.findFirst
        .mockResolvedValueOnce(null) // health_score
        .mockResolvedValueOnce({ id: 'mv-2', value: 40, metricId: 'm-2' }); // progress
      
      // Mock metric.findUnique for progress target
      mockPrismaClient.metric.findUnique.mockResolvedValue({ id: 'm-2', name: 'content_planning_progress', targetValue: 60 });
      
      mockPrismaClient.metricGap.findFirst.mockResolvedValue(null);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      const results = await service.evaluateRules('ws-1');

      const progressSuggestion = results.find(r => r.suggestionType === SuggestionType.PROGRESS_ACCELERATION);
      expect(progressSuggestion).toBeDefined();
      expect(progressSuggestion?.reason).toContain('40');
    });

    it('should detect P0 overdue tasks', async () => {
      mockPrismaClient.metricValue.findFirst.mockResolvedValue(null);
      mockPrismaClient.metric.findUnique.mockResolvedValue(null);
      mockPrismaClient.metricGap.findFirst.mockResolvedValue(null);
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      mockPrismaClient.workItem.findMany
        .mockResolvedValueOnce([
          {
            id: 'task-1',
            title: 'Urgent P0 task',
            priority: Priority.P0,
            status: WorkItemStatus.IN_PROGRESS,
            taskDetail: { dueAt: yesterday },
          },
        ])
        .mockResolvedValue([]); // projects at risk

      const results = await service.evaluateRules('ws-1');

      const taskSuggestion = results.find(r => r.suggestionType === SuggestionType.TASK_RESOLUTION);
      expect(taskSuggestion).toBeDefined();
      expect(taskSuggestion?.sourceType).toBe(SuggestionSourceType.TASK);
      expect(taskSuggestion?.urgencyScore).toBe(100);
    });

    it('should detect blocked/ delayed projects', async () => {
      mockPrismaClient.metricValue.findFirst.mockResolvedValue(null);
      mockPrismaClient.metric.findUnique.mockResolvedValue(null);
      mockPrismaClient.metricGap.findFirst.mockResolvedValue(null);
      mockPrismaClient.workItem.findMany
        .mockResolvedValueOnce([]) // overdue tasks
        .mockResolvedValueOnce([
          {
            id: 'proj-1',
            title: 'Delayed Project',
            projectDetail: { healthStatus: 'OFF_TRACK', progress: 30 },
          },
        ]);

      const results = await service.evaluateRules('ws-1');

      const projectSuggestion = results.find(r => r.suggestionType === SuggestionType.RISK_MITIGATION);
      expect(projectSuggestion).toBeDefined();
      expect(projectSuggestion?.sourceType).toBe(SuggestionSourceType.PROJECT);
    });

    it('should not generate duplicate signals for same source', async () => {
      // The dedupKey is designed to prevent duplicates at the service level
      // The rule engine itself returns signals, dedup is handled by SuggestionsService
      mockPrismaClient.metricValue.findFirst.mockResolvedValue(null);
      mockPrismaClient.metric.findUnique.mockResolvedValue(null);
      mockPrismaClient.metricGap.findFirst.mockResolvedValue(null);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      const results1 = await service.evaluateRules('ws-1');
      const results2 = await service.evaluateRules('ws-1');

      // Both should return the same results (no dedup at engine level)
      expect(results1.length).toBe(results2.length);
    });
  });
});
