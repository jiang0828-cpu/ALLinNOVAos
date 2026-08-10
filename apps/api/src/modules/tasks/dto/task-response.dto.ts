import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, WorkItemStatus, SourceType } from '@prisma/client';

export class TaskDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  dueAt?: Date;

  @ApiPropertyOptional()
  scheduledStartAt?: Date;

  @ApiPropertyOptional()
  scheduledEndAt?: Date;

  @ApiPropertyOptional()
  estimatedMinutes?: number;

  @ApiPropertyOptional()
  actualMinutes?: number;

  @ApiPropertyOptional()
  completionNote?: string;
}

export class TaskResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiPropertyOptional()
  domainId?: string;

  @ApiPropertyOptional()
  cycleId?: string;

  @ApiProperty({ enum: WorkItemStatus })
  status: WorkItemStatus;

  @ApiProperty({ description: 'Task title' })
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ enum: Priority })
  priority?: Priority;

  @ApiPropertyOptional()
  ownerId?: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty({ enum: SourceType })
  sourceType: SourceType;

  @ApiPropertyOptional()
  externalRef?: string;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiPropertyOptional()
  plannedStartAt?: Date;

  @ApiPropertyOptional()
  plannedEndAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;

  @ApiPropertyOptional()
  taskDetail?: TaskDetailResponseDto;
}

export class TaskListResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  data: TaskResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;
}
