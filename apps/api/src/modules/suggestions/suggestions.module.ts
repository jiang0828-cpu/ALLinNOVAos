import { Module } from '@nestjs/common';
import { SuggestionsService } from './services/suggestions.service';
import { SuggestionRuleEngineService } from './services/suggestion-rule-engine.service';
import { SuggestionsController } from './suggestions.controller';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuggestionsController],
  providers: [SuggestionsService, SuggestionRuleEngineService],
  exports: [SuggestionsService, SuggestionRuleEngineService],
})
export class SuggestionsModule {}
