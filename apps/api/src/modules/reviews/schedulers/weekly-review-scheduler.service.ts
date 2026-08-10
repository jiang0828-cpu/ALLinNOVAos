import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ReviewsService } from '../services/reviews.service';
import {
  PdcaCycle,
  CycleStatus,
  CycleType,
  ReviewStatus,
  ActivityAction,
} from '@prisma/client';
import {
  WEEKLY_REVIEW_QUEUE,
  WEEKLY_REVIEW_JOB_PREFIX,
  WEEKLY_REVIEW_CRON,
  DEFAULT_TIMEZONE,
} from './weekly-review.constants';

/**
 * Shape of a single scheduler run result for one cycle.
 */
export interface SchedulerRunResult {
  workspaceId: string;
  cycleId: string;
  reviewId: string;
  action: 'created' | 'updated' | 'skipped';
  status: ReviewStatus;
}

/**
 * Payload pushed onto the BullMQ queue for each workspace.
 */
export interface WeeklyReviewJobData {
  workspaceId: string;
  /** Optional explicit cycleId (used by manual trigger). */
  cycleId?: string;
  /** Who/what initiated the run. */
  triggeredBy?: string;
}

/**
 * WeeklyReviewSchedulerService
 *
 * Responsibilities:
 *  1. Discover the most recent *completed* WEEKLY PdcaCycle for a workspace.
 *  2. Create a fresh Review draft, OR refresh the existing DRAFT for that cycle
 *     (dedup: never create a second review for the same cycle).
 *  3. Persist an ActivityEvent for every run.
 *  4. NEVER auto-complete the draft (status stays DRAFT until a human confirms).
 *  5. Register / unregister BullMQ repeatable jobs keyed per workspace, using
 *     the workspace's own timezone so "Sunday 20:00" is wall-clock local.
 *  6. Expose a manual trigger entry-point for testing.
 */
@Injectable()
export class WeeklyReviewSchedulerService {
  private readonly logger = new Logger(WeeklyReviewSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
    @InjectQueue(WEEKLY_REVIEW_QUEUE) private readonly queue: Queue
  ) {}

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Run the weekly review generation for a single workspace.
   *
   * - Resolves the workspace's timezone (for log context only here; the actual
   *   tz-based firing is handled by the BullMQ repeatable job registration).
   * - Finds the latest WEEKLY cycle whose endDate is in the past (i.e. the
   *   "last complete week" cycle).
   * - Creates or refreshes a Review draft for that cycle.
   * - Writes an ActivityEvent.
   * - Leaves the draft in DRAFT status (no auto-complete).
   *
   * If `options.cycleId` is provided (manual trigger), that cycle is used
   * directly without the "last complete week" filter.
   */
  async runForWorkspace(
    workspaceId: string,
    options?: { cycleId?: string; triggeredBy?: string }
  ): Promise<SchedulerRunResult> {
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, timezone: true },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    const tz = workspace.timezone || DEFAULT_TIMEZONE;
    const actor = options?.triggeredBy || 'system';

    this.logger.log(
      `Running weekly review for workspace "${workspace.name}" (${workspaceId}) tz=${tz} actor=${actor}`
    );

    const cycle = options?.cycleId
      ? await this.findCycleById(options.cycleId, workspaceId)
      : await this.findLastCompleteWeekCycle(workspaceId);

    if (!cycle) {
      this.logger.warn(
        `No completed WEEKLY cycle found for workspace ${workspaceId}; skipping`
      );
      // Still record an ActivityEvent so operators can see the scheduler ran.
      await this.recordNoOpRun(workspaceId, actor, {
        reason: 'no_completed_weekly_cycle',
      });
      return {
        workspaceId,
        cycleId: '',
        reviewId: '',
        action: 'skipped',
        status: ReviewStatus.DRAFT,
      };
    }

    return this.createOrUpdateDraftForCycle(workspaceId, cycle, actor);
  }

  /**
   * Run the scheduler for *all* active workspaces. Used by the queue processor
   * when no specific workspaceId is supplied, and safe to call manually.
   */
  async runForAllWorkspaces(options?: {
    triggeredBy?: string;
  }): Promise<SchedulerRunResult[]> {
    const workspaces = await this.prisma.client.workspace.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    this.logger.log(
      `Running weekly review for ${workspaces.length} workspace(s)`
    );

    const results: SchedulerRunResult[] = [];
    for (const ws of workspaces) {
      try {
        const result = await this.runForWorkspace(ws.id, {
          triggeredBy: options?.triggeredBy || 'system',
        });
        results.push(result);
      } catch (err) {
        this.logger.error(
          `Failed to run weekly review for workspace ${ws.id}: ${(err as Error).message}`
        );
      }
    }
    return results;
  }

  /**
   * Manual trigger entry-point (requirement #7).
   *
   * Behaves identically to {@link runForWorkspace} but is intended for testing
   * and ad-hoc operator invocation. Returns the resulting SchedulerRunResult.
   */
  async triggerManually(
    workspaceId: string,
    options?: { cycleId?: string; triggeredBy?: string }
  ): Promise<SchedulerRunResult> {
    this.logger.log(
      `Manual trigger: workspace=${workspaceId} cycleId=${options?.cycleId ?? '(auto)'}`
    );
    return this.runForWorkspace(workspaceId, {
      cycleId: options?.cycleId,
      triggeredBy: options?.triggeredBy || 'manual',
    });
  }

  // ------------------------------------------------------------------
  // BullMQ repeatable job management
  // ------------------------------------------------------------------

  /**
   * Register a BullMQ repeatable job for a workspace, firing every Sunday at
   * 20:00 in the workspace's own timezone.
   *
   * The job name encodes the workspaceId so two workspaces with the same tz
   * do not collide in BullMQ's repeat-key namespace.
   *
   * Idempotent: re-registering the same workspace updates the tz if changed.
   */
  async registerRepeatableJob(workspaceId: string): Promise<void> {
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
      select: { timezone: true },
    });
    const tz = workspace?.timezone || DEFAULT_TIMEZONE;

    const jobName = this.jobNameFor(workspaceId);
    const repeat = { pattern: WEEKLY_REVIEW_CRON, tz };

    await this.queue.add(
      jobName,
      { workspaceId, triggeredBy: 'scheduler' } satisfies WeeklyReviewJobData,
      {
        repeat,
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      }
    );

    this.logger.log(
      `Registered repeatable job "${jobName}" (cron=${WEEKLY_REVIEW_CRON}, tz=${tz})`
    );
  }

  /**
   * Remove the repeatable job for a workspace (e.g. on workspace deletion).
   */
  async unregisterRepeatableJob(workspaceId: string): Promise<void> {
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
      select: { timezone: true },
    });
    const tz = workspace?.timezone || DEFAULT_TIMEZONE;

    const jobName = this.jobNameFor(workspaceId);
    await this.queue.removeRepeatable(jobName, {
      pattern: WEEKLY_REVIEW_CRON,
      tz,
    });
    this.logger.log(`Unregistered repeatable job "${jobName}"`);
  }

  /**
   * On application bootstrap, register repeatable jobs for every existing
   * workspace. Safe to call multiple times; BullMQ dedups repeatable jobs by
   * (name + pattern + tz).
   */
  async registerAllWorkspaces(): Promise<void> {
    const workspaces = await this.prisma.client.workspace.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, timezone: true },
    });

    this.logger.log(
      `Registering weekly review repeatable jobs for ${workspaces.length} workspace(s)`
    );

    for (const ws of workspaces) {
      try {
        await this.registerRepeatableJob(ws.id);
      } catch (err) {
        this.logger.error(
          `Failed to register repeatable job for workspace ${ws.id} (${ws.name}): ${(err as Error).message}`
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  /**
   * Find the latest WEEKLY cycle whose endDate is in the past (the "last
   * complete week" cycle). We accept cycles in REVIEWING / COMPLETED /
   * ARCHIVED status since the week is finished.
   */
  private async findLastCompleteWeekCycle(
    workspaceId: string
  ): Promise<PdcaCycle | null> {
    const now = new Date();

    return this.prisma.client.pdcaCycle.findFirst({
      where: {
        workspaceId,
        cycleType: CycleType.WEEKLY,
        deletedAt: null,
        endDate: { lt: now },
        status: {
          in: [
            CycleStatus.REVIEWING,
            CycleStatus.COMPLETED,
            CycleStatus.ARCHIVED,
          ],
        },
      },
      orderBy: { endDate: 'desc' },
    });
  }

  private async findCycleById(
    cycleId: string,
    workspaceId: string
  ): Promise<PdcaCycle | null> {
    return this.prisma.client.pdcaCycle.findFirst({
      where: { id: cycleId, workspaceId, deletedAt: null },
    });
  }

  /**
   * Core create-or-update logic for a single cycle.
   * - Dedup: if any review already exists for this cycle, refresh it (only if
   *   still DRAFT) instead of creating a new one.
   * - Never auto-complete: the resulting review stays in DRAFT.
   */
  private async createOrUpdateDraftForCycle(
    workspaceId: string,
    cycle: PdcaCycle,
    actor: string
  ): Promise<SchedulerRunResult> {
    const cycleId = cycle.id;

    const existing = await this.reviewsService.findDraftForCycle(
      workspaceId,
      cycleId
    );

    if (existing) {
      // Requirement #6: do NOT auto-mark as completed. regenerateDraft only
      // refreshes drafts and leaves completed/published reviews alone.
      const updated = await this.reviewsService.regenerateDraft(
        existing.id,
        workspaceId,
        { reviewedBy: actor }
      );

      if (updated === null) {
        // Existing review is completed/published — nothing to update.
        this.logger.log(
          `Review ${existing.id} for cycle ${cycleId} is not a draft; skipping update`
        );
        return {
          workspaceId,
          cycleId,
          reviewId: existing.id,
          action: 'skipped',
          status: existing.reviewDetail?.status ?? ReviewStatus.DRAFT,
        };
      }

      return {
        workspaceId,
        cycleId,
        reviewId: updated.id,
        action: 'updated',
        status: updated.reviewDetail?.status as ReviewStatus,
      };
    }

    // No existing review — create a fresh draft.
    const created = await this.reviewsService.generateReviewDraft(
      workspaceId,
      cycleId,
      { reviewedBy: actor }
    );

    return {
      workspaceId,
      cycleId,
      reviewId: created.id,
      action: 'created',
      status: created.reviewDetail?.status as ReviewStatus,
    };
  }

  /**
   * Record a "no-op" run as an ActivityEvent on the workspace (no work item).
   * Useful for observability: operators can confirm the scheduler fired even
   * when no cycle was available.
   */
  private async recordNoOpRun(
    workspaceId: string,
    actor: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.prisma.client.activityEvent.create({
        data: {
          workspaceId,
          workItemId: null,
          action: ActivityAction.UPDATE,
          actor,
          metadata: {
            scheduler: 'weekly-review',
            ...metadata,
          },
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to record no-op run for workspace ${workspaceId}: ${(err as Error).message}`
      );
    }
  }

  private jobNameFor(workspaceId: string): string {
    return `${WEEKLY_REVIEW_JOB_PREFIX}${workspaceId}`;
  }
}
