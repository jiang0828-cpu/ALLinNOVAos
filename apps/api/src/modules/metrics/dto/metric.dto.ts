import { IsString, IsOptional, IsEnum, IsNumber, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GapType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CalculateMetricDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  workspaceId: string;

  @ApiProperty({ description: 'Metric name (e.g., content_planning_progress)' })
  @IsString()
  metricName: string;

  @ApiPropertyOptional({ description: 'PDCA Cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;
}

export class CalculateAllMetricsDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'PDCA Cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;
}

export class QueryMetricsDto {
  @ApiPropertyOptional({ description: 'Workspace ID' })
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  isActive?: boolean;
}

export class QueryMetricValuesDto {
  @ApiPropertyOptional({ description: 'Workspace ID' })
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Filter by cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 50;
}

export class QueryGapsDto {
  @ApiPropertyOptional({ description: 'Workspace ID' })
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Filter by open status' })
  @IsOptional()
  isOpen?: boolean;

  @ApiPropertyOptional({ description: 'Filter by metric ID' })
  @IsOptional()
  @IsString()
  metricId?: string;

  @ApiPropertyOptional({ description: 'Filter by cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;
}
