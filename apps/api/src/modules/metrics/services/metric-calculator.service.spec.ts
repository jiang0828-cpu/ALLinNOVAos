import { Test, TestingModule } from '@nestjs/testing';
import { MetricCalculatorService } from './metric-calculator.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { WorkItemStatus, WorkItemType, PdcaStage } from '@prisma/client';

describe('MetricCalculatorService', () => {
  let service: MetricCalculatorService;
  let mockPrismaClient: any;

  const createMockPrismaClient = () => ({
    workItem: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  });

  beforeEach(async () => {
    mockPrismaClient = createMockPrismaClient();

    const mockPrismaService = {
      get client() {
        return mockPrismaClient;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricCalculatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MetricCalculatorService>(MetricCalculatorService);
  });

  describe('calculateContentPlanningProgress', () => {
    it('should return 40 when 2 out of 5 tasks are done', async () => {
      // Mock: 5 total tasks, 2 done
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(2); // done
      mockPrismaClient.workItem.findMany.mockResolvedValue([]); // projects lookup

      const result = await service.calculateContentPlanningProgress('ws-1');

      expect(result.value).toBe(40);
      expect(result.metadata.totalTasks).toBe(5);
      expect(result.metadata.doneTasks).toBe(2);
      expect(result.calculationVersion).toBe('1.0');
      expect(result.sourceType).toBe('SYSTEM');
    });

    it('should return 0 when no tasks exist', async () => {
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(0)  // total
        .mockResolvedValueOnce(0); // done
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      const result = await service.calculateContentPlanningProgress('ws-1');

      expect(result.value).toBe(0);
      expect(result.metadata.totalTasks).toBe(0);
    });

    it('should return 100 when all tasks are done', async () => {
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(3)  // total
        .mockResolvedValueOnce(3); // done
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      const result = await service.calculateContentPlanningProgress('ws-1');

      expect(result.value).toBe(100);
    });

    it('should recalculate fresh each time (not cumulative)', async () => {
      // First call: 5 tasks, 2 done
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      const result1 = await service.calculateContentPlanningProgress('ws-1');
      expect(result1.value).toBe(40);

      // Reset mocks
      mockPrismaClient.workItem.count.mockClear();
      mockPrismaClient.workItem.findMany.mockClear();

      // Second call: same state, should still be 40
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      const result2 = await service.calculateContentPlanningProgress('ws-1');
      expect(result2.value).toBe(40);
    });
  });

  describe('detectGap', () => {
    it('should detect gap when value is below target', () => {
      // content_planning_progress: target=100, warning=60
      const result = service.detectGap('content_planning_progress', 40);

      expect(result.hasGap).toBe(true);
      expect(result.gapType).toBe('BELOW_TARGET');
      expect(result.gapValue).toBe(60); // 100 - 40
      expect(result.severity).toBe('high'); // 40 < 60 warning
      expect(result.expectedValue).toBe(100);
      expect(result.actualValue).toBe(40);
    });

    it('should detect gap as medium when below target but above warning', () => {
      // content_planning_progress: target=100, warning=60
      const result = service.detectGap('content_planning_progress', 70);

      expect(result.hasGap).toBe(true);
      expect(result.gapType).toBe('BELOW_TARGET');
      expect(result.severity).toBe('medium'); // 70 >= 60 warning
    });

    it('should not detect gap when value meets target', () => {
      const result = service.detectGap('content_planning_progress', 100);

      expect(result.hasGap).toBe(false);
    });

    it('should not detect gap when value exceeds target', () => {
      const result = service.detectGap('content_planning_progress', 120);

      expect(result.hasGap).toBe(false);
    });

    it('should return hasGap=false for unknown metric', () => {
      const result = service.detectGap('unknown_metric', 50);

      expect(result.hasGap).toBe(false);
    });
  });

  describe('calculateWorkTaskCompletionRate', () => {
    it('should calculate completion rate correctly', async () => {
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(7);  // done

      const result = await service.calculateWorkTaskCompletionRate('ws-1');

      expect(result.value).toBe(70);
      expect(result.metadata.totalTasks).toBe(10);
      expect(result.metadata.doneTasks).toBe(7);
    });
  });

  describe('calculateHealthScore', () => {
    it('should calculate health score based on high issues', async () => {
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(10)  // total tasks
        .mockResolvedValueOnce(3);  // high issues

      const result = await service.calculateHealthScore('ws-1');

      // 100 - (3/10 * 100) = 70
      expect(result.value).toBe(70);
      expect(result.metadata.totalTasks).toBe(10);
      expect(result.metadata.highIssueCount).toBe(3);
    });

    it('should return 100 when no high issues', async () => {
      mockPrismaClient.workItem.count
        .mockResolvedValueOnce(10)  // total tasks
        .mockResolvedValueOnce(0);  // high issues

      const result = await service.calculateHealthScore('ws-1');

      expect(result.value).toBe(100);
    });
  });

  describe('calculateAllMetrics', () => {
    it('should calculate all 5 metrics', async () => {
      // Setup findMany to always return empty arrays
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);

      // Setup count to return consistent values
      mockPrismaClient.workItem.count.mockImplementation(() => Promise.resolve(5));

      const results = await service.calculateAllMetrics('ws-1');

      expect(results.size).toBe(5);
      expect(results.has('content_planning_progress')).toBe(true);
      expect(results.has('work_task_completion_rate')).toBe(true);
      expect(results.has('content_score')).toBe(true);
      expect(results.has('work_score')).toBe(true);
      expect(results.has('health_score')).toBe(true);
    });
  });
});
