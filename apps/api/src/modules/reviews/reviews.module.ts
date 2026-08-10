import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReviewsService } from './services/reviews.service';
import { ReviewAggregatorService } from './services/review-aggregator.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { WeeklyReviewSchedulerService } from './schedulers/weekly-review-scheduler.service';
import { WeeklyReviewProcessor } from './schedulers/weekly-review.processor';
import { WEEKLY_REVIEW_QUEUE } from './schedulers/weekly-review.constants';

@Module({
  imports: [
    PrismaModule,
    // Register the BullMQ queue used by the weekly review scheduler.
    BullModule.registerQueue({
      name: WEEKLY_REVIEW_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    }),
  ],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    ReviewAggregatorService,
    WeeklyReviewSchedulerService,
    WeeklyReviewProcessor,
  ],
  exports: [
    ReviewsService,
    ReviewAggregatorService,
    WeeklyReviewSchedulerService,
  ],
})
export class ReviewsModule implements OnModuleInit {
  private readonly logger = new Logger(ReviewsModule.name);

  constructor(
    private readonly schedulerService: WeeklyReviewSchedulerService
  ) {}

  /**
   * On application startup, register repeatable weekly-review jobs for every
   * existing workspace. BullMQ dedups repeatable jobs by (name + pattern + tz),
   * so re-registering on every boot is safe and idempotent.
   *
   * Note: failures here are logged but never crash module init — the scheduler
   * is best-effort on bootstrap; per-workspace registration can be retried via
   * the manual endpoints exposed in ReviewsController.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.schedulerService.registerAllWorkspaces();
    } catch (err) {
      this.logger.error(
        `Failed to register weekly review repeatable jobs on startup: ${(err as Error).message}`
      );
    }
  }
}
