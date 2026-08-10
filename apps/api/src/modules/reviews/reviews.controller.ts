import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ReviewsService } from './services/reviews.service';
import {
  GenerateReviewDraftDto,
  CreateReviewDto,
  QueryReviewsDto,
  UpdateReviewDto,
  CompleteReviewDto,
  CreateInsightFromReviewDto,
  CreateDecisionFromReviewDto,
  CreateNextCycleTaskDraftsDto,
  TriggerWeeklyReviewDto,
  WeeklyReviewJobDto,
} from './dto/review.dto';
import { WeeklyReviewSchedulerService } from './schedulers/weekly-review-scheduler.service';
import { ApiResponse as ApiResponseInterface } from '../../common/interfaces/api-response.interface';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly schedulerService: WeeklyReviewSchedulerService
  ) {}

  @Post('generate-draft')
  @ApiOperation({
    summary: 'Generate review draft from cycle',
    description:
      'Auto-aggregates task completion, project progress, metrics, issues, suggestions',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review draft generated',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Review already exists for cycle',
  })
  @HttpCode(HttpStatus.CREATED)
  async generateReviewDraft(
    @Body() dto: GenerateReviewDraftDto
  ): Promise<ApiResponseInterface<unknown>> {
    const review = await this.reviewsService.generateReviewDraft(
      dto.workspaceId,
      dto.cycleId,
      {
        reviewedBy: dto.reviewedBy,
      }
    );
    return {
      code: HttpStatus.CREATED,
      message: 'Review draft generated successfully',
      data: review,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a review manually' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Review created' })
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Body() dto: CreateReviewDto
  ): Promise<ApiResponseInterface<unknown>> {
    const review = await this.reviewsService.createReview(dto);
    return {
      code: HttpStatus.CREATED,
      message: 'Review created successfully',
      data: review,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List reviews with filters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reviews retrieved' })
  async listReviews(
    @Query() query: QueryReviewsDto
  ): Promise<ApiResponseInterface<unknown>> {
    const result = await this.reviewsService.listReviews(query.workspaceId, {
      status: query.status,
      reviewType: query.reviewType,
      cycleId: query.cycleId,
      page: query.page,
      limit: query.limit,
    });
    return {
      code: HttpStatus.OK,
      message: 'Reviews retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID with aggregated data' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review found' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found',
  })
  async getReviewById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string
  ): Promise<ApiResponseInterface<unknown>> {
    const review = await this.reviewsService.getReviewById(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Review retrieved successfully',
      data: review,
    };
  }

  @Get(':id/aggregated-data')
  @ApiOperation({ summary: 'Get aggregated data for a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Aggregated data retrieved',
  })
  async getAggregatedData(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string
  ): Promise<ApiResponseInterface<unknown>> {
    const data = await this.reviewsService.getAggregatedData(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Aggregated data retrieved successfully',
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update review content',
    description: 'User can edit auto-generated content',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review updated' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update completed review',
  })
  async updateReview(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto
  ): Promise<ApiResponseInterface<unknown>> {
    const review = await this.reviewsService.updateReview(
      id,
      dto.workspaceId,
      dto
    );
    return {
      code: HttpStatus.OK,
      message: 'Review updated successfully',
      data: review,
    };
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Complete review (user confirmed)',
    description: 'Status changes from DRAFT to COMPLETED',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review completed' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Review not in DRAFT status',
  })
  async completeReview(
    @Param('id') id: string,
    @Body() dto: CompleteReviewDto
  ): Promise<ApiResponseInterface<unknown>> {
    const review = await this.reviewsService.completeReview(
      id,
      dto.workspaceId,
      {
        reviewedBy: dto.reviewedBy,
      }
    );
    return {
      code: HttpStatus.OK,
      message: 'Review completed successfully',
      data: review,
    };
  }

  @Post(':id/insights')
  @ApiOperation({
    summary: 'Create an Insight from a Review',
    description: 'Establishes Review PRODUCES Insight relation',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Insight created' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Review not completed',
  })
  @HttpCode(HttpStatus.CREATED)
  async createInsightFromReview(
    @Param('id') id: string,
    @Body() dto: CreateInsightFromReviewDto
  ): Promise<ApiResponseInterface<unknown>> {
    const insight = await this.reviewsService.createInsightFromReview(
      id,
      dto.workspaceId,
      {
        statement: dto.statement,
        content: dto.content,
        insightType: dto.insightType,
        tags: dto.tags,
        confidence: dto.confidence,
        impactScore: dto.impactScore,
        evidence: dto.evidence,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        createdBy: dto.createdBy,
      }
    );
    return {
      code: HttpStatus.CREATED,
      message: 'Insight created from review',
      data: insight,
    };
  }

  @Post(':id/decisions')
  @ApiOperation({
    summary: 'Create a Decision from a Review',
    description: 'Establishes Review PRODUCES Decision relation',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Decision created' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Review not completed',
  })
  @HttpCode(HttpStatus.CREATED)
  async createDecisionFromReview(
    @Param('id') id: string,
    @Body() dto: CreateDecisionFromReviewDto
  ): Promise<ApiResponseInterface<unknown>> {
    const decision = await this.reviewsService.createDecisionFromReview(
      id,
      dto.workspaceId,
      {
        content: dto.content,
        rationale: dto.rationale,
        impact: dto.impact,
        title: dto.title,
        createdBy: dto.createdBy,
      }
    );
    return {
      code: HttpStatus.CREATED,
      message: 'Decision created from review',
      data: decision,
    };
  }

  @Post(':id/next-cycle-tasks')
  @ApiOperation({
    summary: 'Create next cycle task drafts from a completed Review',
    description:
      'Creates a Decision and bundle of task drafts. Establishes Decision ADJUSTS Task relations',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Next cycle task drafts created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Review not completed',
  })
  @HttpCode(HttpStatus.CREATED)
  async createNextCycleTaskDrafts(
    @Param('id') id: string,
    @Body() dto: CreateNextCycleTaskDraftsDto
  ): Promise<ApiResponseInterface<unknown>> {
    const result = await this.reviewsService.createNextCycleTaskDrafts(
      id,
      dto.workspaceId,
      dto.tasks,
      { createdBy: dto.createdBy }
    );
    return {
      code: HttpStatus.CREATED,
      message: `Created ${result.tasks.length} next cycle task drafts`,
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Review deleted' })
  async deleteReview(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string
  ): Promise<ApiResponseInterface<unknown>> {
    const review = await this.reviewsService.deleteReview(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Review deleted',
      data: review,
    };
  }

  // ==================================================================
  // Weekly Review Scheduler endpoints (manual trigger / job management)
  // ==================================================================

  @Post('scheduler/trigger')
  @ApiOperation({
    summary: 'Manually trigger the weekly review scheduler for a workspace',
    description:
      'Runs the scheduler synchronously: finds the latest completed WEEKLY cycle and creates or updates a DRAFT review. Intended for testing / ad-hoc operator invocation. The resulting draft is NOT auto-completed.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduler run result (created / updated / skipped)',
  })
  @HttpCode(HttpStatus.OK)
  async triggerWeeklyReview(
    @Body() dto: TriggerWeeklyReviewDto
  ): Promise<ApiResponseInterface<unknown>> {
    const result = await this.schedulerService.triggerManually(
      dto.workspaceId,
      {
        cycleId: dto.cycleId,
        triggeredBy: dto.triggeredBy || 'manual',
      }
    );
    return {
      code: HttpStatus.OK,
      message: `Weekly review ${result.action} (reviewId=${result.reviewId || '-'})`,
      data: result,
    };
  }

  @Post('scheduler/register')
  @ApiOperation({
    summary: 'Register a BullMQ repeatable weekly-review job for a workspace',
    description:
      'Schedules a repeatable job firing every Sunday at 20:00 in the workspace timezone. Idempotent: re-registering updates the tz if changed.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Repeatable job registered',
  })
  @HttpCode(HttpStatus.CREATED)
  async registerWeeklyJob(
    @Body() dto: WeeklyReviewJobDto
  ): Promise<ApiResponseInterface<unknown>> {
    await this.schedulerService.registerRepeatableJob(dto.workspaceId);
    return {
      code: HttpStatus.CREATED,
      message: 'Weekly review repeatable job registered',
      data: { workspaceId: dto.workspaceId, registered: true },
    };
  }

  @Delete('scheduler/register')
  @ApiOperation({
    summary:
      'Unregister the BullMQ repeatable weekly-review job for a workspace',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Repeatable job unregistered',
  })
  async unregisterWeeklyJob(
    @Body() dto: WeeklyReviewJobDto
  ): Promise<ApiResponseInterface<unknown>> {
    await this.schedulerService.unregisterRepeatableJob(dto.workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Weekly review repeatable job unregistered',
      data: { workspaceId: dto.workspaceId, registered: false },
    };
  }
}
