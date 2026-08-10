import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SuggestionRuleEngineService, SuggestionRuleResult } from './suggestion-rule-engine.service';
import {
  Prisma,
  WorkItemType,
  PdcaStage,
  WorkItemStatus,
  SuggestionStatus,
  SuggestionSourceType,
  SuggestionType,
  WorkItemRelationType,
  ActivityAction,
  Priority,
} from '@prisma/client';

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEngine: SuggestionRuleEngineService,
  ) {}

  /**
   * Execute rule engine and create suggestions for detected signals
   */
  async executeRuleEngine(
    workspaceId: string,
    cycleId?: string,
  ): Promise<{ created: number; skipped: number; suggestions: any[] }> {
    const signals = await this.ruleEngine.evaluateRules(workspaceId, cycleId);
    
    const created: any[] = [];
    let skipped = 0;

    for (const signal of signals) {
      // Check deduplication: same dedupKey with active status should be skipped
      const existingSuggestion = await this.prisma.client.workItem.findFirst({
        where: {
          workspaceId,
          itemType: WorkItemType.SUGGESTION,
          deletedAt: null,
          suggestionDetail: {
            is: {
              dedupKey: signal.dedupKey,
              status: { in: [SuggestionStatus.PENDING, SuggestionStatus.DEFERRED] },
            },
          },
        },
      });

      if (existingSuggestion) {
        skipped++;
        continue;
      }

      // Create suggestion
      const suggestion = await this.prisma.client.$transaction(async (tx) => {
        const workItem = await tx.workItem.create({
          data: {
            workspaceId,
            cycleId: cycleId || null,
            itemType: WorkItemType.SUGGESTION,
            pdcaStage: PdcaStage.ACT,
            title: this.buildSuggestionTitle(signal.suggestionType, signal.sourceType),
            description: signal.reason,
            status: WorkItemStatus.ACTIVE,
            priority: this.mapUrgencyToPriority(signal.urgencyScore),
            createdBy: 'system',
            sourceType: 'AI' as any,
            suggestionDetail: {
              create: {
                suggestionType: signal.suggestionType,
                sourceType: signal.sourceType,
                sourceRefId: signal.sourceRefId,
                confidence: signal.confidence,
                impactScore: signal.impactScore,
                urgencyScore: signal.urgencyScore,
                reason: signal.reason,
                evidence: signal.evidence as Prisma.InputJsonValue,
                dedupKey: signal.dedupKey,
                expiresAt: this.calculateExpiry(signal.suggestionType),
                status: SuggestionStatus.PENDING,
              },
            },
          },
          include: { suggestionDetail: true },
        });

        // Write activity event
        await tx.activityEvent.create({
          data: {
            workspaceId,
            workItemId: workItem.id,
            action: ActivityAction.CREATE,
            actor: 'system',
            metadata: {
              signal: {
                ruleId: signal.ruleId,
                suggestionType: signal.suggestionType,
                sourceType: signal.sourceType,
              },
            } as Prisma.InputJsonValue,
          },
        });

        return workItem;
      });

      created.push(suggestion);
    }

    return { created: created.length, skipped, suggestions: created };
  }

  /**
   * Create a suggestion manually
   */
  async createSuggestion(data: {
    workspaceId: string;
    title: string;
    description?: string;
    cycleId?: string;
    suggestionType: SuggestionType;
    sourceType: SuggestionSourceType;
    sourceRefId: string;
    confidence?: number;
    impactScore?: number;
    urgencyScore?: number;
    reason?: string;
    evidence?: Record<string, unknown>;
    dedupKey?: string;
  }) {
    const { workspaceId } = data;

    // Validate workspace
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace with id ${workspaceId} not found`);
    }

    // Check dedup
    if (data.dedupKey) {
      const existing = await this.prisma.client.workItem.findFirst({
        where: {
          workspaceId,
          itemType: WorkItemType.SUGGESTION,
          deletedAt: null,
          suggestionDetail: {
            is: {
              dedupKey: data.dedupKey,
              status: { in: [SuggestionStatus.PENDING, SuggestionStatus.DEFERRED] },
            },
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          `An active suggestion already exists for this dedup key`,
        );
      }
    }

    return this.prisma.client.$transaction(async (tx) => {
      const suggestion = await tx.workItem.create({
        data: {
          workspaceId,
          cycleId: data.cycleId || null,
          itemType: WorkItemType.SUGGESTION,
          pdcaStage: PdcaStage.ACT,
          title: data.title,
          description: data.description,
          status: WorkItemStatus.ACTIVE,
          priority: this.mapUrgencyToPriority(data.urgencyScore || 50),
          createdBy: 'user',
          sourceType: 'MANUAL' as any,
          suggestionDetail: {
            create: {
              suggestionType: data.suggestionType,
              sourceType: data.sourceType,
              sourceRefId: data.sourceRefId,
              confidence: data.confidence || 1,
              impactScore: data.impactScore || 50,
              urgencyScore: data.urgencyScore || 50,
              reason: data.reason || data.description || '',
              evidence: (data.evidence || {}) as Prisma.InputJsonValue,
              dedupKey: data.dedupKey || `${workspaceId}:${data.sourceType}:${data.sourceRefId}:${data.suggestionType}`,
              status: SuggestionStatus.PENDING,
            },
          },
        },
        include: { suggestionDetail: true },
      });

      // Write activity event
      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: suggestion.id,
          action: ActivityAction.CREATE,
          actor: 'user',
          metadata: { suggestionType: data.suggestionType } as Prisma.InputJsonValue,
        },
      });

      return suggestion;
    });
  }

  /**
   * Get suggestion by ID
   */
  async getSuggestionById(id: string, workspaceId: string) {
    const suggestion = await this.prisma.client.workItem.findUnique({
      where: { id },
      include: { suggestionDetail: true },
    });

    if (!suggestion || suggestion.itemType !== WorkItemType.SUGGESTION || suggestion.workspaceId !== workspaceId || suggestion.deletedAt) {
      throw new NotFoundException(`Suggestion with id ${id} not found`);
    }

    return suggestion;
  }

  /**
   * List suggestions with filters
   */
  async listSuggestions(workspaceId: string, queryDto: {
    status?: SuggestionStatus[];
    sourceType?: SuggestionSourceType;
    suggestionType?: SuggestionType;
    cycleId?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      sourceType,
      suggestionType,
      cycleId,
      page = 1,
      limit = 20,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.WorkItemWhereInput = {
      workspaceId,
      itemType: WorkItemType.SUGGESTION,
      deletedAt: null,
    };

    // Build suggestionDetail filter
    const detailFilter: any = {};
    if (status && status.length > 0) {
      detailFilter.status = { in: status };
    }
    if (sourceType) {
      detailFilter.sourceType = sourceType;
    }
    if (suggestionType) {
      detailFilter.suggestionType = suggestionType;
    }

    if (Object.keys(detailFilter).length > 0) {
      where.suggestionDetail = { is: detailFilter };
    }

    if (cycleId) {
      where.cycleId = cycleId;
    }

    const [total, suggestions] = await Promise.all([
      this.prisma.client.workItem.count({ where }),
      this.prisma.client.workItem.findMany({
        where,
        include: { suggestionDetail: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: suggestions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Accept a suggestion -> creates a Decision
   */
  async acceptSuggestion(
    id: string,
    workspaceId: string,
    decisionData?: { content?: string; rationale?: string; impact?: string },
  ) {
    const suggestion = await this.getSuggestionById(id, workspaceId);

    if (suggestion.suggestionDetail?.status !== SuggestionStatus.PENDING &&
        suggestion.suggestionDetail?.status !== SuggestionStatus.DEFERRED) {
      throw new BadRequestException(
        `Suggestion is not in a state that can be accepted (current: ${suggestion.suggestionDetail?.status})`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      // Update suggestion status
      const updatedSuggestion = await tx.suggestionDetail.update({
        where: { workItemId: id },
        data: {
          status: SuggestionStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      // Create Decision
      const decision = await tx.workItem.create({
        data: {
          workspaceId,
          cycleId: suggestion.cycleId,
          itemType: WorkItemType.DECISION,
          pdcaStage: PdcaStage.ACT,
          title: decisionData?.content || `决策: ${suggestion.title}`,
          description: decisionData?.rationale || suggestion.description,
          status: WorkItemStatus.ACTIVE,
          createdBy: 'user',
          sourceType: 'MANUAL' as any,
          decisionDetail: {
            create: {
              suggestionId: id,
              content: decisionData?.content || suggestion.suggestionDetail?.reason || suggestion.title,
              rationale: decisionData?.rationale,
              impact: (decisionData?.impact as any) || undefined,
              decidedAt: new Date(),
            },
          },
        },
        include: { decisionDetail: true },
      });

      // Write activity events
      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: id,
          action: ActivityAction.UPDATE,
          actor: 'user',
          metadata: {
            newStatus: 'ACCEPTED',
            decisionId: decision.id,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: decision.id,
          action: ActivityAction.CREATE,
          actor: 'user',
          metadata: {
            sourceSuggestionId: id,
          } as Prisma.InputJsonValue,
        },
      });

      return { suggestion: updatedSuggestion, decision };
    });
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(id: string, workspaceId: string) {
    const suggestion = await this.getSuggestionById(id, workspaceId);

    if (suggestion.suggestionDetail?.status !== SuggestionStatus.PENDING &&
        suggestion.suggestionDetail?.status !== SuggestionStatus.DEFERRED) {
      throw new BadRequestException(
        `Suggestion cannot be dismissed (current: ${suggestion.suggestionDetail?.status})`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updatedSuggestion = await tx.suggestionDetail.update({
        where: { workItemId: id },
        data: {
          status: SuggestionStatus.DISMISSED,
          dismissedAt: new Date(),
        },
      });

      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: id,
          action: ActivityAction.UPDATE,
          actor: 'user',
          metadata: { newStatus: 'DISMISSED' } as Prisma.InputJsonValue,
        },
      });

      return updatedSuggestion;
    });
  }

  /**
   * Defer a suggestion
   */
  async deferSuggestion(id: string, workspaceId: string) {
    const suggestion = await this.getSuggestionById(id, workspaceId);

    if (suggestion.suggestionDetail?.status !== SuggestionStatus.PENDING) {
      throw new BadRequestException(
        `Suggestion cannot be deferred (current: ${suggestion.suggestionDetail?.status})`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updatedSuggestion = await tx.suggestionDetail.update({
        where: { workItemId: id },
        data: {
          status: SuggestionStatus.DEFERRED,
          deferredAt: new Date(),
        },
      });

      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: id,
          action: ActivityAction.UPDATE,
          actor: 'user',
          metadata: { newStatus: 'DEFERRED' } as Prisma.InputJsonValue,
        },
      });

      return updatedSuggestion;
    });
  }

  /**
   * Reactivate a deferred suggestion
   */
  async reactivateSuggestion(id: string, workspaceId: string) {
    const suggestion = await this.getSuggestionById(id, workspaceId);

    if (suggestion.suggestionDetail?.status !== SuggestionStatus.DEFERRED) {
      throw new BadRequestException(
        `Suggestion cannot be reactivated (current: ${suggestion.suggestionDetail?.status})`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updatedSuggestion = await tx.suggestionDetail.update({
        where: { workItemId: id },
        data: {
          status: SuggestionStatus.PENDING,
          deferredAt: null,
        },
      });

      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: id,
          action: ActivityAction.UPDATE,
          actor: 'user',
          metadata: { newStatus: 'PENDING', reactivated: true } as Prisma.InputJsonValue,
        },
      });

      return updatedSuggestion;
    });
  }

  /**
   * Create an adjustment task from a suggestion
   */
  async createAdjustmentTaskFromSuggestion(
    id: string,
    workspaceId: string,
    taskData?: { title?: string; description?: string; dueAt?: Date; priority?: Priority },
  ) {
    const suggestion = await this.getSuggestionById(id, workspaceId);

    if (suggestion.suggestionDetail?.status !== SuggestionStatus.ACCEPTED) {
      throw new BadRequestException(
        `Task can only be created from an accepted suggestion (current: ${suggestion.suggestionDetail?.status})`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      // Create adjustment task
      const task = await tx.workItem.create({
        data: {
          workspaceId,
          cycleId: suggestion.cycleId,
          parentId: suggestion.id,
          itemType: WorkItemType.TASK,
          pdcaStage: PdcaStage.DO,
          title: taskData?.title || `调整任务: ${suggestion.title}`,
          description: taskData?.description || suggestion.description,
          status: WorkItemStatus.TODO,
          priority: taskData?.priority || suggestion.priority || Priority.P2,
          createdBy: 'user',
          sourceType: 'MANUAL' as any,
          taskDetail: {
            create: {
              dueAt: taskData?.dueAt || null,
              estimatedMinutes: 60,
            },
          },
        },
        include: { taskDetail: true },
      });

      // Create DERIVED_FROM relation
      await tx.workItemRelation.create({
        data: {
          sourceItemId: task.id,
          targetItemId: suggestion.id,
          relationType: WorkItemRelationType.DERIVED_FROM,
        },
      });

      // Update suggestion with converted task
      await tx.suggestionDetail.update({
        where: { workItemId: id },
        data: {
          isConverted: true,
          convertedTaskId: task.id,
        },
      });

      // Write activity events
      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: task.id,
          action: ActivityAction.CREATE,
          actor: 'user',
          metadata: {
            derivedFromSuggestionId: id,
            relationType: 'DERIVED_FROM',
          } as Prisma.InputJsonValue,
        },
      });

      return task;
    });
  }

  /**
   * Soft delete a suggestion
   */
  async deleteSuggestion(id: string, workspaceId: string) {
    const suggestion = await this.getSuggestionById(id, workspaceId);

    if (suggestion.deletedAt) {
      throw new BadRequestException('Suggestion is already deleted');
    }

    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: WorkItemStatus.ARCHIVED,
          deletedAt: new Date(),
        },
        include: { suggestionDetail: true },
      });

      await tx.activityEvent.create({
        data: {
          workspaceId,
          workItemId: id,
          action: ActivityAction.DELETE,
          actor: 'user',
        },
      });

      return updated;
    });
  }

  /**
   * Expire suggestions past their expiresAt date
   */
  async expireSuggestions(workspaceId: string) {
    const now = new Date();

    return this.prisma.client.$transaction(async (tx) => {
      const expired = await tx.suggestionDetail.updateMany({
        where: {
          status: SuggestionStatus.PENDING,
          expiresAt: { lt: now },
          workItem: {
            workspaceId,
            deletedAt: null,
          },
        },
        data: {
          status: SuggestionStatus.EXPIRED,
          expiredAt: now,
        },
      });

      return { expiredCount: expired.count };
    });
  }

  private buildSuggestionTitle(type: SuggestionType, sourceType: SuggestionSourceType): string {
    const typeLabels: Record<SuggestionType, string> = {
      HEALTH_IMPROVEMENT: '健康改善建议',
      PROGRESS_ACCELERATION: '进度加速建议',
      TASK_RESOLUTION: '任务解决建议',
      RISK_MITIGATION: '风险缓解建议',
      RESOURCE_OPTIMIZATION: '资源优化建议',
    };

    return `[${typeLabels[type]}] 系统自动生成`;
  }

  private mapUrgencyToPriority(urgencyScore: number): Priority {
    if (urgencyScore >= 80) return Priority.P0;
    if (urgencyScore >= 50) return Priority.P1;
    return Priority.P2;
  }

  private calculateExpiry(type: SuggestionType): Date {
    const now = new Date();
    const expiryDays: Record<SuggestionType, number> = {
      HEALTH_IMPROVEMENT: 7,
      PROGRESS_ACCELERATION: 14,
      TASK_RESOLUTION: 3,
      RISK_MITIGATION: 7,
      RESOURCE_OPTIMIZATION: 14,
    };
    now.setDate(now.getDate() + expiryDays[type]);
    return now;
  }
}
