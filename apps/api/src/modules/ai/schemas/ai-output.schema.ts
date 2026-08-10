import {
  IsString,
  IsNumber,
  IsArray,
  IsObject,
  IsOptional,
  IsIn,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Suggestion draft schema
// ---------------------------------------------------------------------------

export class AiSuggestionDraftDto {
  @IsString()
  @Min(5)
  @Max(200)
  title: string;

  @IsString()
  @Min(10)
  @Max(500)
  description: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  impactScore: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  urgencyScore: number;

  @IsString()
  @Min(5)
  @Max(300)
  reason: string;

  @IsObject()
  evidence: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Task draft schema
// ---------------------------------------------------------------------------

export class AiTaskDraftDto {
  @IsString()
  @Min(5)
  @Max(200)
  title: string;

  @IsOptional()
  @IsString()
  @Max(500)
  description?: string;

  @IsIn(['P0', 'P1', 'P2'])
  priority: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(480)
  estimatedMinutes?: number;

  @IsString()
  @Min(5)
  @Max(300)
  reason: string;
}

// ---------------------------------------------------------------------------
// Review draft schema
// ---------------------------------------------------------------------------

export class AiReviewDraftDto {
  @IsString()
  @Min(10)
  @Max(1000)
  summary: string;

  @IsArray()
  @IsString({ each: true })
  achievements: string[];

  @IsArray()
  @IsString({ each: true })
  challenges: string[];

  @IsArray()
  @IsString({ each: true })
  rootCauses: string[];

  @IsArray()
  @IsString({ each: true })
  lessonsLearned: string[];

  @IsArray()
  @IsString({ each: true })
  nextCycleFocus: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  healthScore: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  taskCompletionRate: number;
}

// ---------------------------------------------------------------------------
// Top-level response schema
// ---------------------------------------------------------------------------

export class AiResponseDto {
  @IsString()
  @IsIn(['suggestion', 'review', 'task'])
  artifactType: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiSuggestionDraftDto)
  suggestions?: AiSuggestionDraftDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiTaskDraftDto)
  tasks?: AiTaskDraftDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AiReviewDraftDto)
  review?: AiReviewDraftDto;

  @IsOptional()
  @IsString()
  reasoning?: string;
}
