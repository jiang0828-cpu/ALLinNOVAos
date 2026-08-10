import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { IssueLevel } from '@prisma/client';

export class CreateDecisionDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ description: 'Decision title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Decision description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'PDCA Cycle ID' })
  @IsString()
  @IsOptional()
  cycleId?: string;

  @ApiProperty({ description: 'Decision content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Source suggestion ID' })
  @IsString()
  @IsOptional()
  suggestionId?: string;

  @ApiPropertyOptional({ description: 'Source review ID' })
  @IsString()
  @IsOptional()
  reviewId?: string;

  @ApiPropertyOptional({ description: 'Decision rationale' })
  @IsString()
  @IsOptional()
  rationale?: string;

  @ApiPropertyOptional({ enum: IssueLevel, description: 'Decision impact level' })
  @IsOptional()
  impact?: IssueLevel;
}

export class QueryDecisionsDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Filter by suggestion ID' })
  @IsString()
  @IsOptional()
  suggestionId?: string;

  @ApiPropertyOptional({ description: 'Filter by review ID' })
  @IsString()
  @IsOptional()
  reviewId?: string;

  @ApiPropertyOptional({ description: 'Filter by cycle ID' })
  @IsString()
  @IsOptional()
  cycleId?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  limit?: number;
}

export class UpdateDecisionDto {
  @ApiPropertyOptional({ description: 'Updated title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated content' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Updated rationale' })
  @IsString()
  @IsOptional()
  rationale?: string;

  @ApiPropertyOptional({ enum: IssueLevel, description: 'Updated impact level' })
  @IsOptional()
  impact?: IssueLevel;
}
