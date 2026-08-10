import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

/**
 * Query DTO for GET /dashboard/overview
 */
export class DashboardOverviewQueryDto {
  @ApiProperty({
    description: 'Workspace ID',
    example: 'workspace-001',
  })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({
    description: 'Reference date (YYYY-MM-DD). Defaults to today.',
    example: '2026-08-07',
  })
  @IsDateString()
  @IsOptional()
  date?: string;
}

export class DashboardRebuildDto {
  @ApiProperty({
    description: 'Workspace ID',
    example: 'workspace-001',
  })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;
}

export class DashboardQueryDto {
  @ApiProperty({
    description: 'Workspace ID',
    example: 'workspace-001',
  })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({
    description: 'Reference date (YYYY-MM-DD). Defaults to today.',
    example: '2026-08-07',
  })
  @IsDateString()
  @IsOptional()
  date?: string;
}
