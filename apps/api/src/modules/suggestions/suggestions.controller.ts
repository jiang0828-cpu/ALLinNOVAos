import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { SuggestionsService } from './services/suggestions.service';
import {
  ExecuteRuleEngineDto,
  CreateSuggestionDto,
  QuerySuggestionsDto,
  AcceptSuggestionDto,
  CreateAdjustmentTaskDto,
} from './dto/suggestion.dto';
import { ApiResponse as ApiResponseInterface } from '../../common/interfaces/api-response.interface';

@ApiTags('suggestions')
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post('rule-engine/execute')
  @ApiOperation({ summary: 'Execute suggestion rule engine', description: 'Run all rules and create suggestions for detected signals' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rule engine execution completed' })
  async executeRuleEngine(
    @Body() dto: ExecuteRuleEngineDto,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.suggestionsService.executeRuleEngine(dto.workspaceId, dto.cycleId);
    return {
      code: HttpStatus.OK,
      message: `Rule engine executed: ${result.created} created, ${result.skipped} skipped`,
      data: result,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new suggestion manually' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Suggestion created' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Duplicate suggestion for same dedup key' })
  @HttpCode(HttpStatus.CREATED)
  async createSuggestion(
    @Body() dto: CreateSuggestionDto,
  ): Promise<ApiResponseInterface<any>> {
    const suggestion = await this.suggestionsService.createSuggestion(dto);
    return {
      code: HttpStatus.CREATED,
      message: 'Suggestion created successfully',
      data: suggestion,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List suggestions with optional filters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Suggestions retrieved' })
  async listSuggestions(
    @Query() query: QuerySuggestionsDto,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.suggestionsService.listSuggestions(query.workspaceId, {
      status: query.status,
      sourceType: query.sourceType,
      suggestionType: query.suggestionType,
      cycleId: query.cycleId,
      page: query.page,
      limit: query.limit,
    });
    return {
      code: HttpStatus.OK,
      message: 'Suggestions retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get suggestion by ID' })
  @ApiParam({ name: 'id', description: 'Suggestion ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Suggestion found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Suggestion not found' })
  async getSuggestionById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const suggestion = await this.suggestionsService.getSuggestionById(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Suggestion retrieved successfully',
      data: suggestion,
    };
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept suggestion -> creates a Decision' })
  @ApiParam({ name: 'id', description: 'Suggestion ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Suggestion accepted, Decision created' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Suggestion not in acceptable state' })
  async acceptSuggestion(
    @Param('id') id: string,
    @Body() dto: AcceptSuggestionDto,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.suggestionsService.acceptSuggestion(id, dto.workspaceId, {
      content: dto.content,
      rationale: dto.rationale,
      impact: dto.impact,
    });
    return {
      code: HttpStatus.OK,
      message: 'Suggestion accepted and Decision created',
      data: result,
    };
  }

  @Patch(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss a suggestion' })
  @ApiParam({ name: 'id', description: 'Suggestion ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Suggestion dismissed' })
  async dismissSuggestion(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.suggestionsService.dismissSuggestion(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Suggestion dismissed',
      data: result,
    };
  }

  @Patch(':id/defer')
  @ApiOperation({ summary: 'Defer a suggestion' })
  @ApiParam({ name: 'id', description: 'Suggestion ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Suggestion deferred' })
  async deferSuggestion(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.suggestionsService.deferSuggestion(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Suggestion deferred',
      data: result,
    };
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate a deferred suggestion' })
  @ApiParam({ name: 'id', description: 'Suggestion ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Suggestion reactivated' })
  async reactivateSuggestion(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.suggestionsService.reactivateSuggestion(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Suggestion reactivated',
      data: result,
    };
  }

  @Post(':id/create-adjustment-task')
  @ApiOperation({ summary: 'Create an adjustment task from an accepted suggestion' })
  @ApiParam({ name: 'id', description: 'Suggestion ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Adjustment task created' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Suggestion not accepted' })
  @HttpCode(HttpStatus.CREATED)
  async createAdjustmentTask(
    @Param('id') id: string,
    @Body() dto: CreateAdjustmentTaskDto,
  ): Promise<ApiResponseInterface<any>> {
    const task = await this.suggestionsService.createAdjustmentTaskFromSuggestion(id, dto.workspaceId, {
      title: dto.title,
      description: dto.description,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      priority: dto.priority,
    });
    return {
      code: HttpStatus.CREATED,
      message: 'Adjustment task created from suggestion',
      data: task,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a suggestion' })
  @ApiParam({ name: 'id', description: 'Suggestion ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Suggestion deleted' })
  async deleteSuggestion(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const suggestion = await this.suggestionsService.deleteSuggestion(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Suggestion deleted',
      data: suggestion,
    };
  }
}
