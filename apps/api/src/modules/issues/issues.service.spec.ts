import { Test, TestingModule } from '@nestjs/testing';
import { IssuesService } from './issues.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { WorkItemStatus, WorkItemType, PdcaStage, IssueStatus, GapType } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('IssuesService', () => {
  let service: IssuesService;
  let mockPrismaClient: any;

  beforeEach(async () => {
    mockPrismaClient = {
      workItem: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      issueDetail: {
        create: jest.fn(),
        update: jest.fn(),
      },
      metricGap: {
        updateMany: jest.fn(),
      },
      workspace: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (callback: any) => {
        return callback(mockPrismaClient);
      }),
    };

    const mockPrismaService = {
      get client() {
        return mockPrismaClient;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IssuesService>(IssuesService);
  });

  describe('createIssue', () => {
    it('should create an issue successfully', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });

      const createdIssue = {
        id: 'issue-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.ISSUE,
        status: WorkItemStatus.ACTIVE,
        issueDetail: { status: IssueStatus.OPEN },
      };
      mockPrismaClient.workItem.create.mockResolvedValue(createdIssue);

      const result = await service.createIssue({
        workspaceId: 'ws-1',
        title: 'Test Issue',
        description: 'Test description',
      });

      expect(result.id).toBe('issue-1');
      expect(mockPrismaClient.workItem.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate open issue (same metric+gapType)', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });

      const existingIssue = {
        id: 'existing-issue',
        workspaceId: 'ws-1',
        itemType: WorkItemType.ISSUE,
        status: WorkItemStatus.ACTIVE,
      };
      mockPrismaClient.workItem.findFirst.mockResolvedValue(existingIssue);

      await expect(
        service.createIssue({
          workspaceId: 'ws-1',
          title: 'Duplicate Issue',
          metricName: 'content_planning_progress',
          gapType: GapType.BELOW_TARGET,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT throw for issues without metric/gapType', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue({ id: 'ws-1' });

      // findFirst should NOT be called when no metricName/gapType
      const createdIssue = {
        id: 'issue-2',
        workspaceId: 'ws-1',
        itemType: WorkItemType.ISSUE,
        status: WorkItemStatus.ACTIVE,
        issueDetail: { status: IssueStatus.OPEN },
      };
      mockPrismaClient.workItem.create.mockResolvedValue(createdIssue);

      const result = await service.createIssue({
        workspaceId: 'ws-1',
        title: 'Regular Issue',
      });

      expect(result.id).toBe('issue-2');
    });
  });

  describe('getIssueById', () => {
    it('should return issue when it exists', async () => {
      const issue = {
        id: 'issue-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.ISSUE,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        issueDetail: { status: IssueStatus.OPEN },
      };
      mockPrismaClient.workItem.findUnique.mockResolvedValue(issue);

      const result = await service.getIssueById('issue-1', 'ws-1');

      expect(result.id).toBe('issue-1');
    });

    it('should throw NotFoundException for non-existent issue', async () => {
      mockPrismaClient.workItem.findUnique.mockResolvedValue(null);

      await expect(
        service.getIssueById('non-existent', 'ws-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for wrong workspace', async () => {
      const issue = {
        id: 'issue-1',
        workspaceId: 'ws-other',
        itemType: WorkItemType.ISSUE,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
      };
      mockPrismaClient.workItem.findUnique.mockResolvedValue(issue);

      await expect(
        service.getIssueById('issue-1', 'ws-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveIssue', () => {
    it('should resolve an open issue', async () => {
      const issue = {
        id: 'issue-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.ISSUE,
        status: WorkItemStatus.ACTIVE,
        deletedAt: null,
        issueDetail: { status: IssueStatus.OPEN },
      };

      const resolvedIssue = {
        ...issue,
        status: WorkItemStatus.COMPLETED,
        issueDetail: { status: IssueStatus.RESOLVED },
      };

      mockPrismaClient.workItem.findUnique
        .mockResolvedValueOnce(issue)   // getIssueById
        .mockResolvedValueOnce(resolvedIssue); // return value after update
      mockPrismaClient.issueDetail.update.mockResolvedValue({ status: IssueStatus.RESOLVED });
      mockPrismaClient.workItem.update.mockResolvedValue(resolvedIssue);

      const result = await service.resolveIssue('issue-1', 'ws-1');

      expect(result.status).toBe(WorkItemStatus.COMPLETED);
      expect(mockPrismaClient.issueDetail.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException for already resolved issue', async () => {
      const issue = {
        id: 'issue-1',
        workspaceId: 'ws-1',
        itemType: WorkItemType.ISSUE,
        status: WorkItemStatus.COMPLETED,
        deletedAt: null,
        issueDetail: { status: IssueStatus.RESOLVED },
      };
      mockPrismaClient.workItem.findUnique.mockResolvedValue(issue);

      await expect(
        service.resolveIssue('issue-1', 'ws-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listIssues', () => {
    it('should list issues with filters', async () => {
      const issues = [
        { id: 'issue-1', title: 'Issue 1' },
        { id: 'issue-2', title: 'Issue 2' },
      ];

      mockPrismaClient.workItem.count.mockResolvedValue(2);
      mockPrismaClient.workItem.findMany.mockResolvedValue(issues);

      const result = await service.listIssues('ws-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});
