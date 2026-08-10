import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, SourceType } from '@prisma/client';

export class CreateGoalDto {
  @ApiProperty({ description: 'Goal title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Goal description' })
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

  @ApiPropertyOptional({ enum: Priority, description: 'Goal priority' })
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

  @ApiPropertyOptional({ description: 'Goal metadata (JSON)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // GoalDetail fields
  @ApiPropertyOptional({ description: 'Target value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetValue?: number;

  @ApiPropertyOptional({ description: 'Current value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Progress (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;

  @ApiPropertyOptional({ description: 'Goal weight' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Target date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
