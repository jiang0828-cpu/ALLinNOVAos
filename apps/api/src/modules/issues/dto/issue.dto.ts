import { IsString, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GapType, IssueStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateIssueDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  workspaceId: string;

  @ApiProperty({ description: 'Issue title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Issue description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'PDCA Cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({ description: 'Metric name that triggered this issue' })
  @IsOptional()
  @IsString()
  metricName?: string;

  @ApiPropertyOptional({ description: 'Expected value (target)' })
  @IsOptional()
  @IsNumber()
  expectedValue?: number;

  @ApiPropertyOptional({ description: 'Actual value' })
  @IsOptional()
  @IsNumber()
  actualValue?: number;

  @ApiPropertyOptional({ description: 'Gap value (expected - actual)' })
  @IsOptional()
  @IsNumber()
  gapValue?: number;

  @ApiPropertyOptional({ description: 'Severity (high/medium/low)' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ enum: GapType, description: 'Gap type' })
  @IsOptional()
  @IsEnum(GapType)
  gapType?: GapType;
}

export class QueryIssuesDto {
  @ApiPropertyOptional({ description: 'Workspace ID' })
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({ enum: IssueStatus, isArray: true, description: 'Filter by statuses' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : value?.split(','))
  @IsEnum(IssueStatus, { each: true })
  status?: IssueStatus[];

  @ApiPropertyOptional({ description: 'Filter by cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({ description: 'Filter by metric name' })
  @IsOptional()
  @IsString()
  metricName?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}
