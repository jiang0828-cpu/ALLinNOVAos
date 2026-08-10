import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { CycleStatus, CycleType, ReviewStatus } from '@prisma/client';
import { WeeklyReviewSchedulerService } from './weekly-review-scheduler.service';
import { WeeklyReviewProcessor } from './weekly-review.processor';
import { ReviewsService } from '../services/reviews.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  WEEKLY_REVIEW_QUEUE,
  WEEKLY_REVIEW_CRON,
  DEFAULT_TIMEZONE,
} from './weekly-review.constants';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrismaClient = {
  workspace: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  pdcaCycle: {
    findFirst: jest.fn(),
  },
  activityEvent: {
    create: jest.fn(),
  },
};

const mockPrismaService = { client: mockPrismaClient };

const mockReviewsService = {
  findDraftForCycle: jest.fn(),
  regenerateDraft: jest.fn(),
  generateReviewDraft: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
  removeRepeatable: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A WEEKLY cycle whose endDate is in the past (a "completed" week). */
const makeCompletedWeeklyCycle = (
  overrides: Partial<{
    id: string;
    workspaceId: string;
    domainId: string | null;
    endDate: Date;
    startDate: Date;
    status: CycleStatus;
  }> = {}
) => ({
  id: 'cycle-week-1',
  workspaceId: 'ws-1',
  domainId: null,
  cycleType: CycleType.WEEKLY,
  status: CycleStatus.COMPLETED,
  name: 'Week 32',
  startDate: new Date('2026-08-01T00:00:00Z'),
  endDate: new Date('2026-08-07T23:59:59Z'),
  ...overrides,
});

const makeWorkspace = (
  overrides: Partial<{
    id: string;
    name: string;
    timezone: string;
  }> = {}
) => ({
  id: 'ws-1',
  name: 'Test Workspace',
  timezone: 'Asia/Shanghai',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('WeeklyReviewSchedulerService', () => {
  let service: WeeklyReviewSchedulerService;
  let processor: WeeklyReviewProcessor;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyReviewSchedulerService,
        WeeklyReviewProcessor,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ReviewsService, useValue: mockReviewsService },
        {
          provide: getQueueToken(WEEKLY_REVIEW_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<WeeklyReviewSchedulerService>(
      WeeklyReviewSchedulerService
    );
    processor = module.get<WeeklyReviewProcessor>(WeeklyReviewProcessor);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  // runForWorkspace — create path (no existing draft)
  // ------------------------------------------------------------------
  describe('runForWorkspace — create path', () => {
    it('creates a DRAFT review when no existing review exists for the cycle', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(
        makeCompletedWeeklyCycle()
      );
      mockReviewsService.findDraftForCycle.mockResolvedValue(null); // no existing draft
      mockReviewsService.generateReviewDraft.mockResolvedValue({
        id: 'review-new',
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      const result = await service.runForWorkspace('ws-1');

      expect(result).toEqual({
        workspaceId: 'ws-1',
        cycleId: 'cycle-week-1',
        reviewId: 'review-new',
        action: 'created',
        status: ReviewStatus.DRAFT,
      });

      // Should have aggregated + created (NOT regenerated)
      expect(mockReviewsService.generateReviewDraft).toHaveBeenCalledWith(
        'ws-1',
        'cycle-week-1',
        { reviewedBy: 'system' }
      );
      expect(mockReviewsService.regenerateDraft).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when workspace does not exist', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(null);

      await expect(service.runForWorkspace('missing-ws')).rejects.toThrow(
        NotFoundException
      );
    });

    it('records a no-op ActivityEvent when no completed WEEKLY cycle exists', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(null); // no cycle
      mockPrismaClient.activityEvent.create.mockResolvedValue({
        id: 'evt-noop',
      });

      const result = await service.runForWorkspace('ws-1');

      expect(result.action).toBe('skipped');
      expect(result.reviewId).toBe('');
      // An ActivityEvent should be recorded for observability
      expect(mockPrismaClient.activityEvent.create).toHaveBeenCalledTimes(1);
      const evtCalls = mockPrismaClient.activityEvent.create.mock
        .calls as unknown as Array<
        [
          {
            data: {
              workspaceId: string;
              workItemId: string | null;
              metadata: { scheduler: string; reason: string };
            };
          },
        ]
      >;
      const evtData = evtCalls[0][0].data;
      expect(evtData.workspaceId).toBe('ws-1');
      expect(evtData.workItemId).toBeNull();
      expect(evtData.metadata.scheduler).toBe('weekly-review');
      expect(evtData.metadata.reason).toBe('no_completed_weekly_cycle');
      // And it should NOT have tried to create a review
      expect(mockReviewsService.generateReviewDraft).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // runForWorkspace — update path (existing draft)
  // ------------------------------------------------------------------
  describe('runForWorkspace — update path (dedup)', () => {
    it('refreshes the existing DRAFT review instead of creating a new one', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(
        makeCompletedWeeklyCycle()
      );

      const existingDraft = {
        id: 'review-existing',
        reviewDetail: { status: ReviewStatus.DRAFT },
      };
      mockReviewsService.findDraftForCycle.mockResolvedValue(existingDraft);
      mockReviewsService.regenerateDraft.mockResolvedValue({
        id: 'review-existing',
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      const result = await service.runForWorkspace('ws-1');

      expect(result).toEqual({
        workspaceId: 'ws-1',
        cycleId: 'cycle-week-1',
        reviewId: 'review-existing',
        action: 'updated',
        status: ReviewStatus.DRAFT,
      });

      // Should regenerate, NOT create
      expect(mockReviewsService.regenerateDraft).toHaveBeenCalledWith(
        'review-existing',
        'ws-1',
        { reviewedBy: 'system' }
      );
      expect(mockReviewsService.generateReviewDraft).not.toHaveBeenCalled();
    });

    it('skips regeneration (no-op) when the existing review is COMPLETED', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(
        makeCompletedWeeklyCycle()
      );

      const existingCompleted = {
        id: 'review-completed',
        reviewDetail: { status: ReviewStatus.COMPLETED },
      };
      mockReviewsService.findDraftForCycle.mockResolvedValue(existingCompleted);
      // regenerateDraft returns null when not a draft
      mockReviewsService.regenerateDraft.mockResolvedValue(null);

      const result = await service.runForWorkspace('ws-1');

      expect(result.action).toBe('skipped');
      expect(result.reviewId).toBe('review-completed');
      // regenerateDraft IS called (it decides internally whether to update),
      // but it returns null meaning "no changes". generateReviewDraft is NOT.
      expect(mockReviewsService.regenerateDraft).toHaveBeenCalled();
      expect(mockReviewsService.generateReviewDraft).not.toHaveBeenCalled();
    });

    it('never auto-completes the draft (requirement #6)', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(
        makeCompletedWeeklyCycle()
      );
      mockReviewsService.findDraftForCycle.mockResolvedValue(null);
      mockReviewsService.generateReviewDraft.mockResolvedValue({
        id: 'review-new',
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      const result = await service.runForWorkspace('ws-1');

      // Result must always be DRAFT, never COMPLETED/PUBLISHED
      expect(result.status).toBe(ReviewStatus.DRAFT);
      expect(result.action).toBe('created');
    });
  });

  // ------------------------------------------------------------------
  // Manual trigger (requirement #7)
  // ------------------------------------------------------------------
  describe('triggerManually', () => {
    it('uses the explicitly provided cycleId instead of searching for one', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      // When cycleId is provided, findCycleById is used (also via pdcaCycle.findFirst)
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(
        makeCompletedWeeklyCycle({ id: 'cycle-explicit' })
      );
      mockReviewsService.findDraftForCycle.mockResolvedValue(null);
      mockReviewsService.generateReviewDraft.mockResolvedValue({
        id: 'review-manual',
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      const result = await service.triggerManually('ws-1', {
        cycleId: 'cycle-explicit',
        triggeredBy: 'tester',
      });

      expect(result.action).toBe('created');
      expect(result.cycleId).toBe('cycle-explicit');
      expect(result.reviewId).toBe('review-manual');
      // generateReviewDraft should be called with the explicit cycleId + actor
      expect(mockReviewsService.generateReviewDraft).toHaveBeenCalledWith(
        'ws-1',
        'cycle-explicit',
        { reviewedBy: 'tester' }
      );
    });

    it('passes triggeredBy through to the review creation as the actor', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(
        makeCompletedWeeklyCycle()
      );
      mockReviewsService.findDraftForCycle.mockResolvedValue(null);
      mockReviewsService.generateReviewDraft.mockResolvedValue({
        id: 'review-2',
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      await service.triggerManually('ws-1', { triggeredBy: 'operator-007' });

      expect(mockReviewsService.generateReviewDraft).toHaveBeenCalledWith(
        'ws-1',
        'cycle-week-1',
        { reviewedBy: 'operator-007' }
      );
    });
  });

  // ------------------------------------------------------------------
  // runForAllWorkspaces
  // ------------------------------------------------------------------
  describe('runForAllWorkspaces', () => {
    it('runs the scheduler for every non-deleted workspace', async () => {
      mockPrismaClient.workspace.findMany.mockResolvedValue([
        { id: 'ws-a' },
        { id: 'ws-b' },
      ]);
      mockPrismaClient.workspace.findUnique
        .mockResolvedValueOnce(makeWorkspace({ id: 'ws-a', name: 'A' }))
        .mockResolvedValueOnce(makeWorkspace({ id: 'ws-b', name: 'B' }));
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(
        makeCompletedWeeklyCycle()
      );
      mockReviewsService.findDraftForCycle.mockResolvedValue(null);
      mockReviewsService.generateReviewDraft.mockResolvedValue({
        id: 'review-x',
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      const results = await service.runForAllWorkspaces({
        triggeredBy: 'batch',
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.action === 'created')).toBe(true);
    });

    it('continues running other workspaces when one fails', async () => {
      mockPrismaClient.workspace.findMany.mockResolvedValue([
        { id: 'ws-a' },
        { id: 'ws-b' },
      ]);
      // First workspace lookup throws, second succeeds
      mockPrismaClient.workspace.findUnique
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce(makeWorkspace({ id: 'ws-b' }));
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(
        makeCompletedWeeklyCycle()
      );
      mockReviewsService.findDraftForCycle.mockResolvedValue(null);
      mockReviewsService.generateReviewDraft.mockResolvedValue({
        id: 'review-b',
        reviewDetail: { status: ReviewStatus.DRAFT },
      });

      const results = await service.runForAllWorkspaces();

      // Only the successful workspace appears in results
      expect(results).toHaveLength(1);
      expect(results[0].workspaceId).toBe('ws-b');
    });
  });

  // ------------------------------------------------------------------
  // Cycle-finding logic
  // ------------------------------------------------------------------
  describe('findLastCompleteWeekCycle (via runForWorkspace)', () => {
    it('queries for the latest WEEKLY cycle with endDate < now and a finished status', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.pdcaCycle.findFirst.mockResolvedValue(null);

      await service.runForWorkspace('ws-1');

      const calls = mockPrismaClient.pdcaCycle.findFirst.mock
        .calls as unknown as Array<
        [
          {
            where: {
              workspaceId: string;
              cycleType: CycleType;
              endDate: { lt: Date };
              status: { in: CycleStatus[] };
            };
            orderBy: { endDate: string };
          },
        ]
      >;
      const callArgs = calls[0][0];
      expect(callArgs.where.workspaceId).toBe('ws-1');
      expect(callArgs.where.cycleType).toBe(CycleType.WEEKLY);
      expect(callArgs.where.endDate).toEqual({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        lt: expect.any(Date),
      });
      expect(callArgs.where.status.in).toEqual(
        expect.arrayContaining([
          CycleStatus.REVIEWING,
          CycleStatus.COMPLETED,
          CycleStatus.ARCHIVED,
        ])
      );
      expect(callArgs.orderBy.endDate).toBe('desc');
    });
  });

  // ------------------------------------------------------------------
  // BullMQ repeatable job management
  // ------------------------------------------------------------------
  describe('registerRepeatableJob', () => {
    it('adds a repeatable job with cron + workspace timezone', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(
        makeWorkspace({ timezone: 'America/New_York' })
      );
      mockQueue.add.mockResolvedValue({ id: 'repeat-job-1' });

      await service.registerRepeatableJob('ws-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'weekly-review:ws-1',
        { workspaceId: 'ws-1', triggeredBy: 'scheduler' },
        expect.objectContaining({
          repeat: {
            pattern: WEEKLY_REVIEW_CRON,
            tz: 'America/New_York',
          },
        })
      );
    });

    it('falls back to DEFAULT_TIMEZONE when workspace has no tz', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(
        makeWorkspace({ timezone: '' })
      );
      mockQueue.add.mockResolvedValue({ id: 'repeat-job-2' });

      await service.registerRepeatableJob('ws-1');

      const calls = mockQueue.add.mock.calls as unknown as Array<
        [string, unknown, { repeat: { pattern: string; tz: string } }]
      >;
      const callArgs = calls[0][2];
      expect(callArgs.repeat.tz).toBe(DEFAULT_TIMEZONE);
    });
  });

  describe('unregisterRepeatableJob', () => {
    it('removes the repeatable job using the same cron + tz', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(
        makeWorkspace({ timezone: 'Europe/London' })
      );
      mockQueue.removeRepeatable.mockResolvedValue({});

      await service.unregisterRepeatableJob('ws-1');

      expect(mockQueue.removeRepeatable).toHaveBeenCalledWith(
        'weekly-review:ws-1',
        { pattern: WEEKLY_REVIEW_CRON, tz: 'Europe/London' }
      );
    });
  });

  describe('registerAllWorkspaces', () => {
    it('registers a repeatable job for every workspace', async () => {
      mockPrismaClient.workspace.findMany.mockResolvedValue([
        { id: 'ws-a', name: 'A', timezone: 'Asia/Shanghai' },
        { id: 'ws-b', name: 'B', timezone: 'UTC' },
      ]);
      // registerRepeatableJob internally looks up tz again
      mockPrismaClient.workspace.findUnique
        .mockResolvedValueOnce({ timezone: 'Asia/Shanghai' })
        .mockResolvedValueOnce({ timezone: 'UTC' });
      mockQueue.add.mockResolvedValue({ id: 'r1' });

      await service.registerAllWorkspaces();

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'weekly-review:ws-a',
        expect.anything(),
        expect.objectContaining({
          repeat: { pattern: WEEKLY_REVIEW_CRON, tz: 'Asia/Shanghai' },
        })
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'weekly-review:ws-b',
        expect.anything(),
        expect.objectContaining({
          repeat: { pattern: WEEKLY_REVIEW_CRON, tz: 'UTC' },
        })
      );
    });

    it('continues registering other workspaces when one fails', async () => {
      mockPrismaClient.workspace.findMany.mockResolvedValue([
        { id: 'ws-a', name: 'A', timezone: 'Asia/Shanghai' },
        { id: 'ws-b', name: 'B', timezone: 'UTC' },
      ]);
      // First registration throws (queue.add rejects), second succeeds
      mockPrismaClient.workspace.findUnique
        .mockResolvedValueOnce({ timezone: 'Asia/Shanghai' })
        .mockResolvedValueOnce({ timezone: 'UTC' });
      mockQueue.add
        .mockRejectedValueOnce(new Error('redis error'))
        .mockResolvedValueOnce({ id: 'r2' });

      await service.registerAllWorkspaces();

      // Both were attempted
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });
  });

  // ------------------------------------------------------------------
  // Processor (BullMQ WorkerHost)
  // ------------------------------------------------------------------
  describe('WeeklyReviewProcessor', () => {
    it('delegates to schedulerService.runForWorkspace with job data', async () => {
      const runSpy = jest.spyOn(service, 'runForWorkspace').mockResolvedValue({
        workspaceId: 'ws-1',
        cycleId: 'cycle-1',
        reviewId: 'review-1',
        action: 'created',
        status: ReviewStatus.DRAFT,
      });

      const fakeJob = {
        id: 'job-1',
        name: 'weekly-review:ws-1',
        data: { workspaceId: 'ws-1', triggeredBy: 'scheduler' },
      } as never;

      const result = (await processor.process(fakeJob)) as {
        action: string;
        reviewId: string;
      };

      expect(runSpy).toHaveBeenCalledWith('ws-1', {
        cycleId: undefined,
        triggeredBy: 'scheduler',
      });
      expect(result.action).toBe('created');
      expect(result.reviewId).toBe('review-1');
    });

    it('throws UnrecoverableError when workspaceId is missing', async () => {
      const fakeJob = {
        id: 'job-2',
        name: 'weekly-review:',
        data: {},
      } as never;

      await expect(processor.process(fakeJob)).rejects.toThrow(
        'Missing workspaceId'
      );
    });
  });
});
