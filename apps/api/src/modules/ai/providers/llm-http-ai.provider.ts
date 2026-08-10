import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  AiPromptContext,
  AiGenerateOptions,
} from './ai-provider.interface';

/**
 * LlmHttpAiProvider
 *
 * Generic HTTP-based AI provider that can talk to any endpoint
 * implementing a chat-completions style API (OpenAI, Anthropic,
 * Ollama, vLLM, Alibaba DashScope, etc.).
 *
 * Configuration via environment variables:
 *   AI_PROVIDER_BASE_URL       → e.g. https://api.openai.com
 *   AI_PROVIDER_API_KEY        → API key (or omit for local Ollama)
 *   AI_PROVIDER_MODEL          → model name (default: "gpt-4o-mini")
 *   AI_PROVIDER_PATH           → path suffix (default: "/v1/chat/completions")
 *
 * Design rules:
 * - No vendor-specific SDKs. Uses only fetch().
 * - Supports any endpoint that accepts { model, messages, temperature }.
 */
@Injectable()
export class LlmHttpAiProvider extends AiProvider {
  readonly name = 'llm-http';

  private readonly logger = new Logger(LlmHttpAiProvider.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async generateRaw(
    context: AiPromptContext,
    options: AiGenerateOptions = {}
  ): Promise<string> {
    const baseUrl = (
      this.configService.get<string>('AI_PROVIDER_BASE_URL') ?? ''
    ).replace(/\/+$/, '');
    const apiKey = this.configService.get<string>('AI_PROVIDER_API_KEY') ?? '';
    const model =
      this.configService.get<string>('AI_PROVIDER_MODEL') ?? 'gpt-4o-mini';
    const path =
      this.configService.get<string>('AI_PROVIDER_PATH') ??
      '/v1/chat/completions';
    const url = `${baseUrl}${path}`;

    const messages = this.buildMessages(context);

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2000,
      response_format: { type: 'json_object' },
    };

    const timeoutMs = options.timeoutMs ?? 30_000;

    this.logger.debug(
      `Calling LLM endpoint: ${url} model=${model} timeout=${timeoutMs}ms`
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.logger.error(
          `LLM request failed: status=${response.status} body=${errorBody}`
        );
        throw new Error(`LLM request failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };

      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        this.logger.error('LLM response missing content');
        throw new Error('LLM response missing content field');
      }

      return content.trim();
    } catch (err) {
      this.logger.error(`LLM call error: ${(err as Error).message}`);
      throw err;
    }
  }

  private buildMessages(
    context: AiPromptContext
  ): { role: string; content: string }[] {
    const safePayload = {
      workspaceId: context.workspaceId,
      artifactType: context.artifactType,
      goal: context.goal,
      context: context.context,
    };

    const systemContent =
      context.systemPrompt ??
      'You are an AI assistant. Respond with valid JSON only.';

    const userContent = [
      `Please analyze the following workspace data and generate a ${context.artifactType} artifact.`,
      '',
      'Input data (already sanitized):',
      JSON.stringify(safePayload, null, 2),
      '',
      'Remember: respond with valid JSON only, no other text.',
    ].join('\n');

    return [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ];
  }
}
