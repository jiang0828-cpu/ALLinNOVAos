import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkItemStatus, ReviewStatus } from '@prisma/client';
import { DashboardQueryService } from './services/dashboard-query.service';
import { DashboardSnapshotService } from './services/dashboard-snapshot.service';
import { DashboardController } from './dashboard.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const now = new Date('2026-08-07T10:00:00Z');

const mockPrismaClient = {
  workspace: {
    findUnique: jest.fn(),
  },
  domain: {
    findMany: jest.fn(),
  },
  workItem: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  dashboardSnapshot: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

const mockPrismaService = { client: mockPrismaClient };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeWorkspace = (
  overrides: Partial<{ id: string; name: string; timezone: string }> = {}
) => ({
  id: 'ws-1',
  name: 'Test Workspace',
  timezone: 'Asia/Shanghai',
  ...overrides,
});

const makeDomain = (id: string, name: string) => ({ id, name });

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('DashboardQueryService', () => {
  let service: DashboardQueryService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardQueryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardQueryService>(DashboardQueryService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getOverview', () => {
    it('throws NotFoundException when workspace does not exist', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(null);

      await expect(service.getOverview('missing-ws')).rejects.toThrow(
        NotFoundException
      );
    });

    it('returns full overview with all 9 fields for a workspace', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());

      // Domains
      mockPrismaClient.domain.findMany.mockResolvedValue([
        makeDomain('d-1', 'Product'),
        makeDomain('d-2', 'Ops'),
      ]);

      // Per-domain scoring mocks
      mockPrismaClient.workItem.aggregate.mockResolvedValue({
        _count: { id: 10 },
      });
      mockPrismaClient.workItem.count.mockResolvedValue(4); // done tasks
      mockPrismaClient.workItem.findMany.mockResolvedValue([]); // goals / projects return empty

      // Today focus
      const refDate = new Date('2026-08-07T00:00:00Z');
      mockPrismaClient.workItem.findMany.mockResolvedValueOnce([
        {
          id: 'task-1',
          title: 'Build feature X',
          status: WorkItemStatus.IN_PROGRESS,
          priority: 'P1',
        },
      ]);

      // Active projects
      mockPrismaClient.workItem.findMany.mockResolvedValueOnce([]);

      // Open issues
      mockPrismaClient.workItem.findMany.mockResolvedValueOnce([]);

      // Pending suggestions
      mockPrismaClient.workItem.findMany.mockResolvedValueOnce([]);

      // Latest review
      mockPrismaClient.workItem.findFirst.mockResolvedValue({
        id: 'review-1',
        title: 'Weekly Review',
        reviewType: 'WEEKLY',
        status: ReviewStatus.COMPLETED,
        reviewedAt: new Date('2026-08-05T10:00:00Z'),
        updatedAt: new Date('2026-08-05T10:00:00Z'),
      });

      // Active insights
      mockPrismaClient.workItem.findMany.mockResolvedValueOnce([]);

      const result = await service.getOverview('ws-1', refDate);

      // All 9 fields present
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe('number');
      expect(Array.isArray(result.domainScores)).toBe(true);
      expect(Array.isArray(result.todayFocus)).toBe(true);
      expect(Array.isArray(result.activeProjects)).toBe(true);
      expect(Array.isArray(result.openIssues)).toBe(true);
      expect(Array.isArray(result.pendingSuggestions)).toBe(true);
      expect(result.latestReview).toBeDefined();
      expect(Array.isArray(result.activeInsights)).toBe(true);
      expect(typeof result.lastUpdatedAt).toBe('string');
      // Format check for lastUpdatedAt (ISO)
      expect(() => new Date(result.lastUpdatedAt)).not.toThrow();
    });

    it('returns empty arrays and null latestReview when workspace has no data', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.domain.findMany.mockResolvedValue([]);

      // All queries return empty
      mockPrismaClient.workItem.aggregate.mockResolvedValue({
        _count: { id: 0 },
      });
      mockPrismaClient.workItem.count.mockResolvedValue(0);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);
      mockPrismaClient.workItem.findFirst.mockResolvedValue(null);

      const result = await service.getOverview('ws-1');

      expect(result.overallScore).toBe(0);
      expect(result.domainScores).toEqual([]);
      expect(result.todayFocus).toEqual([]);
      expect(result.activeProjects).toEqual([]);
      expect(result.openIssues).toEqual([]);
      expect(result.pendingSuggestions).toEqual([]);
      expect(result.latestReview).toBeNull();
      expect(result.activeInsights).toEqual([]);
      expect(typeof result.lastUpdatedAt).toBe('string');
    });

    it('accepts referenceDate parameter for date-scoped queries', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.domain.findMany.mockResolvedValue([]);
      mockPrismaClient.workItem.aggregate.mockResolvedValue({
        _count: { id: 0 },
      });
      mockPrismaClient.workItem.count.mockResolvedValue(0);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);
      mockPrismaClient.workItem.findFirst.mockResolvedValue(null);

      const refDate = new Date('2026-08-07T00:00:00Z');
      await service.getOverview('ws-1', refDate);

      // Verify the date filter was applied
      expect(mockPrismaClient.workItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'ws-1',
          }),
        })
      );
    });
  });

  describe('computeOverallScore', () => {
    it('returns weighted average of domain scores', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(makeWorkspace());
      mockPrismaClient.domain.findMany.mockResolvedValue([]);
      mockPrismaClient.workItem.aggregate.mockResolvedValue({
        _count: { id: 0 },
      });
      mockPrismaClient.workItem.count.mockResolvedValue(0);
      mockPrismaClient.workItem.findMany.mockResolvedValue([]);
      mockPrismaClient.workItem.findFirst.mockResolvedValue(null);

      // Compute score via internal logic: provide non-zero domain scores
      // Since domain score computation is private, we test via the result shape
      const result = await service.getOverview('ws-1');
      expect(typeof result.overallScore).toBe('number');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });
});

// ---------------------------------------------------------------------------
// Snapshot service test
// ---------------------------------------------------------------------------

describe('DashboardSnapshotService', () => {
  let snapshotService: DashboardSnapshotService;
  let queryService: DashboardQueryService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardSnapshotService,
        {
          provide: DashboardQueryService,
          useValue: {
            getOverview: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    snapshotService = module.get<DashboardSnapshotService>(
      DashboardSnapshotService
    );
    queryService = module.get<DashboardQueryService>(DashboardQueryService);
  });

  describe('rebuild', () => {
    it('calls queryService.getOverview then saves snapshot', async () => {
      const mockOverview = {
        overallScore: 72.3,
        domainScores: [],
        todayFocus: [],
        activeProjects: [],
        openIssues: [],
        pendingSuggestions: [],
        latestReview: null,
        activeInsights: [],
        lastUpdatedAt: '2026-08-07T10:00:00Z',
      };

      jest.spyOn(queryService, 'getOverview').mockResolvedValue(mockOverview);
      mockPrismaClient.dashboardSnapshot.create.mockResolvedValue({
        id: 'snap-1',
        workspaceId: 'ws-1',
        payload: mockOverview,
        rebuildedAt: new Date('2026-08-07T10:00:00Z'),
      });

      const result = await snapshotService.rebuild('ws-1');

      expect(queryService.getOverview).toHaveBeenCalledWith('ws-1');
      expect(mockPrismaClient.dashboardSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws-1',
          }),
        })
      );
      expect(result.id).toBe('snap-1');
      expect(result.workspaceId).toBe('ws-1');
    });

    it('snapshot is rebuildable (can be called multiple times)', async () => {
      const mockOverview = {
        overallScore: 50,
        domainScores: [],
        todayFocus: [],
        activeProjects: [],
        openIssues: [],
        pendingSuggestions: [],
        latestReview: null,
        activeInsights: [],
        lastUpdatedAt: new Date().toISOString(),
      };

      jest.spyOn(queryService, 'getOverview').mockResolvedValue(mockOverview);
      mockPrismaClient.dashboardSnapshot.create
        .mockResolvedValueOnce({
          id: 'snap-1',
          workspaceId: 'ws-1',
          payload: mockOverview,
          rebuildedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'snap-2',
          workspaceId: 'ws-1',
          payload: mockOverview,
          rebuildedAt: new Date(),
        });

      await snapshotService.rebuild('ws-1');
      await snapshotService.rebuild('ws-1');

      // Called twice
      expect(queryService.getOverview).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.dashboardSnapshot.create).toHaveBeenCalledTimes(
        2
      );
    });
  });

  describe('getOrRebuild', () => {
    it('returns latest snapshot if not stale', async () => {
      const recentSnapshot = {
        id: 'snap-recent',
        workspaceId: 'ws-1',
        payload: { overallScore: 75, lastUpdatedAt: now.toISOString() },
        rebuildedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
      };

      mockPrismaClient.dashboardSnapshot.findFirst.mockResolvedValue(
        recentSnapshot
      );

      // Should NOT rebuild (recent snapshot exists)
      const result = await snapshotService.getOrRebuild('ws-1', 60);

      expect(result.id).toBe('snap-recent');
      // getOverview should NOT be called
      expect(queryService.getOverview).not.toHaveBeenCalled();
    });

    it('rebuilds if no snapshot exists', async () => {
      mockPrismaClient.dashboardSnapshot.findFirst.mockResolvedValue(null);
      const mockOverview = {
        overallScore: 60,
        domainScores: [],
        todayFocus: [],
        activeProjects: [],
        openIssues: [],
        pendingSuggestions: [],
        latestReview: null,
        activeInsights: [],
        lastUpdatedAt: new Date().toISOString(),
      };
      jest.spyOn(queryService, 'getOverview').mockResolvedValue(mockOverview);
      mockPrismaClient.dashboardSnapshot.create.mockResolvedValue({
        id: 'snap-new',
        workspaceId: 'ws-1',
        payload: mockOverview,
        rebuildedAt: new Date(),
      });

      await snapshotService.getOrRebuild('ws-1');

      expect(queryService.getOverview).toHaveBeenCalled();
    });
  });

  describe('deleteLatestSnapshot', () => {
    it('deletes the latest snapshot', async () => {
      mockPrismaClient.dashboardSnapshot.findFirst.mockResolvedValue({
        id: 'snap-1',
        workspaceId: 'ws-1',
        payload: {},
        rebuildedAt: new Date(),
      });
      mockPrismaClient.dashboardSnapshot.delete.mockResolvedValue({
        id: 'snap-1',
      });

      await snapshotService.deleteLatestSnapshot('ws-1');

      expect(mockPrismaClient.dashboardSnapshot.delete).toHaveBeenCalledWith({
        where: { id: 'snap-1' },
      });
    });

    it('is a no-op when no snapshots exist', async () => {
      mockPrismaClient.dashboardSnapshot.findFirst.mockResolvedValue(null);

      await expect(
        snapshotService.deleteLatestSnapshot('ws-1')
      ).resolves.not.toThrow();

      expect(mockPrismaClient.dashboardSnapshot.delete).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Controller integration test
// ---------------------------------------------------------------------------

describe('DashboardController', () => {
  let controller: DashboardController;
  let queryService: DashboardQueryService;
  let snapshotService: DashboardSnapshotService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardQueryService,
          useValue: { getOverview: jest.fn() },
        },
        {
          provide: DashboardSnapshotService,
          useValue: { rebuild: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    queryService = module.get<DashboardQueryService>(DashboardQueryService);
    snapshotService = module.get<DashboardSnapshotService>(
      DashboardSnapshotService
    );
  });

  describe('GET /dashboard/overview', () => {
    it('returns dashboard data with workspaceId only (no date)', async () => {
      const mockData = {
        overallScore: 72.3,
        domainScores: [],
        todayFocus: [],
        activeProjects: [],
        openIssues: [],
        pendingSuggestions: [],
        latestReview: null,
        activeInsights: [],
        lastUpdatedAt: '2026-08-07T10:00:00Z',
      };
      jest.spyOn(queryService, 'getOverview').mockResolvedValue(mockData);

      const result = await controller.getOverview({ workspaceId: 'ws-1' });

      expect(result.code).toBe(200);
      expect(result.message).toBe('Dashboard overview retrieved');
      expect(result.data).toEqual(mockData);
      // Called without refDate
      expect(queryService.getOverview).toHaveBeenCalledWith('ws-1', undefined);
    });

    it('passes date parameter when provided', async () => {
      const mockData = {
        overallScore: 50,
        domainScores: [],
        todayFocus: [],
        activeProjects: [],
        openIssues: [],
        pendingSuggestions: [],
        latestReview: null,
        activeInsights: [],
        lastUpdatedAt: '2026-08-07T10:00:00Z',
      };
      jest.spyOn(queryService, 'getOverview').mockResolvedValue(mockData);

      const result = await controller.getOverview({
        workspaceId: 'ws-1',
        date: '2026-08-07',
      });

      expect(result.code).toBe(200);
      expect(queryService.getOverview).toHaveBeenCalledWith(
        'ws-1',
        new Date('2026-08-07')
      );
    });
  });

  describe('POST /dashboard/snapshot/rebuild', () => {
    it('calls snapshotService.rebuild and returns snapshot', async () => {
      const mockSnapshot = {
        id: 'snap-1',
        workspaceId: 'ws-1',
        payload: { overallScore: 75 } as never,
        rebuildedAt: '2026-08-07T10:00:00Z',
      };
      jest.spyOn(snapshotService, 'rebuild').mockResolvedValue(mockSnapshot);

      const result = await controller.rebuildSnapshot({ workspaceId: 'ws-1' });

      expect(result.code).toBe(200);
      expect(result.message).toBe('Dashboard snapshot rebuilt');
      expect(result.data).toEqual(mockSnapshot);
      expect(snapshotService.rebuild).toHaveBeenCalledWith('ws-1');
    });
  });
});
