import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { ReviewAggregatorService } from './review-aggregator.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  WorkItemType,
  PdcaStage,
  WorkItemStatus,
  ReviewStatus,
  ReviewType,
  CycleType,
  InsightType,
  InsightStatus,
  IssueLevel,
  WorkItemRelationType,
} from '@prisma/client';

const mockPrismaClient = {
  workspace: {
    findUnique: jest.fn(),
  },
  pdcaCycle: {
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
  reviewDetail: {
    update: jest.fn(),
  },
  workItemRelation: {
    create: jest.fn(),
  },
  activityEvent: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockPrismaService = {
  client: mockPrismaClient,
};

const mockAggregatorService = {
  aggregateCycleData: jest.fn(),
};

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    // Re-establish $transaction mock since resetAllMocks clears implementations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrismaClient.$transaction.mockImplementation(async (callback: any) =>
      callback(mockPrismaClient)
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ReviewAggregatorService, useValue: mockAggregatorService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('generateReviewDraft', () => {
    it('should generate review draft from cycle data', async () => {
      const cycle = {
        id: 'cycle-1',
        workspaceId: 'ws-1',
        cycleType: CycleType.WEEKLY,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-07'),
      };

      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue(cycle);
      mockPrismaClient.workItem.findFirst.mockResolvedValue(null); // No existing review
      mockPrismaClient.workItem.findMany.mockResolvedValue([]); // No cycle items to relate

      const aggregatedData = {
        taskCompletion: { totalTasks: 5, doneTasks: 2, completionRate: 40 },
        projectProgress: [],
        metricChanges: [],
        unresolvedIssues: [],
        acceptedSuggestions: [],
        goalProgress: [],
        healthScore: 65,
        contentPlanningProgress: 40,
        workTaskCompletionRate: 40,
        suggestedNextCycleFocus: ['提升任务完成率（当前 40%，目标 ≥ 80%）'],
      };
      mockAggregatorService.aggregateCycleData.mockResolvedValue(
        aggregatedData
      );

      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'review-1',
        title: '周复盘 2026-08-01~2026-08-07',
        reviewDetail: {
          status: ReviewStatus.DRAFT,
          reviewType: ReviewType.WEEKLY,
          completionRate: 40,
          scoreAfter: 65,
        },
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.generateReviewDraft('ws-1', 'cycle-1', {
        reviewedBy: 'user-1',
      });

      expect(result).toBeDefined();
      expect(mockAggregatorService.aggregateCycleData).toHaveBeenCalledWith(
        'ws-1',
        'cycle-1'
      );
      expect(mockPrismaClient.workItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemType: WorkItemType.REVIEW,
            pdcaStage: PdcaStage.REVIEW,
            reviewDetail: expect.objectContaining({
              create: expect.objectContaining({
                reviewType: ReviewType.WEEKLY,
                status: ReviewStatus.DRAFT,
                isDraft: true,
                completionRate: 40,
                scoreAfter: 65,
              }),
            }),
          }),
        })
      );
    });

    it('should throw ConflictException if review already exists for cycle', async () => {
      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue({
        id: 'cycle-1',
        workspaceId: 'ws-1',
        cycleType: CycleType.WEEKLY,
      });
      mockPrismaClient.workItem.findFirst.mockResolvedValue({
        id: 'existing-review',
      });

      await expect(
        service.generateReviewDraft('ws-1', 'cycle-1')
      ).rejects.toThrow();
    });

    it('should throw NotFoundException for non-existent cycle', async () => {
      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue(null);

      await expect(
        service.generateReviewDraft('ws-1', 'cycle-1')
      ).rejects.toThrow();
    });

    it('should throw NotFoundException for cycle in wrong workspace', async () => {
      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue({
        id: 'cycle-1',
        workspaceId: 'ws-other',
        cycleType: CycleType.WEEKLY,
      });

      await expect(
        service.generateReviewDraft('ws-1', 'cycle-1')
      ).rejects.toThrow();
    });
  });

  describe('createReview', () => {
    it('should create a review manually', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });
      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'review-1',
        reviewDetail: { status: ReviewStatus.DRAFT },
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.createReview({
        workspaceId: 'ws-1',
        title: 'Test Review',
        reviewType: ReviewType.MONTHLY,
        cycleType: CycleType.MONTHLY,
        period: '2026-08',
      });

      expect(result).toBeDefined();
      expect(mockPrismaClient.workItem.create).toHaveBeenCalled();
    });
  });

  describe('getReviewById', () => {
    it('should return review when it exists', async () => {
      const review = {
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        reviewDetail: { status: ReviewStatus.DRAFT },
      };
      mockPrismaClient.workItem.findUnique.mockResolvedValue(review);

      const result = await service.getReviewById('review-1', 'ws-1');

      expect(result.id).toBe('review-1');
    });

    it('should throw NotFoundException for non-existent review', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue(null);

      await expect(service.getReviewById('review-1', 'ws-1')).rejects.toThrow();
    });
  });

  describe('updateReview', () => {
    it('should update review content', async () => {
      const review = {
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        reviewDetail: { status: ReviewStatus.DRAFT },
      };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(review)
        .mockResolvedValueOnce({
          ...review,
          reviewDetail: { status: ReviewStatus.DRAFT, summary: 'Updated' },
        });
      mockPrismaClient.workItem.update.mockResolvedValue({ id: 'review-1' });
      mockPrismaClient.reviewDetail.update.mockResolvedValue({
        workItemId: 'review-1',
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.updateReview('review-1', 'ws-1', {
        summary: 'Updated summary',
      });

      expect(result).toBeDefined();
      expect(mockPrismaClient.reviewDetail.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException for completed review', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        reviewDetail: { status: ReviewStatus.COMPLETED },
      });

      await expect(
        service.updateReview('review-1', 'ws-1', { summary: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('completeReview', () => {
    it('should complete a draft review', async () => {
      const review = {
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        reviewDetail: {
          status: ReviewStatus.DRAFT,
          reviewedBy: null,
        },
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(review);
      mockPrismaClient.reviewDetail.update.mockResolvedValue({
        workItemId: 'review-1',
        status: ReviewStatus.COMPLETED,
      });
      mockPrismaClient.workItem.update.mockResolvedValue({ id: 'review-1' });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.completeReview('review-1', 'ws-1', {
        reviewedBy: 'user-1',
      });

      expect(result.status).toBe(ReviewStatus.COMPLETED);
      expect(mockPrismaClient.reviewDetail.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReviewStatus.COMPLETED,
            isDraft: false,
            reviewedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw BadRequestException for already completed review', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        reviewDetail: { status: ReviewStatus.COMPLETED },
      });

      await expect(
        service.completeReview('review-1', 'ws-1')
      ).rejects.toThrow();
    });
  });

  describe('createInsightFromReview', () => {
    it('should create insight from completed review with PRODUCES relation', async () => {
      const review = {
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        cycleId: 'cycle-1',
        reviewDetail: { status: ReviewStatus.COMPLETED },
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(review);
      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'insight-1',
        itemType: WorkItemType.INSIGHT,
        insightDetail: {
          insightType: InsightType.SUCCESS_FACTOR,
          status: InsightStatus.ACTIVE,
        },
      });
      mockPrismaClient.workItemRelation.create.mockResolvedValue({
        id: 'rel-1',
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.createInsightFromReview('review-1', 'ws-1', {
        statement: 'Daily reviews improve completion rate',
        content:
          'Teams that hold daily reviews see 30% better completion rates',
        insightType: InsightType.SUCCESS_FACTOR,
        confidence: 0.85,
        impactScore: 75,
      });

      expect(result).toBeDefined();
      expect(mockPrismaClient.workItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemType: WorkItemType.INSIGHT,
            pdcaStage: PdcaStage.REVIEW,
            insightDetail: expect.objectContaining({
              create: expect.objectContaining({
                insightType: InsightType.SUCCESS_FACTOR,
                confidence: 0.85,
                status: InsightStatus.ACTIVE,
              }),
            }),
          }),
        })
      );
      expect(mockPrismaClient.workItemRelation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            relationType: WorkItemRelationType.PRODUCES,
          }),
        })
      );
    });

    it('should throw BadRequestException for non-completed review', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      await expect(
        service.createInsightFromReview('review-1', 'ws-1', {
          statement: 'Test',
          content: 'Test',
          insightType: InsightType.STRATEGY,
        })
      ).rejects.toThrow();
    });
  });

  describe('createDecisionFromReview', () => {
    it('should create decision from completed review with PRODUCES relation', async () => {
      const review = {
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        cycleId: 'cycle-1',
        reviewDetail: { status: ReviewStatus.COMPLETED },
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(review);
      mockPrismaClient.workItem.create.mockResolvedValue({
        id: 'decision-1',
        itemType: WorkItemType.DECISION,
        decisionDetail: { content: 'Test decision' },
      });
      mockPrismaClient.workItemRelation.create.mockResolvedValue({
        id: 'rel-1',
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.createDecisionFromReview(
        'review-1',
        'ws-1',
        {
          content: 'Increase daily review frequency',
          rationale:
            'Based on insights showing correlation with completion rate',
          impact: IssueLevel.HIGH,
        }
      );

      expect(result).toBeDefined();
      expect(mockPrismaClient.workItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemType: WorkItemType.DECISION,
            pdcaStage: PdcaStage.ACT,
            decisionDetail: expect.objectContaining({
              create: expect.objectContaining({
                reviewId: 'review-1',
                impact: IssueLevel.HIGH,
              }),
            }),
          }),
        })
      );
    });
  });

  describe('createNextCycleTaskDrafts', () => {
    it('should create decision + task drafts with ADJUSTS relation', async () => {
      const review = {
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        cycleId: 'cycle-1',
        title: 'Test Review',
        reviewDetail: { status: ReviewStatus.COMPLETED },
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(review);
      mockPrismaClient.workItem.create
        .mockResolvedValueOnce({ id: 'decision-1', decisionDetail: {} })
        .mockResolvedValueOnce({ id: 'task-1', taskDetail: {} })
        .mockResolvedValueOnce({ id: 'task-2', taskDetail: {} });
      mockPrismaClient.workItemRelation.create.mockResolvedValue({
        id: 'rel-1',
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.createNextCycleTaskDrafts(
        'review-1',
        'ws-1',
        [
          { title: 'Task 1', estimatedMinutes: 60 },
          { title: 'Task 2', estimatedMinutes: 90 },
        ],
        { createdBy: 'user-1' }
      );

      expect(result.tasks).toHaveLength(2);
      // Should create: 1 Review-PRODUCES-Decision + 2 Decision-ADJUSTS-Task = 3 relations
      expect(mockPrismaClient.workItemRelation.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('deleteReview', () => {
    it('should soft delete a review', async () => {
      const review = {
        id: 'review-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
      };

      mockPrismaClient.workItem.findUnique.mockResolvedValue(review);
      mockPrismaClient.workItem.update.mockResolvedValue({
        id: 'review-1',
        status: WorkItemStatus.ARCHIVED,
        deletedAt: new Date(),
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.deleteReview('review-1', 'ws-1');

      expect(result.status).toBe(WorkItemStatus.ARCHIVED);
    });
  });

  describe('listReviews', () => {
    it('should list reviews with filters', async () => {
      mockPrismaClient.workItem.count.mockResolvedValue(2);
      mockPrismaClient.workItem.findMany.mockResolvedValue([
        { id: 'review-1', reviewDetail: { status: ReviewStatus.DRAFT } },
        { id: 'review-2', reviewDetail: { status: ReviewStatus.COMPLETED } },
      ]);

      const result = await service.listReviews('ws-1', {
        status: [ReviewStatus.DRAFT, ReviewStatus.COMPLETED],
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('findDraftForCycle', () => {
    it('should return an existing review for a cycle (dedup helper)', async () => {
      mockPrismaClient.workItem.findFirst.mockResolvedValue({
        id: 'review-existing',
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      const result = await service.findDraftForCycle('ws-1', 'cycle-1');

      expect(result?.id).toBe('review-existing');
      expect(mockPrismaClient.workItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            workspaceId: 'ws-1',
            cycleId: 'cycle-1',
            itemType: WorkItemType.REVIEW,
            deletedAt: null,
          }),
          include: { reviewDetail: true },
        })
      );
    });

    it('should return null when no review exists for the cycle', async () => {
      mockPrismaClient.workItem.findFirst.mockResolvedValue(null);

      const result = await service.findDraftForCycle('ws-1', 'cycle-1');

      expect(result).toBeNull();
    });
  });

  describe('regenerateDraft', () => {
    it('should refresh an existing DRAFT review with freshly aggregated data', async () => {
      const review = {
        id: 'review-1',
        workspaceId: 'ws-1',
        cycleId: 'cycle-1',
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        reviewDetail: { status: ReviewStatus.DRAFT },
      };
      mockPrismaClient.workItem.findUnique
        // First call: regenerateDraft's own lookup
        .mockResolvedValueOnce(review)
        // Subsequent calls: getReviewById at the end of the transaction
        .mockResolvedValueOnce({
          ...review,
          reviewDetail: { status: ReviewStatus.DRAFT, summary: 'refreshed' },
        });
      mockPrismaClient.pdcaCycle.findUnique.mockResolvedValue({
        id: 'cycle-1',
        cycleType: CycleType.WEEKLY,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-07'),
      });
      mockAggregatorService.aggregateCycleData.mockResolvedValue({
        taskCompletion: { totalTasks: 5, doneTasks: 2, completionRate: 40 },
        projectProgress: [],
        metricChanges: [],
        unresolvedIssues: [],
        acceptedSuggestions: [],
        goalProgress: [],
        healthScore: 65,
        contentPlanningProgress: 40,
        workTaskCompletionRate: 40,
        suggestedNextCycleFocus: ['提升任务完成率'],
      });
      mockPrismaClient.workItem.update.mockResolvedValue({ id: 'review-1' });
      mockPrismaClient.reviewDetail.update.mockResolvedValue({
        workItemId: 'review-1',
      });
      mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.regenerateDraft('review-1', 'ws-1', {
        reviewedBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('review-1');
      // The review should have been re-aggregated
      expect(mockAggregatorService.aggregateCycleData).toHaveBeenCalledWith(
        'ws-1',
        'cycle-1'
      );
      // reviewDetail should be updated with fresh aggregated content
      expect(mockPrismaClient.reviewDetail.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workItemId: 'review-1' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            completionRate: 40,
            scoreAfter: 65,
            isDraft: true, // stays a draft
          }),
        })
      );
      // An UPDATE ActivityEvent should be written with regenerated=true
      expect(mockPrismaClient.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            workItemId: 'review-1',
            action: 'UPDATE',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            metadata: expect.objectContaining({
              cycleId: 'cycle-1',
              regenerated: true,
              autoGenerated: true,
            }),
          }),
        })
      );
      // The review status must stay DRAFT (never auto-completed)
      expect(result?.reviewDetail?.status).toBe(ReviewStatus.DRAFT);
    });

    it('should return null (no update) when the existing review is COMPLETED', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        id: 'review-1',
        workspaceId: 'ws-1',
        cycleId: 'cycle-1',
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        reviewDetail: { status: ReviewStatus.COMPLETED },
      });

      const result = await service.regenerateDraft('review-1', 'ws-1');

      expect(result).toBeNull();
      // Should NOT have re-aggregated or updated anything
      expect(mockAggregatorService.aggregateCycleData).not.toHaveBeenCalled();
      expect(mockPrismaClient.reviewDetail.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the review does not exist', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue(null);

      await expect(
        service.regenerateDraft('missing', 'ws-1')
      ).rejects.toThrow();
    });

    it('should throw BadRequestException when the review has no cycleId', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue({
        id: 'review-1',
        workspaceId: 'ws-1',
        cycleId: null, // no cycle
        itemType: WorkItemType.REVIEW,
        deletedAt: null,
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      await expect(
        service.regenerateDraft('review-1', 'ws-1')
      ).rejects.toThrow();
    });
  });
});
