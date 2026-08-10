import { Injectable, Logger } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AiResponseDto } from '../schemas/ai-output.schema';
import type { AiResponse } from '../providers/ai-provider.interface';

/**
 * AiOutputValidator
 *
 * Validates AI JSON output against class-validator schemas.
 * Validation failures are logged and the response is rejected —
 * no business data is written.
 */
@Injectable()
export class AiOutputValidator {
  private readonly logger = new Logger(AiOutputValidator.name);

  parseAndValidate(raw: string): AiResponse | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.warn('AI output is not valid JSON; rejecting');
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      this.logger.warn('AI output is not a JSON object; rejecting');
      return null;
    }

    const instance = plainToInstance(AiResponseDto, parsed, {
      enableImplicitConversion: true,
    });

    const errors = validateSync(instance as object, {
      skipMissingProperties: false,
      forbidUnknownValues: true,
      whitelist: true,
    });

    if (errors.length > 0) {
      const messages = errors
        .map((e) =>
          Object.values(
            (e as { constraints?: Record<string, string> }).constraints ?? {}
          )
        )
        .flat();
      this.logger.warn(`AI output validation failed: ${messages.join('; ')}`);
      return null;
    }

    const typed = instance as unknown as AiResponse;

    if (typed.artifactType === 'suggestion' && !typed.suggestions?.length) {
      this.logger.warn('AI output: suggestion artifact has no items');
      return null;
    }
    if (typed.artifactType === 'task' && !typed.tasks?.length) {
      this.logger.warn('AI output: task artifact has no items');
      return null;
    }
    if (typed.artifactType === 'review' && !typed.review) {
      this.logger.warn('AI output: review artifact missing review object');
      return null;
    }

    return typed;
  }
}
