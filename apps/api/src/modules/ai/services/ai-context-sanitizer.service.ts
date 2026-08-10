import { Injectable } from '@nestjs/common';
import type {
  AiPromptContext,
  AiArtifactType,
} from '../providers/ai-provider.interface';

/**
 * AiContextSanitizer
 *
 * Strips sensitive data before it is sent to external AI providers.
 * Follows ai-development-rules.md §6 rule 5:
 *   "Raw health and financial sensitive data must not be sent to
 *    external AI by default."
 *
 * Only explicitly whitelisted fields are kept.
 */

/** Field names that are always excluded from AI prompts. */
const SENSITIVE_FIELD_NAMES = new Set<string>([
  // Health / medical
  'health_score_raw',
  'vital_signs',
  'medical_records',
  'health_data',
  // Financial
  'revenue_raw',
  'profit_raw',
  'salary',
  'banking',
  'invoice_raw',
  'financial_raw',
  // Personal
  'ssn',
  'credit_card',
  'password',
  'secret',
  'token',
]);

@Injectable()
export class AiContextSanitizer {
  /**
   * Build a sanitized prompt context for the given artifact type.
   * Only safe, structured data is included.
   */
  buildSanitizedContext(
    workspaceId: string,
    artifactType: AiArtifactType,
    goal: string,
    rawData: Record<string, unknown>
  ): AiPromptContext {
    const safeContext = this.stripSensitive(rawData);

    const systemPrompt = this.getSystemPrompt(artifactType);

    return {
      workspaceId,
      artifactType,
      goal,
      context: safeContext,
      systemPrompt,
    };
  }

  /**
   * Recursively remove sensitive keys from an object tree.
   */
  private stripSensitive(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    return this.stripRecursive(data) as Record<string, unknown>;
  }

  private stripRecursive(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value))
      return value.map((item) => this.stripRecursive(item));
    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>
      )) {
        if (this.isSensitiveKey(key)) continue;
        result[key] = this.stripRecursive(val);
      }
      return result;
    }
    return value;
  }

  private isSensitiveKey(key: string): boolean {
    const lower = key.toLowerCase();
    for (const sensitive of SENSITIVE_FIELD_NAMES) {
      if (lower.includes(sensitive)) return true;
    }
    return false;
  }

  /**
   * Build a system prompt for the specific artifact type.
   * Reinforces that AI must output valid JSON only.
   */
  private getSystemPrompt(artifactType: AiArtifactType): string {
    const base =
      'You are an AI assistant for NOVA OS. ' +
      'You must respond with valid JSON only. ' +
      'Do not include any markdown, explanations, or text outside the JSON object. ' +
      'Your output will be programmatically validated and must match the required schema exactly.';

    const artifactPrompts: Record<AiArtifactType, string> = {
      suggestion:
        `${base}\n\n` +
        'Generate actionable suggestions for improvement.\n' +
        'Output schema: { artifactType: "suggestion", suggestions: [{ title, description, confidence, impactScore, urgencyScore, reason, evidence }], reasoning }',
      review:
        `${base}\n\n` +
        'Generate a structured retrospective review.\n' +
        'Output schema: { artifactType: "review", review: { summary, achievements: [], challenges: [], rootCauses: [], lessonsLearned: [], nextCycleFocus: [], healthScore, taskCompletionRate }, reasoning }',
      task:
        `${base}\n\n` +
        'Generate task draft recommendations.\n' +
        'Output schema: { artifactType: "task", tasks: [{ title, description?, priority, estimatedMinutes?, reason }], reasoning }',
    };

    return artifactPrompts[artifactType];
  }
}
