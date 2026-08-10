import { IsOptional, IsString, IsEnum, IsInt, Min, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkItemStatus, Priority } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class QueryProjectDto {
  @ApiPropertyOptional({ description: 'Workspace ID (required)' })
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({ enum: WorkItemStatus, isArray: true, description: 'Filter by statuses' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : value?.split(','))
  @IsEnum(WorkItemStatus, { each: true })
  status?: WorkItemStatus[];

  @ApiPropertyOptional({ description: 'Filter by domain ID' })
  @IsOptional()
  @IsString()
  domainId?: string;

  @ApiPropertyOptional({ description: 'Filter by cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({ enum: Priority, isArray: true, description: 'Filter by priorities' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => Array.isArray(value) ? value : value?.split(','))
  @IsEnum(Priority, { each: true })
  priority?: Priority[];

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
