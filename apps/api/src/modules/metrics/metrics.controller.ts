import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './services/metrics.service';
import {
  CalculateMetricDto,
  CalculateAllMetricsDto,
  QueryMetricsDto,
  QueryMetricValuesDto,
  QueryGapsDto,
} from './dto/metric.dto';
import { ApiResponse as ApiResponseInterface } from '../../common/interfaces/api-response.interface';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate and save a single metric' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Metric calculated and saved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Metric not found' })
  @HttpCode(HttpStatus.CREATED)
  async calculateMetric(
    @Body() dto: CalculateMetricDto,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.metricsService.calculateAndSaveMetric(
      dto.workspaceId,
      dto.metricName,
      dto.cycleId,
    );
    return {
      code: HttpStatus.CREATED,
      message: 'Metric calculated and saved',
      data: result,
    };
  }

  @Post('calculate-all')
  @ApiOperation({ summary: 'Calculate and save all active metrics' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'All metrics calculated and saved' })
  @HttpCode(HttpStatus.CREATED)
  async calculateAllMetrics(
    @Body() dto: CalculateAllMetricsDto,
  ): Promise<ApiResponseInterface<any>> {
    const results = await this.metricsService.calculateAndSaveAllMetrics(
      dto.workspaceId,
      dto.cycleId,
    );
    return {
      code: HttpStatus.CREATED,
      message: 'All metrics calculated and saved',
      data: {
        count: results.length,
        results,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'List metrics for a workspace' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Metrics retrieved' })
  async listMetrics(
    @Query() query: QueryMetricsDto,
  ): Promise<ApiResponseInterface<any>> {
    const metrics = await this.metricsService.listMetrics(
      query.workspaceId,
      { isActive: query.isActive },
    );
    return {
      code: HttpStatus.OK,
      message: 'Metrics retrieved successfully',
      data: metrics,
    };
  }

  @Get(':id/values')
  @ApiOperation({ summary: 'Get historical values for a metric' })
  @ApiParam({ name: 'id', description: 'Metric ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Metric values retrieved' })
  async getMetricValues(
    @Param('id') metricId: string,
    @Query() query: QueryMetricValuesDto,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.metricsService.getMetricValues(
      query.workspaceId,
      metricId,
      { page: query.page, limit: query.limit, cycleId: query.cycleId },
    );
    return {
      code: HttpStatus.OK,
      message: 'Metric values retrieved successfully',
      data: result,
    };
  }

  @Get('gaps')
  @ApiOperation({ summary: 'List metric gaps for a workspace' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Gaps retrieved' })
  async listGaps(
    @Query() query: QueryGapsDto,
  ): Promise<ApiResponseInterface<any>> {
    const gaps = await this.metricsService.listGaps(
      query.workspaceId,
      { isOpen: query.isOpen, metricId: query.metricId, cycleId: query.cycleId },
    );
    return {
      code: HttpStatus.OK,
      message: 'Gaps retrieved successfully',
      data: gaps,
    };
  }
}
