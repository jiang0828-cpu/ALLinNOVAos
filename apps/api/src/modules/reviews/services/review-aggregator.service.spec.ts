import { Test, TestingModule } from '@nestjs/testing';
import { ReviewAggregatorService } from './review-aggregator.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

const mockPrismaClient = {
  pdcaCycle: {
    findUnique: jest.fn(),
  },
  workItem: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  metric: {
    findMany: jest.fn(),
  },
  metricValue: {
    findFirst: jest.fn(),
  },
};

const mockPrismaService = {
  client: mockPrismaClient,
};

describe('ReviewAggregatorService', () => {
  let service: ReviewAggregatorService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewAggregatorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReviewAggregatorService>(ReviewAggregatorService);
  });

  describe('aggregateCycleData', () => {
    it('should return aggregated data with all metrics', async () => {
      // Mock cycle
      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue({
        id: 'cycle-1',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-07'),
      });

      // Mock task counts: 5 total, 2 done => 40%
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(5) // total tasks
        .mockResolvedValueOnce(2); // done tasks

      // Mock project progress (4 findMany calls: projects, issues, suggestions, goals)
      mockPrismaClient.workItem.findMany
        .mockResolvedValueOnce([]) // projects
        .mockResolvedValueOnce([]) // issues
        .mockResolvedValueOnce([]) // suggestions
        .mockResolvedValueOnce([]); // goals

      // Mock metrics
      mockPrismaClient.metric.findMany.mockResolvedValue([]);

      // Mock metric values (health_score, content_planning_progress, work_task_completion_rate)
      mockPrismaClient.metricValue.findFirst
        .mockResolvedValueOnce({ value: 65 }) // health_score
        .mockResolvedValueOnce({ value: 40 }) // content_planning_progress
        .mockResolvedValueOnce({ value: 40 }); // work_task_completion_rate

      const result = await service.aggregateCycleData('ws-1', 'cycle-1');

      // Verify task completion
      expect(result.taskCompletion.totalTasks).toBe(5);
      expect(result.taskCompletion.doneTasks).toBe(2);
      expect(result.taskCompletion.completionRate).toBe(40);

      // Verify metric values
      expect(result.healthScore).toBe(65);
      expect(result.contentPlanningProgress).toBe(40);
      expect(result.workTaskCompletionRate).toBe(40);

      // Verify next cycle focus contains expected items
      expect(result.suggestedNextCycleFocus.length).toBeGreaterThan(0);
      expect(
        result.suggestedNextCycleFocus.some((f: string) => f.includes('40%'))
      ).toBe(true);
    });

    it('should handle empty cycle gracefully', async () => {
      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue({
        id: 'cycle-2',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-07'),
      });

      mockPrismaClient.workItem.count.mockResolvedValue(0);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);
      mockPrismaClient.metric.findMany.mockResolvedValue([]);
      mockPrismaClient.metricValue.findFirst.mockResolvedValue(null);

      const result = await service.aggregateCycleData('ws-1', 'cycle-2');

      expect(result.taskCompletion.totalTasks).toBe(0);
      expect(result.taskCompletion.completionRate).toBe(0);
      expect(result.healthScore).toBeNull();
      expect(result.unresolvedIssues).toEqual([]);
      expect(result.acceptedSuggestions).toEqual([]);
    });

    it('should aggregate unresolved issues with severity', async () => {
      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue({
        id: 'cycle-3',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-07'),
      });

      mockPrismaClient.workItem.count.mockResolvedValue(0);
      mockPrismaClient.workItem.findMany
        .mockResolvedValueOnce([]) // projects
        .mockResolvedValueOnce([
          {
            id: 'issue-1',
            title: 'Test Issue',
            issueDetail: { severity: 'high', metricName: 'health_score' },
          },
        ]) // issues
        .mockResolvedValueOnce([]) // suggestions
        .mockResolvedValueOnce([]); // goals
      mockPrismaClient.metric.findMany.mockResolvedValue([]);
      mockPrismaClient.metricValue.findFirst.mockResolvedValue(null);

      const result = await service.aggregateCycleData('ws-1', 'cycle-3');

      expect(result.unresolvedIssues).toHaveLength(1);
      expect(result.unresolvedIssues[0].severity).toBe('high');
    });

    it('should aggregate accepted suggestions', async () => {
      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue({
        id: 'cycle-4',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-07'),
      });

      mockPrismaClient.workItem.count.mockResolvedValue(0);
      mockPrismaClient.workItem.findMany
        .mockResolvedValueOnce([]) // projects
        .mockResolvedValueOnce([]) // issues
        .mockResolvedValueOnce([
          {
            id: 'sug-1',
            title: 'Test Suggestion',
            suggestionDetail: {
              suggestionType: 'HEALTH_IMPROVEMENT',
              impactScore: 85,
            },
          },
        ]) // suggestions
        .mockResolvedValueOnce([]); // goals
      mockPrismaClient.metric.findMany.mockResolvedValue([]);
      mockPrismaClient.metricValue.findFirst.mockResolvedValue(null);

      const result = await service.aggregateCycleData('ws-1', 'cycle-4');

      expect(result.acceptedSuggestions).toHaveLength(1);
      expect(result.acceptedSuggestions[0].impactScore).toBe(85);
    });

    // Key acceptance test: weekly review auto-aggregation
    it('should auto-aggregate weekly review with completion 40%, goal 60%, issues, suggestions, next-cycle focus', async () => {
      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue({
        id: 'cycle-week',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-07'),
      });

      // 5 tasks total, 2 done => 40% completion
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);

      // 4 findMany calls: projects, issues, suggestions, goals
      mockPrismaClient.workItem.findMany
        .mockResolvedValueOnce([
          {
            id: 'proj-1',
            title: 'Content Planning Project',
            projectDetail: { progress: 40, healthStatus: 'ON_TRACK' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'issue-1',
            title: 'Goal below target',
            issueDetail: {
              severity: 'high',
              metricName: 'content_planning_progress',
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'sug-1',
            title: 'Accelerate content planning',
            suggestionDetail: {
              suggestionType: 'PROGRESS_ACCELERATION',
              impactScore: 80,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'goal-1',
            title: 'Content goal',
            goalDetail: { targetValue: 100, currentValue: 60 },
          },
        ]);

      mockPrismaClient.metric.findMany.mockResolvedValue([]);

      // Metrics: content_planning_progress = 40, health_score = 65, work_task_completion_rate = 40
      mockPrismaClient.metricValue.findFirst
        .mockResolvedValueOnce({ value: 65 }) // health_score
        .mockResolvedValueOnce({ value: 40 }) // content_planning_progress
        .mockResolvedValueOnce({ value: 40 }); // work_task_completion_rate

      const result = await service.aggregateCycleData('ws-1', 'cycle-week');

      // 内容项目完成率 40%
      expect(result.taskCompletion.completionRate).toBe(40);
      expect(result.contentPlanningProgress).toBe(40);

      // 当前目标 60% (goal achievement rate)
      expect(result.goalProgress).toHaveLength(1);
      expect(result.goalProgress[0].achievementRate).toBe(60);

      // 未解决问题
      expect(result.unresolvedIssues).toHaveLength(1);
      expect(result.unresolvedIssues[0].title).toBe('Goal below target');

      // 已接受建议
      expect(result.acceptedSuggestions).toHaveLength(1);
      expect(result.acceptedSuggestions[0].suggestionType).toBe(
        'PROGRESS_ACCELERATION'
      );

      // 下一周期重点 (auto-generated, non-empty)
      expect(result.suggestedNextCycleFocus.length).toBeGreaterThan(0);
      expect(
        result.suggestedNextCycleFocus.some((f: string) => f.includes('40%'))
      ).toBe(true);
    });
  });
});
