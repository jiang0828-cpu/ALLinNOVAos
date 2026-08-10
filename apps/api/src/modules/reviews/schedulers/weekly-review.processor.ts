import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import {
  WeeklyReviewSchedulerService,
  WeeklyReviewJobData,
} from './weekly-review-scheduler.service';
import { WEEKLY_REVIEW_QUEUE } from './weekly-review.constants';

/**
 * BullMQ processor for the weekly-review queue.
 *
 * Each repeatable job fires once per week per workspace (registered by
 * WeeklyReviewSchedulerService with the workspace's own timezone). When a job
 * fires, this processor delegates to WeeklyReviewSchedulerService which:
 *   1. Finds the latest completed WEEKLY cycle.
 *   2. Creates or refreshes a Review draft (deduped per cycle).
 *   3. Writes an ActivityEvent.
 *   4. Leaves the draft in DRAFT status (no auto-complete).
 */
@Processor(WEEKLY_REVIEW_QUEUE, {
  // Allow BullMQ to spin up a dedicated worker; concurrency left at default.
  concurrency: 2,
})
export class WeeklyReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(WeeklyReviewProcessor.name);

  constructor(private readonly schedulerService: WeeklyReviewSchedulerService) {
    super();
  }

  async process(job: Job<WeeklyReviewJobData>): Promise<unknown> {
    const { workspaceId, cycleId, triggeredBy } = job.data;

    if (!workspaceId) {
      this.logger.error(
        `Job ${job.id} has no workspaceId in data; marking unrecoverable`
      );
      throw new UnrecoverableError('Missing workspaceId in job data');
    }

    this.logger.log(
      `Processing weekly-review job ${job.id} (name=${job.name}) workspace=${workspaceId} cycleId=${cycleId ?? '(auto)'} triggeredBy=${triggeredBy ?? 'scheduler'}`
    );

    try {
      const result = await this.schedulerService.runForWorkspace(workspaceId, {
        cycleId,
        triggeredBy: triggeredBy || 'scheduler',
      });

      this.logger.log(
        `Job ${job.id} completed: action=${result.action} reviewId=${result.reviewId || '-'} status=${result.status}`
      );

      return result;
    } catch (err) {
      this.logger.error(
        `Job ${job.id} failed for workspace ${workspaceId}: ${(err as Error).message}`,
        (err as Error).stack
      );
      throw err; // BullMQ will retry per its default backoff
    }
  }
}
