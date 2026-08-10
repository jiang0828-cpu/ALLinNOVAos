import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, Max, IsArray, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, WorkItemStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class QueryTaskDto {
  @ApiPropertyOptional({ description: 'Workspace ID (required, from auth)' })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsArray()
  @IsEnum(WorkItemStatus, { each: true })
  status?: WorkItemStatus[];

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by goal ID' })
  @IsOptional()
  @IsString()
  goalId?: string;

  @ApiPropertyOptional({ description: 'Filter by domain ID' })
  @IsOptional()
  @IsString()
  domainId?: string;

  @ApiPropertyOptional({ description: 'Filter by cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({ description: 'Filter by priority' })
  @IsOptional()
  @IsArray()
  @IsEnum(Priority, { each: true })
  priority?: Priority[];

  @ApiPropertyOptional({ description: 'Due date range start (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Due date range end (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: 'dueAt' | 'priority' | 'createdAt' = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
