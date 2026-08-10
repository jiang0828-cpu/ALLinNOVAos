import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkItemStatus, PdcaStage, Priority, SourceType, WorkItemType, HealthStatus } from '@prisma/client';

export class ProjectDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  progress: number;

  @ApiProperty({ enum: HealthStatus })
  healthStatus: HealthStatus;

  @ApiPropertyOptional()
  budget?: number;

  @ApiPropertyOptional()
  actualCost?: number;
}

export class ProjectResponseDto {
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
  projectDetail?: ProjectDetailResponseDto;

  @ApiPropertyOptional()
  parent?: { id: string; title: string; itemType: WorkItemType };
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  data: ProjectResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class ProjectDetailResponseFullDto extends ProjectResponseDto {
  @ApiPropertyOptional({
    type: 'array',
    description: 'Tasks belonging to this project',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string' },
        priority: { type: 'string' },
      },
    },
  })
  tasks?: Array<{ id: string; title: string; status: string; priority?: string }>;

  @ApiPropertyOptional({
    type: 'array',
    description: 'Issues related to this project',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        level: { type: 'string' },
        status: { type: 'string' },
      },
    },
  })
  issues?: Array<{ id: string; title: string; level: string; status: string }>;
}
