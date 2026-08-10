import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReviewType,
  CycleType,
  ReviewStatus,
  InsightType,
  IssueLevel,
  Priority,
} from '@prisma/client';

export class GenerateReviewDraftDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ description: 'PDCA Cycle ID to generate review for' })
  @IsString()
  @IsNotEmpty()
  cycleId: string;

  @ApiPropertyOptional({ description: 'Reviewer user ID' })
  @IsString()
  @IsOptional()
  reviewedBy?: string;
}

export class CreateReviewDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ description: 'Review title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Review description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'PDCA Cycle ID' })
  @IsString()
  @IsOptional()
  cycleId?: string;

  @ApiProperty({ enum: ReviewType, description: 'Review type' })
  @IsEnum(ReviewType)
  reviewType: ReviewType;

  @ApiProperty({ enum: CycleType, description: 'Cycle type' })
  @IsEnum(CycleType)
  cycleType: CycleType;

  @ApiProperty({ description: 'Period label (e.g. 2026-W32)' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiPropertyOptional({ description: 'Review summary' })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ description: 'Reviewer user ID' })
  @IsString()
  @IsOptional()
  reviewedBy?: string;
}

export class QueryReviewsDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({
    enum: ReviewStatus,
    isArray: true,
    description: 'Filter by status',
  })
  @IsEnum(ReviewStatus, { each: true })
  @IsOptional()
  status?: ReviewStatus[];

  @ApiPropertyOptional({
    enum: ReviewType,
    description: 'Filter by review type',
  })
  @IsEnum(ReviewType)
  @IsOptional()
  reviewType?: ReviewType;

  @ApiPropertyOptional({ description: 'Filter by cycle ID' })
  @IsString()
  @IsOptional()
  cycleId?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class UpdateReviewDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Updated title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated summary' })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ description: 'Updated achievements (JSON array)' })
  @IsOptional()
  achievements?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Updated challenges (JSON array)' })
  @IsOptional()
  challenges?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Updated root causes (JSON array)' })
  @IsOptional()
  rootCauses?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Updated lessons learned (JSON array)' })
  @IsOptional()
  lessonsLearned?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Updated next cycle focus (JSON array)' })
  @IsOptional()
  nextCycleFocus?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Score before review' })
  @IsNumber()
  @IsOptional()
  scoreBefore?: number;

  @ApiPropertyOptional({ description: 'Score after review' })
  @IsNumber()
  @IsOptional()
  scoreAfter?: number;

  @ApiPropertyOptional({ description: 'Final review score' })
  @IsNumber()
  @IsOptional()
  score?: number;
}

export class CompleteReviewDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Reviewer user ID' })
  @IsString()
  @IsOptional()
  reviewedBy?: string;
}

export class CreateInsightFromReviewDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ description: 'Insight statement (short summary)' })
  @IsString()
  @IsNotEmpty()
  statement: string;

  @ApiProperty({ description: 'Insight content (detailed description)' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ enum: InsightType, description: 'Insight type' })
  @IsEnum(InsightType)
  insightType: InsightType;

  @ApiPropertyOptional({ description: 'Insight tags', isArray: true })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Confidence score (0-1)' })
  @IsNumber()
  @IsOptional()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Impact score (0-100)' })
  @IsNumber()
  @IsOptional()
  impactScore?: number;

  @ApiPropertyOptional({ description: 'Evidence data' })
  @IsOptional()
  evidence?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Creator user ID' })
  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class CreateDecisionFromReviewDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ description: 'Decision content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Decision rationale' })
  @IsString()
  @IsOptional()
  rationale?: string;

  @ApiPropertyOptional({
    enum: IssueLevel,
    description: 'Decision impact level',
  })
  @IsEnum(IssueLevel)
  @IsOptional()
  impact?: IssueLevel;

  @ApiPropertyOptional({ description: 'Decision title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Creator user ID' })
  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class NextCycleTaskItemDto {
  @ApiProperty({ description: 'Task title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: Priority, description: 'Task priority' })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Estimated minutes' })
  @IsNumber()
  @IsOptional()
  estimatedMinutes?: number;
}

export class CreateNextCycleTaskDraftsDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({
    description: 'Next cycle task drafts',
    isArray: true,
    type: NextCycleTaskItemDto,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NextCycleTaskItemDto)
  tasks: NextCycleTaskItemDto[];

  @ApiPropertyOptional({ description: 'Creator user ID' })
  @IsString()
  @IsOptional()
  createdBy?: string;
}

/**
 * Manually trigger the weekly review scheduler for a workspace (requirement #7).
 * Intended for testing / ad-hoc operator invocation.
 */
export class TriggerWeeklyReviewDto {
  @ApiProperty({ description: 'Workspace ID to run the scheduler for' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({
    description:
      'Optional explicit cycle ID. If omitted, the scheduler picks the latest completed WEEKLY cycle.',
  })
  @IsString()
  @IsOptional()
  cycleId?: string;

  @ApiPropertyOptional({
    description: 'Who/what initiated the manual trigger (for ActivityEvent).',
    default: 'manual',
  })
  @IsString()
  @IsOptional()
  triggeredBy?: string;
}

/**
 * Register or unregister a BullMQ repeatable job for a workspace.
 */
export class WeeklyReviewJobDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;
}
