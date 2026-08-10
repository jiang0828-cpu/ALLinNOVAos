import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkItemStatus, WorkItemType, PdcaStage, Priority, SourceType } from '@prisma/client';

export class GoalDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  targetValue?: number;

  @ApiPropertyOptional()
  currentValue?: number;

  @ApiPropertyOptional()
  unit?: string;

  @ApiProperty()
  progress: number;

  @ApiPropertyOptional()
  weight?: number;

  @ApiPropertyOptional()
  targetDate?: Date;
}

export class GoalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiPropertyOptional()
  domainId?: string;

  @ApiPropertyOptional()
  cycleId?: string;

  @ApiProperty({ enum: WorkItemType })
  itemType: WorkItemType;

  @ApiProperty({ enum: PdcaStage })
  pdcaStage: PdcaStage;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: WorkItemStatus })
  status: WorkItemStatus;

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
  plannedStartAt?: Date;

  @ApiPropertyOptional()
  plannedEndAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;

  @ApiPropertyOptional()
  goalDetail?: GoalDetailResponseDto;

  @ApiPropertyOptional()
  parent?: { id: string; title: string; itemType: WorkItemType };
}

export class GoalListResponseDto {
  @ApiProperty({ type: [GoalResponseDto] })
  data: GoalResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
