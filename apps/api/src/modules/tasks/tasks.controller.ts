import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth, ApiConsumes, ApiProduces } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto, StartTaskDto, BlockTaskDto, CompleteTaskDto, CancelTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/task-query.dto';
import { TaskResponseDto, TaskListResponseDto } from './dto/task-response.dto';
import { ApiResponse as ApiResponseInterface } from '../../common/interfaces/api-response.interface';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('v1/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({ status: 201, description: 'Task created successfully', type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden - no workspace access' })
  @HttpCode(HttpStatus.CREATED)
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.createTask(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks with filters' })
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully', type: TaskListResponseDto })
  async listTasks(@Query() queryDto: QueryTaskDto) {
    return this.tasksService.listTasks(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Task retrieved successfully', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTask(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.tasksService.getTaskById(id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Task updated successfully', type: TaskResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async updateTask(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(id, workspaceId, updateTaskDto);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start task (TODO -> IN_PROGRESS)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Task started successfully', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'State transition not allowed' })
  async startTask(
    @Param('id') id: string,
    @Body() dto: StartTaskDto,
  ) {
    return this.tasksService.startTask(id, dto.workspaceId ?? '', dto);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block task (TODO/IN_PROGRESS -> BLOCKED)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Task blocked successfully', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'State transition not allowed' })
  async blockTask(
    @Param('id') id: string,
    @Body() dto: BlockTaskDto,
  ) {
    return this.tasksService.blockTask(id, dto.workspaceId ?? '', dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete task (IN_PROGRESS -> DONE)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Task completed successfully', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'State transition not allowed' })
  async completeTask(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.tasksService.completeTask(id, dto.workspaceId ?? '', dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel task (non-terminal -> CANCELLED)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Task cancelled successfully', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'State transition not allowed' })
  async cancelTask(
    @Param('id') id: string,
    @Body() dto: CancelTaskDto,
  ) {
    return this.tasksService.cancelTask(id, dto.workspaceId ?? '', dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Task deleted successfully (soft delete)', type: TaskResponseDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async deleteTask(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.tasksService.deleteTask(id, workspaceId);
  }
}
