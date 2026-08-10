import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ---- Nested DTOs ----

export class DomainScoreDto {
  @ApiProperty({ example: 'domain-001' })
  domainId: string;

  @ApiProperty({ example: 'Product' })
  domainName: string;

  @ApiProperty({ example: 78.5, description: 'Score 0-100' })
  score: number;
}

export class TodayFocusItemDto {
  @ApiProperty({ example: 'task-001' })
  id: string;

  @ApiProperty({ example: 'Complete API integration' })
  title: string;

  @ApiProperty({ example: 'TASK' })
  itemType: string;

  @ApiPropertyOptional({ example: 'IN_PROGRESS' })
  status?: string;

  @ApiPropertyOptional({ example: 'P1' })
  priority?: string;
}

export class ActiveProjectDto {
  @ApiProperty({ example: 'project-001' })
  id: string;

  @ApiProperty({ example: 'NestJS Dashboard' })
  title: string;

  @ApiProperty({ example: 65.0, description: 'Progress 0-100' })
  progress: number;

  @ApiProperty({ example: 'ON_TRACK' })
  healthStatus: string;
}

export class OpenIssueDto {
  @ApiProperty({ example: 'issue-001' })
  id: string;

  @ApiProperty({ example: 'Database connection timeout' })
  title: string;

  @ApiProperty({ example: 'HIGH' })
  level: string;

  @ApiProperty({ example: 'OPEN' })
  status: string;
}

export class PendingSuggestionDto {
  @ApiProperty({ example: 'suggestion-001' })
  id: string;

  @ApiProperty({ example: 'Reduce API latency by 20%' })
  title: string;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiPropertyOptional({ example: 85, description: 'Impact score 0-100' })
  impactScore?: number;
}

export class LatestReviewDto {
  @ApiProperty({ example: 'review-001' })
  id: string;

  @ApiProperty({ example: 'Week 32 复盘' })
  title: string;

  @ApiProperty({ example: 'WEEKLY' })
  reviewType: string;

  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiProperty({ example: '2026-08-05T10:00:00Z' })
  reviewedAt: string;
}

export class ActiveInsightDto {
  @ApiProperty({ example: 'insight-001' })
  id: string;

  @ApiProperty({ example: 'Early morning coding boosts productivity' })
  statement: string;

  @ApiProperty({ example: 'SUCCESS_FACTOR' })
  insightType: string;

  @ApiProperty({ example: 0.85, description: 'Confidence 0-1' })
  confidence: number;

  @ApiProperty({ example: 75, description: 'Impact score 0-100' })
  impactScore: number;
}

// ---- Top-level response DTOs ----

export class DashboardOverviewResponseDto {
  @ApiProperty({
    description: 'Overall workspace health score (0-100)',
    example: 72.3,
  })
  overallScore: number;

  @ApiProperty({
    description: 'Per-domain scores',
    type: [DomainScoreDto],
    example: [
      { domainId: 'd-1', domainName: 'Product', score: 85 },
      { domainId: 'd-2', domainName: 'Ops', score: 60 },
    ],
  })
  domainScores: DomainScoreDto[];

  @ApiProperty({
    description: 'Items scheduled for today (tasks, goals)',
    type: [TodayFocusItemDto],
    example: [
      {
        id: 't-1',
        title: 'Fix dashboard bug',
        itemType: 'TASK',
        status: 'IN_PROGRESS',
        priority: 'P1',
      },
    ],
  })
  todayFocus: TodayFocusItemDto[];

  @ApiProperty({
    description: 'Active projects (not completed)',
    type: [ActiveProjectDto],
    example: [
      {
        id: 'p-1',
        title: 'Mobile App',
        progress: 45.0,
        healthStatus: 'ON_TRACK',
      },
    ],
  })
  activeProjects: ActiveProjectDto[];

  @ApiProperty({
    description: 'Open issues',
    type: [OpenIssueDto],
    example: [
      {
        id: 'i-1',
        title: 'Memory leak in scheduler',
        level: 'HIGH',
        status: 'OPEN',
      },
    ],
  })
  openIssues: OpenIssueDto[];

  @ApiProperty({
    description: 'Pending suggestions (not accepted/dismissed)',
    type: [PendingSuggestionDto],
    example: [
      {
        id: 's-1',
        title: 'Add caching layer',
        status: 'PENDING',
        impactScore: 85,
      },
    ],
  })
  pendingSuggestions: PendingSuggestionDto[];

  @ApiProperty({
    description: 'Latest review across all review types',
    type: LatestReviewDto,
    nullable: true,
    example: {
      id: 'r-1',
      title: 'Week 32 复盘',
      reviewType: 'WEEKLY',
      status: 'COMPLETED',
      reviewedAt: '2026-08-05T10:00:00Z',
    },
  })
  latestReview: LatestReviewDto | null;

  @ApiProperty({
    description: 'Active insights (status = ACTIVE)',
    type: [ActiveInsightDto],
    example: [
      {
        id: 'ins-1',
        statement: 'Reviewing before sleeping improves accuracy',
        insightType: 'SUCCESS_FACTOR',
        confidence: 0.85,
        impactScore: 75,
      },
    ],
  })
  activeInsights: ActiveInsightDto[];

  @ApiProperty({
    description: 'Timestamp of last data refresh',
    example: '2026-08-07T10:30:00Z',
  })
  lastUpdatedAt: string;
}

export class DashboardSnapshotResponseDto {
  @ApiProperty({ example: 'snapshot-001' })
  id: string;

  @ApiProperty({ example: 'workspace-001' })
  workspaceId: string;

  @ApiProperty({ type: DashboardOverviewResponseDto })
  payload: DashboardOverviewResponseDto;

  @ApiProperty({ example: '2026-08-07T10:30:00Z' })
  rebuildedAt: string;
}
