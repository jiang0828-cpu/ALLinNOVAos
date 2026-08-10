import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { MetricCalculatorService } from './metric-calculator.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkItemStatus, WorkItemType, PdcaStage, IssueStatus, GapType } from '@prisma/client';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockCalculator: any;
  let mockPrismaClient: any;

  beforeEach(async () => {
    mockPrismaClient = {
      metric: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      metricValue: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      metricGap: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      workItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      issueDetail: {
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: any) => {
        return callback(mockPrismaClient);
      }),
    };

    mockCalculator = {
      calculateContentPlanningProgress: jest.fn(),
      calculateWorkTaskCompletionRate: jest.fn(),
      calculateContentScore: jest.fn(),
      calculateWorkScore: jest.fn(),
      calculateHealthScore: jest.fn(),
      detectGap: jest.fn(),
    };

    const mockPrismaService = {
      get client() {
        return mockPrismaClient;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: MetricCalculatorService,
          useValue: mockCalculator,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  describe('calculateAndSaveMetric', () => {
    const mockMetric = {
      id: 'metric-1',
      name: 'content_planning_progress',
      displayName: '内容规划进度',
      targetValue: 100,
      warningThreshold: 60,
    };

    beforeEach(() => {
      mockPrismaClient.metric.findUnique.mockResolvedValue(mockMetric);
    });

    it('should calculate and save metric value (append-only)', async () => {
      const calcResult = {
        value: 40,
        metadata: { totalTasks: 5, doneTasks: 2 },
        calculationVersion: '1.0',
        sourceType: 'SYSTEM' as const,
      };

      mockCalculator.calculateContentPlanningProgress.mockResolvedValue(calcResult);
      mockCalculator.detectGap.mockReturnValue({ hasGap: false });

      const savedValue = {
        id: 'value-1',
        metricId: 'metric-1',
        value: 40,
      };
      mockPrismaClient.metricValue.create.mockResolvedValue(savedValue);

      const result = await service.calculateAndSaveMetric('ws-1', 'content_planning_progress');

      expect(result.metricValue.value).toBe(40);
      expect(result.gapDetected).toBe(false);
      // Verify append-only: create is called
      expect(mockPrismaClient.metricValue.create).toHaveBeenCalled();
    });

    it('should recalculate fresh each time (idempotent)', async () => {
      const calcResult = {
        value: 40,
        metadata: { totalTasks: 5, doneTasks: 2 },
        calculationVersion: '1.0',
        sourceType: 'SYSTEM' as const,
      };

      mockCalculator.calculateContentPlanningProgress.mockResolvedValue(calcResult);
      mockCalculator.detectGap.mockReturnValue({ hasGap: false });

      // Call 10 times
      for (let i = 0; i < 10; i++) {
        mockPrismaClient.metricValue.create.mockResolvedValue({
          id: `value-${i}`,
          metricId: 'metric-1',
          value: 40,
        });

        const result = await service.calculateAndSaveMetric('ws-1', 'content_planning_progress');
        expect(result.metricValue.value).toBe(40);
        expect(result.gapDetected).toBe(false);
      }

      // Calculator should have been called 10 times, each returning 40
      expect(mockCalculator.calculateContentPlanningProgress).toHaveBeenCalledTimes(10);
    });

    it('should create Issue when gap is detected', async () => {
      // Target=100, actual=40 -> gap detected
      const calcResult = {
        value: 40,
        metadata: { totalTasks: 5, doneTasks: 2 },
        calculationVersion: '1.0',
        sourceType: 'SYSTEM' as const,
      };

      mockCalculator.calculateContentPlanningProgress.mockResolvedValue(calcResult);
      mockCalculator.detectGap.mockReturnValue({
        hasGap: true,
        gapType: 'BELOW_TARGET' as GapType,
        gapValue: 60,
        severity: 'high',
        expectedValue: 100,
        actualValue: 40,
      });

      // No existing gap/issue
      mockPrismaClient.metricGap.findFirst.mockResolvedValue(null);

      // Create WorkItem for issue
      const createdIssue = {
        id: 'issue-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.ISSUE,
        status: WorkItemStatus.ACTIVE,
        issueDetail: {
          status: IssueStatus.OPEN,
        },
      };
      mockPrismaClient.workItem.create.mockResolvedValue(createdIssue);

      // Create MetricGap
      const createdGap = {
        id: 'gap-1',
        metricId: 'metric-1',
        gapType: 'BELOW_TARGET',
        isOpen: true,
        issueId: 'issue-1',
      };
      mockPrismaClient.metricGap.create.mockResolvedValue(createdGap);

      const result = await service.calculateAndSaveMetric('ws-1', 'content_planning_progress');

      expect(result.gapDetected).toBe(true);
      expect(result.issue).toBeDefined();
      expect(result.issue.issueId).toBe('issue-1');
    });

    it('should NOT create duplicate open issue for same metric+gapType', async () => {
      const calcResult = {
        value: 40,
        metadata: { totalTasks: 5, doneTasks: 2 },
        calculationVersion: '1.0',
        sourceType: 'SYSTEM' as const,
      };

      mockCalculator.calculateContentPlanningProgress.mockResolvedValue(calcResult);
      mockCalculator.detectGap.mockReturnValue({
        hasGap: true,
        gapType: 'BELOW_TARGET' as GapType,
        gapValue: 60,
        severity: 'high',
        expectedValue: 100,
        actualValue: 40,
      });

      // Existing gap with issue
      const existingGap = {
        id: 'gap-existing',
        metricId: 'metric-1',
        gapType: 'BELOW_TARGET',
        isOpen: true,
        issueId: 'issue-existing',
        issue: { id: 'issue-existing' },
      };
      mockPrismaClient.metricGap.findFirst.mockResolvedValue(existingGap);

      const existingIssue = {
        id: 'issue-existing',
        workspaceId: 'ws-1',
        itemType: WorkItemType.ISSUE,
        status: WorkItemStatus.ACTIVE,
        issueDetail: { status: IssueStatus.OPEN },
      };
      mockPrismaClient.workItem.findUnique.mockResolvedValue(existingIssue);

      const result = await service.calculateAndSaveMetric('ws-1', 'content_planning_progress');

      // Should NOT create new workItem
      expect(mockPrismaClient.workItem.create).not.toHaveBeenCalled();
      // Should NOT create new metricGap
      expect(mockPrismaClient.metricGap.create).not.toHaveBeenCalled();
      // Should UPDATE existing gap instead
      expect(mockPrismaClient.metricGap.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for unknown metric', async () => {
      mockPrismaClient.metric.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateAndSaveMetric('ws-1', 'unknown_metric'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMetrics', () => {
    it('should return metrics with latest values', async () => {
      const metrics = [
        {
          id: 'metric-1',
          name: 'content_planning_progress',
          values: [{ value: 75 }],
        },
      ];

      mockPrismaClient.metric.findMany.mockResolvedValue(metrics);

      const result = await service.listMetrics('ws-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('content_planning_progress');
    });
  });
});
