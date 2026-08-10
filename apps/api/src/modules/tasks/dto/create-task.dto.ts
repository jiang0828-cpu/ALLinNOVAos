import { IsString, IsOptional, IsEnum, IsDateString, IsInt, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, SourceType } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Project ID to associate' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Goal ID to support' })
  @IsOptional()
  @IsString()
  goalId?: string;

  @ApiPropertyOptional({ enum: Priority, description: 'Task priority' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Domain ID' })
  @IsOptional()
  @IsString()
  domainId?: string;

  @ApiPropertyOptional({ description: 'PDCA Cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({ description: 'Scheduled start (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;

  @ApiPropertyOptional({ description: 'Scheduled end (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional({ description: 'Estimated minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @ApiPropertyOptional({ description: 'Owner user ID' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ enum: SourceType, description: 'Source type' })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiPropertyOptional({ description: 'External reference' })
  @IsOptional()
  @IsString()
  externalRef?: string;

  @ApiPropertyOptional({ description: 'Created by' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
