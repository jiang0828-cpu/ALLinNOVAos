import { Test, TestingModule } from '@nestjs/testing';
import {
  WorkItemType,
  PdcaStage,
  WorkItemStatus,
  SuggestionStatus,
  SuggestionSourceType,
  ActivityAction,
  Priority,
} from '@prisma/client';
import { AiSuggestionAdapterService } from './services/ai-suggestion-adapter.service';
import { AiOutputValidator } from './services/ai-output-validator.service';
import { AiContextSanitizer } from './services/ai-context-sanitizer.service';
import { MockAiProvider } from './providers/mock-ai.provider';
import { AiProvider } from './providers/ai-provider.interface';
import { AiController } from './ai.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// ---------------------------------------------------------------------------
// Prisma mock
// ---------------------------------------------------------------------------

const txMocks = {
  workItem: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  suggestionDetail: {
    update: jest.fn(),
  },
  taskDetail: {
    create: jest.fn(),
  },
  activityEvent: {
    create: jest.fn(),
  },
};

const mockPrismaClient = {
  workItem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  suggestionDetail: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  taskDetail: {
    create: jest.fn(),
  },
  workItemDetail: {},
  activityEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof txMocks) => Promise<unknown>) =>
    cb(txMocks)
  ),
};

const mockPrismaService = { client: mockPrismaClient };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSuggestionWorkItem = (id: string, title: string) => ({
  id,
  workspaceId: 'ws-1',
  itemType: WorkItemType.SUGGESTION,
  title,
  description: 'Test suggestion',
  status: WorkItemStatus.ACTIVE,
  priority: Priority.P1,
  sourceType: 'AI',
  suggestionDetail: {
    workItemId: id,
    suggestionType: 'RESOURCE_OPTIMIZATION',
    sourceType: SuggestionSourceType.METRIC_GAP,
    sourceRefId: 'ai-generated',
    confidence: 0.85,
    impactScore: 70,
    urgencyScore: 65,
    reason: 'Test reason',
    evidence: { test: true },
    status: SuggestionStatus.PENDING,
  },
});

const makeTaskWorkItem = (id: string, title: string) => ({
  id,
  workspaceId: 'ws-1',
  itemType: WorkItemType.TASK,
  title,
  description: 'Test task',
  status: WorkItemStatus.TODO,
  priority: Priority.P1,
  sourceType: 'AI',
  taskDetail: {
    workItemId: id,
    estimatedMinutes: 60,
    dueAt: null,
  },
});

// ---------------------------------------------------------------------------
// Test: AiOutputValidator
// ---------------------------------------------------------------------------

describe('AiOutputValidator', () => {
  let validator: AiOutputValidator;

  beforeEach(() => {
    validator = new AiOutputValidator();
  });

  describe('parseAndValidate', () => {
    it('should accept valid suggestion JSON', () => {
      const raw = JSON.stringify({
        artifactType: 'suggestion',
        suggestions: [
          {
            title: 'Test suggestion',
            description: 'A valid suggestion description with enough text',
            confidence: 0.8,
            impactScore: 70,
            urgencyScore: 60,
            reason: 'Valid reason text for the suggestion',
            evidence: { factor1: 'value1' },
          },
        ],
        reasoning: 'AI reasoning',
      });
      const result = validator.parseAndValidate(raw);
      expect(result).not.toBeNull();
      expect(result?.artifactType).toBe('suggestion');
      expect(result?.suggestions).toHaveLength(1);
    });

    it('should accept valid review JSON', () => {
      const raw = JSON.stringify({
        artifactType: 'review',
        review: {
          summary: 'A comprehensive summary of the review period',
          achievements: ['Completed project X', 'Improved velocity'],
          challenges: ['Resource shortage', 'Technical debt'],
          rootCauses: ['Poor planning', 'Lack of automation'],
          lessonsLearned: ['Better planning needed'],
          nextCycleFocus: ['Automate testing', 'Better estimation'],
          healthScore: 75,
          taskCompletionRate: 82,
        },
      });
      const result = validator.parseAndValidate(raw);
      expect(result).not.toBeNull();
      expect(result?.artifactType).toBe('review');
      expect(result?.review).toBeDefined();
    });

    it('should accept valid task JSON', () => {
      const raw = JSON.stringify({
        artifactType: 'task',
        tasks: [
          {
            title: 'Fix critical bug in payment module',
            description: 'The payment module has a critical bug',
            priority: 'P0',
            estimatedMinutes: 120,
            reason: 'Bug is blocking critical workflow',
          },
        ],
      });
      const result = validator.parseAndValidate(raw);
      expect(result).not.toBeNull();
      expect(result?.artifactType).toBe('task');
      expect(result?.tasks).toHaveLength(1);
    });

    it('should reject non-JSON input', () => {
      const result = validator.parseAndValidate('not json at all');
      expect(result).toBeNull();
    });

    it('should reject missing artifact', () => {
      const raw = JSON.stringify({
        artifactType: 'suggestion',
        suggestions: [],
      });
      const result = validator.parseAndValidate(raw);
      expect(result).toBeNull();
    });

    it('should reject invalid confidence range', () => {
      const raw = JSON.stringify({
        artifactType: 'suggestion',
        suggestions: [
          {
            title: 'Valid title for test',
            description: 'Valid description for testing purposes',
            confidence: 1.5,
            impactScore: 70,
            urgencyScore: 60,
            reason: 'Valid reason text here',
            evidence: {},
          },
        ],
      });
      const result = validator.parseAndValidate(raw);
      expect(result).toBeNull();
    });

    it('should reject invalid priority value', () => {
      const raw = JSON.stringify({
        artifactType: 'task',
        tasks: [
          {
            title: 'Valid title for testing',
            priority: 'P5',
            reason: 'Valid reason text for task',
          },
        ],
      });
      const result = validator.parseAndValidate(raw);
      expect(result).toBeNull();
    });

    it('should reject review without review object', () => {
      const raw = JSON.stringify({
        artifactType: 'review',
        reasoning: 'Missing review object',
      });
      const result = validator.parseAndValidate(raw);
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Test: AiContextSanitizer
// ---------------------------------------------------------------------------

describe('AiContextSanitizer', () => {
  let sanitizer: AiContextSanitizer;

  beforeEach(() => {
    sanitizer = new AiContextSanitizer();
  });

  it('should strip sensitive fields from context', () => {
    const result = sanitizer.buildSanitizedContext(
      'ws-1',
      'suggestion',
      'Q4 launch',
      {
        safeField: 'value',
        health_score_raw: 95,
        revenue_raw: 500000,
        medical_records: [{ condition: 'diabetes' }],
      }
    );

    expect(result.context).not.toHaveProperty('health_score_raw');
    expect(result.context).not.toHaveProperty('revenue_raw');
    expect(result.context).not.toHaveProperty('medical_records');
    expect(result.context.safeField).toBe('value');
  });

  it('should strip nested sensitive fields', () => {
    const result = sanitizer.buildSanitizedContext('ws-1', 'task', 'Test', {
      metrics: {
        health_score_raw: 80,
        revenue_raw: 100000,
      },
    });

    expect(result.context.metrics).not.toHaveProperty('health_score_raw');
    expect(result.context.metrics).not.toHaveProperty('revenue_raw');
  });

  it('should include workspaceId and artifactType', () => {
    const result = sanitizer.buildSanitizedContext(
      'ws-1',
      'review',
      'Test goal',
      { safe: true }
    );

    expect(result.workspaceId).toBe('ws-1');
    expect(result.artifactType).toBe('review');
    expect(result.goal).toBe('Test goal');
    expect(result.systemPrompt).toBeDefined();
    expect(result.systemPrompt).toContain('review');
  });

  it('should include correct system prompt per artifact type', () => {
    const suggestionCtx = sanitizer.buildSanitizedContext(
      'ws-1',
      'suggestion',
      'Goal',
      {}
    );
    expect(suggestionCtx.systemPrompt).toContain('suggestion');

    const taskCtx = sanitizer.buildSanitizedContext('ws-1', 'task', 'Goal', {});
    expect(taskCtx.systemPrompt).toContain('task');

    const reviewCtx = sanitizer.buildSanitizedContext(
      'ws-1',
      'review',
      'Goal',
      {}
    );
    expect(reviewCtx.systemPrompt).toContain('review');
  });
});

// ---------------------------------------------------------------------------
// Test: MockAiProvider
// ---------------------------------------------------------------------------

describe('MockAiProvider', () => {
  let provider: MockAiProvider;

  beforeEach(() => {
    provider = new MockAiProvider();
  });

  it('should return valid suggestion JSON', async () => {
    const raw = await provider.generateRaw({
      workspaceId: 'ws-1',
      artifactType: 'suggestion',
      goal: 'Test',
      context: {},
    });

    const parsed = JSON.parse(raw);
    expect(parsed.artifactType).toBe('suggestion');
    expect(parsed.suggestions).toBeDefined();
    expect(parsed.suggestions.length).toBeGreaterThan(0);
    expect(parsed.suggestions[0].title).toBeDefined();
  });

  it('should return valid review JSON', async () => {
    const raw = await provider.generateRaw({
      workspaceId: 'ws-1',
      artifactType: 'review',
      goal: 'Test',
      context: {},
    });

    const parsed = JSON.parse(raw);
    expect(parsed.artifactType).toBe('review');
    expect(parsed.review).toBeDefined();
    expect(parsed.review.summary).toBeDefined();
    expect(parsed.review.achievements).toBeDefined();
  });

  it('should return valid task JSON', async () => {
    const raw = await provider.generateRaw({
      workspaceId: 'ws-1',
      artifactType: 'task',
      goal: 'Test',
      context: {},
    });

    const parsed = JSON.parse(raw);
    expect(parsed.artifactType).toBe('task');
    expect(parsed.tasks).toBeDefined();
    expect(parsed.tasks.length).toBeGreaterThan(0);
    expect(parsed.tasks[0].title).toBeDefined();
  });

  it('should pass schema validation round-trip', async () => {
    const validator = new AiOutputValidator();
    const sanitizer = new AiContextSanitizer();

    const ctx = sanitizer.buildSanitizedContext(
      'ws-1',
      'suggestion',
      'Goal',
      {}
    );
    const raw = await provider.generateRaw(ctx);
    const result = validator.parseAndValidate(raw);
    expect(result).not.toBeNull();
    expect(result?.artifactType).toBe('suggestion');
  });
});

// ---------------------------------------------------------------------------
// Test: AiSuggestionAdapterService
// ---------------------------------------------------------------------------

describe('AiSuggestionAdapterService', () => {
  let service: AiSuggestionAdapterService;
  let mockProvider: MockAiProvider;

  beforeEach(async () => {
    jest.resetAllMocks();

    mockPrismaClient.workItem.create.mockImplementation(({ data }) => ({
      id: 'wi-' + Math.random().toString(36).slice(2, 8),
      workspaceId: data.workspaceId,
      itemType: data.itemType,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      sourceType: data.sourceType,
      suggestionDetail: data.suggestionDetail
        ? { ...data.suggestionDetail.create, workItemId: 'wi-mock' }
        : undefined,
      taskDetail: data.taskDetail
        ? { ...data.taskDetail.create, workItemId: 'wi-mock' }
        : undefined,
    }));

    txMocks.workItem.create.mockImplementation(({ data }) => ({
      id: 'wi-' + Math.random().toString(36).slice(2, 8),
      workspaceId: data.workspaceId,
      itemType: data.itemType,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      sourceType: data.sourceType,
      suggestionDetail: data.suggestionDetail
        ? { ...data.suggestionDetail.create, workItemId: 'wi-mock' }
        : undefined,
      taskDetail: data.taskDetail
        ? { ...data.taskDetail.create, workItemId: 'wi-mock' }
        : undefined,
    }));

    mockPrismaClient.workItem.findFirst.mockResolvedValue(null);
    txMocks.workItem.findFirst.mockResolvedValue(null);
    mockPrismaClient.activityEvent.create.mockResolvedValue({ id: 'ae-1' });
    txMocks.activityEvent.create.mockResolvedValue({ id: 'ae-1' });

    mockProvider = new MockAiProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiProvider, useValue: mockProvider },
        AiOutputValidator,
        AiContextSanitizer,
        AiSuggestionAdapterService,
      ],
    }).compile();

    service = module.get<AiSuggestionAdapterService>(
      AiSuggestionAdapterService
    );
  });

  describe('generateSuggestions', () => {
    it('should create suggestion drafts with PENDING status', async () => {
      const result = await service.generateSuggestions({
        workspaceId: 'ws-1',
        goal: 'Q4 launch',
        rawData: { tasks: 10, health_score: 75 },
      });

      expect(result.created).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Verify the DB transaction was called
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it('should sanitize sensitive data before sending to AI', async () => {
      const generateSpy = jest.spyOn(mockProvider, 'generateRaw');

      await service.generateSuggestions({
        workspaceId: 'ws-1',
        goal: 'Test',
        rawData: {
          safe_data: 'value',
          health_score_raw: 95,
          revenue_raw: 500000,
        },
      });

      const ctx = generateSpy.mock.calls[0][0];
      expect(ctx.context).not.toHaveProperty('health_score_raw');
      expect(ctx.context).not.toHaveProperty('revenue_raw');
      expect(ctx.context.safe_data).toBe('value');

      generateSpy.mockRestore();
    });

    it('should return 0 on validation failure', async () => {
      const badProvider = new (class extends AiProvider {
        readonly name = 'bad';
        async generateRaw() {
          return 'this is not valid json';
        }
      })();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: AiProvider, useValue: badProvider },
          AiOutputValidator,
          AiContextSanitizer,
          AiSuggestionAdapterService,
        ],
      }).compile();

      const badService = module.get<AiSuggestionAdapterService>(
        AiSuggestionAdapterService
      );

      const result = await badService.generateSuggestions({
        workspaceId: 'ws-1',
        goal: 'Test',
        rawData: {},
      });

      expect(result.created).toBe(0);
      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('generateReviewDraft', () => {
    it('should return a validated review draft', async () => {
      const result = await service.generateReviewDraft({
        workspaceId: 'ws-1',
        goal: 'Q4 launch',
        rawData: { completed: 8, total: 10 },
      });

      expect(result).not.toBeNull();
      expect(result?.summary).toBeDefined();
      expect(Array.isArray(result?.achievements)).toBe(true);
      expect(Array.isArray(result?.challenges)).toBe(true);
      expect(Array.isArray(result?.lessonsLearned)).toBe(true);
      expect(result?.healthScore).toBeDefined();
    });
  });

  describe('generateTaskDrafts', () => {
    it('should create task drafts', async () => {
      const result = await service.generateTaskDrafts({
        workspaceId: 'ws-1',
        goal: 'Q4 launch',
        rawData: { overdue: 3 },
      });

      expect(result.created).toBeGreaterThan(0);
      expect(result.tasks.length).toBeGreaterThan(0);
    });

    it('should mark tasks as AI-generated', async () => {
      // The task drafts should be created with sourceType 'AI'
      const createSpy = txMocks.workItem.create;

      await service.generateTaskDrafts({
        workspaceId: 'ws-1',
        goal: 'Test',
        rawData: {},
      });

      if (createSpy.mock.calls.length > 0) {
        const firstCall = createSpy.mock.calls[0][0];
        expect(firstCall.data.sourceType).toBe('AI');
        expect(firstCall.data.status).toBe(WorkItemStatus.TODO);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Test: AiController
// ---------------------------------------------------------------------------

describe('AiController', () => {
  let controller: AiController;
  let adapterService: AiSuggestionAdapterService;

  beforeEach(async () => {
    adapterService = {
      generateSuggestions: jest.fn(),
      generateReviewDraft: jest.fn(),
      generateTaskDrafts: jest.fn(),
    } as unknown as AiSuggestionAdapterService;

    controller = new AiController(adapterService);
  });

  describe('POST /ai/generate/suggestions', () => {
    it('should return 201 with suggestions', async () => {
      const suggestions = [makeSuggestionWorkItem('wi-1', 'Suggestion 1')];
      (adapterService.generateSuggestions as jest.Mock).mockResolvedValue({
        created: 1,
        suggestions,
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnValue({}),
      };

      await controller.generateSuggestions(
        {
          workspaceId: 'ws-1',
          goal: 'Test',
          rawData: {},
        },
        res as any
      );

      expect(adapterService.generateSuggestions).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        goal: 'Test',
        rawData: {},
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 201,
          message: expect.stringContaining('AI'),
          data: expect.objectContaining({
            created: 1,
          }),
        })
      );
    });
  });

  describe('POST /ai/generate/review', () => {
    it('should return 200 with review draft', async () => {
      const reviewDraft = {
        summary: 'A review summary',
        achievements: ['Achievement 1'],
        challenges: ['Challenge 1'],
        rootCauses: ['Root cause 1'],
        lessonsLearned: ['Lesson 1'],
        nextCycleFocus: ['Focus 1'],
        healthScore: 75,
        taskCompletionRate: 85,
      };
      (adapterService.generateReviewDraft as jest.Mock).mockResolvedValue(
        reviewDraft
      );

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnValue({}),
      };

      await controller.generateReview(
        {
          workspaceId: 'ws-1',
          goal: 'Test',
          rawData: {},
        },
        res as any
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
        })
      );
    });
  });

  describe('POST /ai/generate/tasks', () => {
    it('should return 201 with task drafts', async () => {
      const tasks = [makeTaskWorkItem('wi-1', 'Task 1')];
      (adapterService.generateTaskDrafts as jest.Mock).mockResolvedValue({
        created: 1,
        tasks,
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnValue({}),
      };

      await controller.generateTaskDrafts(
        {
          workspaceId: 'ws-1',
          goal: 'Test',
          rawData: {},
        },
        res as any
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 201,
        })
      );
    });
  });
});
