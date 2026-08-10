import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, SourceType, HealthStatus } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Workspace ID' })
  @IsString()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Domain ID' })
  @IsOptional()
  @IsString()
  domainId?: string;

  @ApiPropertyOptional({ description: 'PDCA Cycle ID' })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({ enum: Priority, description: 'Project priority' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Owner user ID' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Creator identifier' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ enum: SourceType, description: 'Source type' })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiPropertyOptional({ description: 'External reference' })
  @IsOptional()
  @IsString()
  externalRef?: string;

  @ApiPropertyOptional({ description: 'Planned start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  plannedStartAt?: string;

  @ApiPropertyOptional({ description: 'Planned end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  plannedEndAt?: string;

  @ApiPropertyOptional({ description: 'Project metadata (JSON)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // ProjectDetail fields
  @ApiPropertyOptional({ description: 'Project progress (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;

  @ApiPropertyOptional({ enum: HealthStatus, description: 'Project health status' })
  @IsOptional()
  @IsEnum(HealthStatus)
  healthStatus?: HealthStatus;

  @ApiPropertyOptional({ description: 'Project budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Actual cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCost?: number;
}
