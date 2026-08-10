import { Module, Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { AiController } from './ai.controller';
import { AiSuggestionAdapterService } from './services/ai-suggestion-adapter.service';
import { AiOutputValidator } from './services/ai-output-validator.service';
import { AiContextSanitizer } from './services/ai-context-sanitizer.service';
import { AiProvider } from './providers/ai-provider.interface';
import { LlmHttpAiProvider } from './providers/llm-http-ai.provider';
import { MockAiProvider } from './providers/mock-ai.provider';

/**
 * Factory that selects the right AiProvider based on config.
 * Falls back to MockAiProvider when no AI_PROVIDER_BASE_URL is set.
 */
function aiProviderFactory(): Provider {
  return {
    provide: AiProvider,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const logger = new Logger('AiProviderFactory');
      const baseUrl = configService.get<string>('AI_PROVIDER_BASE_URL');

      if (!baseUrl) {
        logger.warn(
          'AI_PROVIDER_BASE_URL not configured; using MockAiProvider (deterministic canned responses)'
        );
        return new MockAiProvider();
      }

      logger.log(`Using LlmHttpAiProvider with baseUrl=${baseUrl}`);
      return new LlmHttpAiProvider(configService);
    },
  };
}

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [
    AiSuggestionAdapterService,
    AiOutputValidator,
    AiContextSanitizer,
    aiProviderFactory(),
    MockAiProvider,
  ],
  exports: [
    AiSuggestionAdapterService,
    AiOutputValidator,
    AiContextSanitizer,
    AiProvider,
    MockAiProvider,
  ],
})
export class AiModule {}
