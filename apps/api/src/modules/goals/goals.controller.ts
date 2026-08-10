import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiConsumes, ApiProduces } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { QueryGoalDto } from './dto/goal-query.dto';
import { GoalResponseDto, GoalListResponseDto } from './dto/goal-response.dto';
import { ApiResponse as ApiResponseInterface } from '../../common/interfaces/api-response.interface';

@ApiTags('goals')
@Controller('v1/goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new goal', description: 'Create a new goal with optional goal detail' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Goal created successfully',
    type: GoalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or workspace/domain/cycle validation failed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace, domain, or cycle not found',
  })
  @HttpCode(HttpStatus.CREATED)
  async createGoal(
    @Body() createGoalDto: CreateGoalDto,
  ): Promise<ApiResponseInterface<any>> {
    const goal = await this.goalsService.createGoal(createGoalDto);
    return {
      code: HttpStatus.CREATED,
      message: 'Goal created successfully',
      data: goal,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get goal by ID', description: 'Retrieve a goal by its ID' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Goal found',
    type: GoalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Goal not found',
  })
  async getGoalById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const goal = await this.goalsService.getGoalById(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Goal retrieved successfully',
      data: goal,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List goals', description: 'List goals with optional filters and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Goals retrieved successfully',
    type: GoalListResponseDto,
  })
  async listGoals(@Query() queryDto: QueryGoalDto): Promise<ApiResponseInterface<any>> {
    const result = await this.goalsService.listGoals(queryDto);
    return {
      code: HttpStatus.OK,
      message: 'Goals retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update goal', description: 'Update goal properties and goal detail' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Goal updated successfully',
    type: GoalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Goal not found',
  })
  async updateGoal(
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const goal = await this.goalsService.updateGoal(id, workspaceId, updateGoalDto);
    return {
      code: HttpStatus.OK,
      message: 'Goal updated successfully',
      data: goal,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete goal (soft delete)', description: 'Soft delete a goal by setting deletedAt' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Goal deleted successfully',
    type: GoalResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Goal not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Goal is already deleted',
  })
  async deleteGoal(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseInterface<any>> {
    const goal = await this.goalsService.deleteGoal(id, workspaceId);
    return {
      code: HttpStatus.OK,
      message: 'Goal deleted successfully',
      data: goal,
    };
  }
}
