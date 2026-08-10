/**
 * AiProvider — abstract interface for AI model providers
 *
 * Design rules (from ai-development-rules.md §6):
 * - AI may generate suggestions, review drafts, and task drafts
 * - AI must not delete or directly modify confirmed data
 * - AI output must be valid JSON
 * - Output must be validated before any business data is written
 *
 * This interface is intentionally vendor-agnostic — implementations
 * can point to any LLM endpoint (OpenAI, Anthropic, local Ollama, etc.).
 */

/** The type of artifact the AI is asked to generate. */
export type AiArtifactType = 'suggestion' | 'review' | 'task';

/** A single suggestion draft item. */
export interface AiSuggestionDraft {
  title: string;
  description: string;
  confidence: number;
  impactScore: number;
  urgencyScore: number;
  reason: string;
  evidence: Record<string, unknown>;
}

/** A single task draft item. */
export interface AiTaskDraft {
  title: string;
  description?: string;
  priority: string;
  estimatedMinutes?: number;
  reason: string;
}

/** A review draft item (for review / insight generation). */
export interface AiReviewDraft {
  summary: string;
  achievements: string[];
  challenges: string[];
  rootCauses: string[];
  lessonsLearned: string[];
  nextCycleFocus: string[];
  healthScore: number;
  taskCompletionRate: number;
}

/** Generic structured response from any AI provider. */
export interface AiResponse {
  artifactType: AiArtifactType;
  suggestions?: AiSuggestionDraft[];
  tasks?: AiTaskDraft[];
  review?: AiReviewDraft;
  reasoning?: string;
}

/**
 * Input context sent to an AI provider.
 * Only sanitized, permission-filtered data should appear here.
 * Raw health / financial sensitive data must NOT be included by default.
 */
export interface AiPromptContext {
  workspaceId: string;
  artifactType: AiArtifactType;
  goal: string;
  context: Record<string, unknown>;
  systemPrompt?: string;
}

export interface AiGenerateOptions {
  /** Temperature 0-1, lower = more deterministic */
  temperature?: number;
  /** Max tokens for the response */
  maxTokens?: number;
  /** Request timeout in ms */
  timeoutMs?: number;
}

/**
 * Abstract AI provider. Implementations may wrap any LLM vendor.
 *
 * Example implementations:
 *   - OpenAiAiProvider       → api.openai.com
 *   - AnthropicAiProvider    → api.anthropic.com
 *   - OllamaAiProvider       → localhost:11434
 *   - MockAiProvider         → deterministic canned responses (for tests)
 */
export abstract class AiProvider {
  /**
   * Unique identifier for this provider (e.g. 'openai', 'mock').
   */
  abstract readonly name: string;

  /**
   * Generate a structured AI response from sanitized context.
   *
   * The implementation MUST:
   *  1. Send a prompt requesting JSON output only.
   *  2. Return a string that can be parsed as JSON.
   *  3. Never include raw sensitive data in the prompt.
   */
  abstract generateRaw(
    context: AiPromptContext,
    options?: AiGenerateOptions
  ): Promise<string>;
}
