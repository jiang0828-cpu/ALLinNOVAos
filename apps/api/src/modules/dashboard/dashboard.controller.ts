import {
  Controller,
  Get,
  Post,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardQueryService } from './services/dashboard-query.service';
import { DashboardSnapshotService } from './services/dashboard-snapshot.service';
import {
  DashboardOverviewQueryDto,
  DashboardRebuildDto,
} from './dto/dashboard-query.dto';
import {
  DashboardOverviewResponseDto,
  DashboardSnapshotResponseDto,
} from './dto/dashboard-response.dto';
import { ApiResponse as ApiResponseInterface } from '../../common/interfaces/api-response.interface';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly queryService: DashboardQueryService,
    private readonly snapshotService: DashboardSnapshotService
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get dashboard overview',
    description:
      'Real-time aggregated dashboard data including scores, projects, issues, suggestions, reviews, and insights.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard overview',
    type: DashboardOverviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  async getOverview(
    @Query() queryDto: DashboardOverviewQueryDto
  ): Promise<ApiResponseInterface<DashboardOverviewResponseDto>> {
    const refDate = queryDto.date ? new Date(queryDto.date) : undefined;
    const data = await this.queryService.getOverview(
      queryDto.workspaceId,
      refDate
    );
    return {
      code: HttpStatus.OK,
      message: 'Dashboard overview retrieved',
      data,
    };
  }

  @Post('snapshot/rebuild')
  @ApiOperation({
    summary: 'Force rebuild dashboard snapshot',
    description:
      'Rebuilds the DashboardSnapshot for a workspace. Snapshots are rebuildable and never become the source of truth.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Snapshot rebuilt',
    type: DashboardSnapshotResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async rebuildSnapshot(
    @Query() dto: DashboardRebuildDto
  ): Promise<ApiResponseInterface<DashboardSnapshotResponseDto>> {
    const data = await this.snapshotService.rebuild(dto.workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Dashboard snapshot rebuilt',
      data,
    };
  }
}
