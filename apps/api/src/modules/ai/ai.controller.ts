import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiSuggestionAdapterService } from './services/ai-suggestion-adapter.service';
import {
  GenerateSuggestionsDto,
  GenerateReviewDto,
  GenerateTaskDraftsDto,
} from './dto/ai-generate.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly adapter: AiSuggestionAdapterService) {}

  @Post('generate/suggestions')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Generate AI-powered suggestion drafts',
    description:
      'Sends sanitized workspace data to the configured AI provider and returns validated suggestion drafts. ' +
      'Suggestions are created with status PENDING — user confirmation is required before any action is taken.',
  })
  @ApiResponse({
    status: 201,
    description: 'Suggestion drafts created successfully',
  })
  async generateSuggestions(@Body() dto: GenerateSuggestionsDto) {
    return this.adapter.generateSuggestions(dto);
  }

  @Post('generate/review')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Generate AI review draft',
    description:
      'Sends sanitized workspace data to the configured AI provider and returns a review draft. ' +
      'The review draft is NOT persisted as a real review — it must be confirmed by the user first.',
  })
  @ApiResponse({
    status: 200,
    description: 'Review draft generated',
  })
  async generateReview(@Body() dto: GenerateReviewDto) {
    return this.adapter.generateReviewDraft(dto);
  }

  @Post('generate/tasks')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Generate AI-powered task drafts',
    description:
      'Sends sanitized workspace data to the configured AI provider and returns validated task drafts. ' +
      'Task drafts are created with status TODO and sourceType AI — user confirmation is required before they become real tasks.',
  })
  @ApiResponse({
    status: 201,
    description: 'Task drafts created successfully',
  })
  async generateTaskDrafts(@Body() dto: GenerateTaskDraftsDto) {
    return this.adapter.generateTaskDrafts(dto);
  }
}
