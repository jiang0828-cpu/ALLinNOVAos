import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AiProvider,
  AiResponse,
  AiSuggestionDraft,
  AiTaskDraft,
  AiReviewDraft,
  AiPromptContext,
} from '../providers/ai-provider.interface';
import { AiOutputValidator } from './ai-output-validator.service';
import { AiContextSanitizer } from './ai-context-sanitizer.service';
import {
  Prisma,
  WorkItemType,
  PdcaStage,
  WorkItemStatus,
  SuggestionStatus,
  SuggestionSourceType,
  SuggestionType,
  Priority,
  ActivityAction,
  SourceType,
} from '@prisma/client';

/**
 * AiSuggestionAdapterService
 *
 * Central orchestrator for AI-generated artifacts.
 *
 * Pipeline:
 *   1. Sanitize context (strip sensitive data)
 *   2. Call AiProvider.generateRaw()
 *   3. Validate output with class-validator
 *   4. Persist validated artifacts as DRAFT records
 *   5. AI-generated Suggestions are created with status PENDING
 *   6. AI-generated Tasks are created as drafts (not confirmed)
 *
 * Design rules enforced:
 *   ✅ AI only generates drafts — no confirmed data
 *   ✅ No direct writes to confirmed Tasks/Goals/Metrics
 *   ✅ Default excludes raw health/financial sensitive data
 *   ✅ Output is validated JSON before any DB write
 *   ✅ Validation failure = log and reject (no partial writes)
 *   ✅ Suggestion status always PENDING
 *   ✅ User must confirm before real Task creation
 */
@Injectable()
export class AiSuggestionAdapterService {
  private readonly logger = new Logger(AiSuggestionAdapterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: AiProvider,
    private readonly validator: AiOutputValidator,
    private readonly sanitizer: AiContextSanitizer
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Generate AI suggestions for a workspace.
   * Returns validated suggestion drafts that have been persisted
   * with SuggestionStatus.PENDING.
   */
  async generateSuggestions(params: {
    workspaceId: string;
    goal: string;
    rawData: Record<string, unknown>;
    cycleId?: string;
  }): Promise<{ created: number; suggestions: unknown[] }> {
    const context = this.sanitizer.buildSanitizedContext(
      params.workspaceId,
      'suggestion',
      params.goal,
      params.rawData
    );

    const response = await this.generateAndValidate(context);
    if (!response || response.artifactType !== 'suggestion') {
      return { created: 0, suggestions: [] };
    }

    const created = await this.persistSuggestionDrafts(
      params.workspaceId,
      params.cycleId,
      response.suggestions ?? []
    );

    return { created: created.length, suggestions: created };
  }

  /**
   * Generate AI review draft for a workspace.
   * Returns a review draft (not persisted as a real review yet).
   */
  async generateReviewDraft(params: {
    workspaceId: string;
    goal: string;
    rawData: Record<string, unknown>;
  }): Promise<AiReviewDraft | null> {
    const context = this.sanitizer.buildSanitizedContext(
      params.workspaceId,
      'review',
      params.goal,
      params.rawData
    );

    const response = await this.generateAndValidate(context);
    if (!response || response.artifactType !== 'review') {
      return null;
    }

    return response.review ?? null;
  }

  /**
   * Generate AI task drafts for a workspace.
   * Returns task drafts that have been persisted with status TODO
   * but marked as AI-generated (sourceType: 'AI').
   * User confirmation is still required before they become real tasks.
   */
  async generateTaskDrafts(params: {
    workspaceId: string;
    goal: string;
    rawData: Record<string, unknown>;
    cycleId?: string;
  }): Promise<{ created: number; tasks: unknown[] }> {
    const context = this.sanitizer.buildSanitizedContext(
      params.workspaceId,
      'task',
      params.goal,
      params.rawData
    );

    const response = await this.generateAndValidate(context);
    if (!response || response.artifactType !== 'task') {
      return { created: 0, tasks: [] };
    }

    const created = await this.persistTaskDrafts(
      params.workspaceId,
      params.cycleId,
      response.tasks ?? []
    );

    return { created: created.length, tasks: created };
  }

  // ---------------------------------------------------------------------------
  // Core pipeline
  // ---------------------------------------------------------------------------

  private async generateAndValidate(
    context: AiPromptContext
  ): Promise<AiResponse | null> {
    let raw: string;
    try {
      raw = await this.provider.generateRaw(context);
    } catch (err) {
      this.logger.error(`AI provider error: ${(err as Error).message}`);
      return null;
    }

    // Validate — failure means no write
    const validated = this.validator.parseAndValidate(raw);
    if (!validated) {
      this.logger.warn(
        'AI output failed validation; rejecting without writing'
      );
      return null;
    }

    return validated;
  }

  // ---------------------------------------------------------------------------
  // Persistence helpers
  // ---------------------------------------------------------------------------

  private async persistSuggestionDrafts(
    workspaceId: string,
    cycleId: string | undefined,
    drafts: AiSuggestionDraft[]
  ): Promise<unknown[]> {
    if (!drafts.length) return [];

    const results: unknown[] = [];

    await this.prisma.client.$transaction(async (tx) => {
      for (const draft of drafts) {
        const urgencyScore = Math.min(100, Math.max(0, draft.urgencyScore));
        const priority = this.mapUrgencyToPriority(urgencyScore);

        // Dedup check — skip if an AI-generated suggestion with same title exists
        const existing = await tx.workItem.findFirst({
          where: {
            workspaceId,
            itemType: WorkItemType.SUGGESTION,
            title: draft.title,
            deletedAt: null,
            sourceType: SourceType.AI,
          },
        });

        if (existing) {
          this.logger.debug(`Skipping duplicate suggestion: ${draft.title}`);
          continue;
        }

        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 14);

        const suggestion = await tx.workItem.create({
          data: {
            workspaceId,
            cycleId: cycleId || null,
            itemType: WorkItemType.SUGGESTION,
            pdcaStage: PdcaStage.ACT,
            title: draft.title,
            description: draft.description,
            status: WorkItemStatus.ACTIVE,
            priority,
            createdBy: 'system',
            sourceType: SourceType.AI,
            suggestionDetail: {
              create: {
                suggestionType: SuggestionType.RESOURCE_OPTIMIZATION,
                sourceType: SuggestionSourceType.METRIC_GAP,
                sourceRefId: 'ai-generated',
                confidence: draft.confidence,
                impactScore: draft.impactScore,
                urgencyScore,
                reason: draft.reason,
                evidence: draft.evidence as Prisma.InputJsonValue,
                dedupKey: `ai:${workspaceId}:${draft.title}`,
                expiresAt,
                status: SuggestionStatus.PENDING,
              },
            },
          },
          include: { suggestionDetail: true },
        });

        await tx.activityEvent.create({
          data: {
            workspaceId,
            workItemId: suggestion.id,
            action: ActivityAction.CREATE,
            actor: 'system',
            metadata: {
              source: 'ai',
              draftType: 'suggestion',
              provider: this.provider.name,
            } as Prisma.InputJsonValue,
          },
        });

        results.push(suggestion);
      }
    });

    return results;
  }

  private async persistTaskDrafts(
    workspaceId: string,
    cycleId: string | undefined,
    drafts: AiTaskDraft[]
  ): Promise<unknown[]> {
    if (!drafts.length) return [];

    const results: unknown[] = [];

    await this.prisma.client.$transaction(async (tx) => {
      for (const draft of drafts) {
        // Dedup check
        const existing = await tx.workItem.findFirst({
          where: {
            workspaceId,
            itemType: WorkItemType.TASK,
            title: draft.title,
            deletedAt: null,
            sourceType: SourceType.AI,
          },
        });

        if (existing) {
          this.logger.debug(`Skipping duplicate task draft: ${draft.title}`);
          continue;
        }

        const priority = this.mapPriorityString(draft.priority);

        const task = await tx.workItem.create({
          data: {
            workspaceId,
            cycleId: cycleId || null,
            itemType: WorkItemType.TASK,
            pdcaStage: PdcaStage.DO,
            title: draft.title,
            description: draft.reason,
            status: WorkItemStatus.TODO,
            priority,
            createdBy: 'system',
            sourceType: SourceType.AI,
            taskDetail: {
              create: {
                estimatedMinutes: draft.estimatedMinutes ?? 60,
                dueAt: null,
              },
            },
          },
          include: { taskDetail: true },
        });

        await tx.activityEvent.create({
          data: {
            workspaceId,
            workItemId: task.id,
            action: ActivityAction.CREATE,
            actor: 'system',
            metadata: {
              source: 'ai',
              draftType: 'task',
              provider: this.provider.name,
              confirmed: false,
            } as Prisma.InputJsonValue,
          },
        });

        results.push(task);
      }
    });

    return results;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private mapUrgencyToPriority(urgencyScore: number): Priority {
    if (urgencyScore >= 80) return Priority.P0;
    if (urgencyScore >= 50) return Priority.P1;
    return Priority.P2;
  }

  private mapPriorityString(priority: string): Priority {
    const map: Record<string, Priority> = {
      P0: Priority.P0,
      P1: Priority.P1,
      P2: Priority.P2,
    };
    return map[priority] ?? Priority.P2;
  }
}
