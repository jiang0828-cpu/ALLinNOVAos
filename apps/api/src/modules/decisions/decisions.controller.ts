import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DecisionsService } from './services/decisions.service';
import { CreateDecisionDto, QueryDecisionsDto, UpdateDecisionDto } from './dto/decision.dto';
import { ApiResponse as ApiResponseInterface } from '../../common/interfaces/api-response.interface';
import { WorkItemStatus } from '@prisma/client';

@ApiTags('decisions')
@Controller('decisions')
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new decision' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Decision created' })
  @HttpCode(HttpStatus.CREATED)
  async createDecision(
    @Body() dto: CreateDecisionDto,
  ): Promise<ApiResponseInterface<any>> {
    const decision = await this.decisionsService.createDecision(dto);
    return {
      code: HttpStatus.CREATED,
      message: 'Decision created successfully',
      data: decision,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List decisions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Decisions retrieved' })
  async listDecisions(
    @Query() query: QueryDecisionsDto,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.decisionsService.listDecisions(query.workspaceId, {
      suggestionId: query.suggestionId,
      reviewId: query.reviewId,
      cycleId: query.cycleId,
      page: query.page,
      limit: query.limit,
    });
    return {
      code: HttpStatus.OK,
      message: 'Decisions retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get decision by ID' })
  @ApiParam({ name: 'id', description: 'Decision ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Decision found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Decision not found' })
  async getDecisionById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const decision = await this.decisionsService.getDecisionById(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Decision retrieved successfully',
      data: decision,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a decision' })
  @ApiParam({ name: 'id', description: 'Decision ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Decision updated' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot update completed/cancelled decision' })
  async updateDecision(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateDecisionDto,
  ): Promise<ApiResponseInterface<any>> {
    const decision = await this.decisionsService.updateDecision(id, workspaceId, dto);
    return {
      code: HttpStatus.OK,
      message: 'Decision updated successfully',
      data: decision,
    };
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete a decision' })
  @ApiParam({ name: 'id', description: 'Decision ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Decision completed' })
  async completeDecision(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const decision = await this.decisionsService.completeDecision(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Decision completed',
      data: decision,
    };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a decision' })
  @ApiParam({ name: 'id', description: 'Decision ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Decision cancelled' })
  async cancelDecision(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const decision = await this.decisionsService.cancelDecision(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Decision cancelled',
      data: decision,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a decision' })
  @ApiParam({ name: 'id', description: 'Decision ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Decision deleted' })
  async deleteDecision(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const decision = await this.decisionsService.deleteDecision(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Decision deleted',
      data: decision,
    };
  }
}
