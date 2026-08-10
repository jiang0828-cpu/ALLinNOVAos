import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class GenerateSuggestionsDto {
  @ApiProperty({ description: 'Workspace ID', example: 'workspace-001' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({
    description: 'Current goal description',
    example: 'Q4 product launch',
  })
  @IsString()
  @IsNotEmpty()
  goal: string;

  @ApiProperty({
    description: 'Raw workspace data (will be sanitized)',
    type: Object,
  })
  @IsObject()
  rawData: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Cycle ID', example: 'cycle-001' })
  @IsOptional()
  @IsString()
  cycleId?: string;
}

export class GenerateReviewDto {
  @ApiProperty({ description: 'Workspace ID', example: 'workspace-001' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({
    description: 'Current goal description',
    example: 'Q4 product launch',
  })
  @IsString()
  @IsNotEmpty()
  goal: string;

  @ApiProperty({
    description: 'Raw workspace data (will be sanitized)',
    type: Object,
  })
  @IsObject()
  rawData: Record<string, unknown>;
}

export class GenerateTaskDraftsDto {
  @ApiProperty({ description: 'Workspace ID', example: 'workspace-001' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({
    description: 'Current goal description',
    example: 'Q4 product launch',
  })
  @IsString()
  @IsNotEmpty()
  goal: string;

  @ApiProperty({
    description: 'Raw workspace data (will be sanitized)',
    type: Object,
  })
  @IsObject()
  rawData: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Cycle ID', example: 'cycle-001' })
  @IsOptional()
  @IsString()
  cycleId?: string;
}
