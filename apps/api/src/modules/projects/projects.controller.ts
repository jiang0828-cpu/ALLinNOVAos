import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiConsumes, ApiProduces } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/project-query.dto';
import { ProjectResponseDto, ProjectListResponseDto, ProjectDetailResponseFullDto } from './dto/project-response.dto';
import { ApiResponse as ApiResponseInterface } from '../../common/interfaces/api-response.interface';

@ApiTags('projects')
@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ApiResponseInterface<any>> {
    const project = await this.projectsService.createProject(createProjectDto);
    return {
      code: HttpStatus.CREATED,
      message: 'Project created successfully',
      data: project,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List projects' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Projects retrieved successfully',
    type: ProjectListResponseDto,
  })
  async listProjects(@Query() queryDto: QueryProjectDto): Promise<ApiResponseInterface<any>> {
    const result = await this.projectsService.listProjects(queryDto);
    return {
      code: HttpStatus.OK,
      message: 'Projects retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project detail by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project detail retrieved successfully',
    type: ProjectDetailResponseFullDto,
  })
  async getProjectDetail(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const project = await this.projectsService.getProjectDetail(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Project detail retrieved successfully',
      data: project,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  async updateProject(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const project = await this.projectsService.updateProject(id, workspaceId, updateProjectDto);
    return {
      code: HttpStatus.OK,
      message: 'Project updated successfully',
      data: project,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project (soft delete)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project deleted successfully',
  })
  async deleteProject(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const project = await this.projectsService.deleteProject(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Project deleted successfully',
      data: project,
    };
  }
}
