import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import { SuggestionType, SuggestionSourceType, SuggestionStatus, Priority } from '@prisma/client';

export class ExecuteRuleEngineDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'PDCA Cycle ID' })
  @IsString()
  @IsOptional()
  cycleId?: string;
}

export class CreateSuggestionDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ description: 'Suggestion title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Suggestion description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'PDCA Cycle ID' })
  @IsString()
  @IsOptional()
  cycleId?: string;

  @ApiProperty({ enum: SuggestionType, description: 'Suggestion type' })
  @IsEnum(SuggestionType)
  suggestionType: SuggestionType;

  @ApiProperty({ enum: SuggestionSourceType, description: 'Source type' })
  @IsEnum(SuggestionSourceType)
  sourceType: SuggestionSourceType;

  @ApiProperty({ description: 'Source reference ID (Issue ID, MetricGap ID, Task ID, Project ID)' })
  @IsString()
  @IsNotEmpty()
  sourceRefId: string;

  @ApiPropertyOptional({ description: 'Confidence score (0-1)' })
  @IsNumber()
  @IsOptional()
  confidence?: number;

  @ApiPropertyOptional({ description: 'Impact score (0-100)' })
  @IsNumber()
  @IsOptional()
  impactScore?: number;

  @ApiPropertyOptional({ description: 'Urgency score (0-100)' })
  @IsNumber()
  @IsOptional()
  urgencyScore?: number;

  @ApiPropertyOptional({ description: 'Reason for the suggestion' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Evidence data' })
  @IsOptional()
  evidence?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Deduplication key' })
  @IsString()
  @IsOptional()
  dedupKey?: string;
}

export class QuerySuggestionsDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ enum: SuggestionStatus, isArray: true, description: 'Filter by status' })
  @IsEnum(SuggestionStatus, { each: true })
  @IsOptional()
  status?: SuggestionStatus[];

  @ApiPropertyOptional({ enum: SuggestionSourceType, description: 'Filter by source type' })
  @IsEnum(SuggestionSourceType)
  @IsOptional()
  sourceType?: SuggestionSourceType;

  @ApiPropertyOptional({ enum: SuggestionType, description: 'Filter by suggestion type' })
  @IsEnum(SuggestionType)
  @IsOptional()
  suggestionType?: SuggestionType;

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

export class AcceptSuggestionDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Decision content' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Decision rationale' })
  @IsString()
  @IsOptional()
  rationale?: string;

  @ApiPropertyOptional({ enum: ['HIGH', 'MEDIUM', 'LOW'], description: 'Decision impact' })
  @IsOptional()
  impact?: string;
}

export class CreateAdjustmentTaskDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Task title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @ApiPropertyOptional({ enum: Priority, description: 'Task priority' })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;
}
