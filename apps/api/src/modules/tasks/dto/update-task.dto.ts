import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, Max, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, WorkItemStatus, SourceType } from '@prisma/client';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Task title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

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

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class StartTaskDto {
  @ApiPropertyOptional({ description: 'Workspace ID for permission check' })
  @IsOptional()
  @IsString()
  workspaceId?: string;
}

export class BlockTaskDto {
  @ApiPropertyOptional({ description: 'Workspace ID for permission check' })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Reason for blocking' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: 'Workspace ID for permission check' })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Completion note' })
  @IsOptional()
  @IsString()
  completionNote?: string;

  @ApiPropertyOptional({ description: 'Actual minutes spent' })
  @IsOptional()
  @IsInt()
  @Min(0)
  actualMinutes?: number;
}

export class CancelTaskDto {
  @ApiPropertyOptional({ description: 'Workspace ID for permission check' })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;
}
