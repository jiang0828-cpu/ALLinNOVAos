import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { IssuesService } from './issues.service';
import { CreateIssueDto, QueryIssuesDto } from './dto/issue.dto';
import { ApiResponse as ApiResponseInterface } from '../../common/interfaces/api-response.interface';

@ApiTags('issues')
@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new issue', description: 'Create a new issue with optional metric gap details' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Issue created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Duplicate open issue for same metric+gapType' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Workspace not found' })
  @HttpCode(HttpStatus.CREATED)
  async createIssue(
    @Body() dto: CreateIssueDto,
  ): Promise<ApiResponseInterface<any>> {
    const issue = await this.issuesService.createIssue(dto);
    return {
      code: HttpStatus.CREATED,
      message: 'Issue created successfully',
      data: issue,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List issues', description: 'List issues with optional filters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Issues retrieved' })
  async listIssues(
    @Query() query: QueryIssuesDto,
  ): Promise<ApiResponseInterface<any>> {
    const result = await this.issuesService.listIssues(query.workspaceId, {
      status: query.status,
      cycleId: query.cycleId,
      metricName: query.metricName,
      page: query.page,
      limit: query.limit,
    });
    return {
      code: HttpStatus.OK,
      message: 'Issues retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get issue by ID' })
  @ApiParam({ name: 'id', description: 'Issue ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Issue found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Issue not found' })
  async getIssueById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const issue = await this.issuesService.getIssueById(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Issue retrieved successfully',
      data: issue,
    };
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve an issue' })
  @ApiParam({ name: 'id', description: 'Issue ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Issue resolved' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Issue not in OPEN status' })
  async resolveIssue(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const issue = await this.issuesService.resolveIssue(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Issue resolved successfully',
      data: issue,
    };
  }

  @Patch(':id/ignore')
  @ApiOperation({ summary: 'Ignore an issue' })
  @ApiParam({ name: 'id', description: 'Issue ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Issue ignored' })
  async ignoreIssue(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const issue = await this.issuesService.ignoreIssue(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Issue ignored successfully',
      data: issue,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete issue (soft delete)' })
  @ApiParam({ name: 'id', description: 'Issue ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Issue deleted' })
  async deleteIssue(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const issue = await this.issuesService.deleteIssue(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Issue deleted successfully',
      data: issue,
    };
  }
}
