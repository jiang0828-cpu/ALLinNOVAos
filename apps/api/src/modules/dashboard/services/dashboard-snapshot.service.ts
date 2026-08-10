import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { DashboardQueryService } from './dashboard-query.service';
import {
  DashboardOverviewResponseDto,
  DashboardSnapshotResponseDto,
} from '../dto/dashboard-response.dto';

/**
 * DashboardSnapshotService
 *
 * Caching layer for the dashboard. Snapshots are rebuildable (requirement #7)
 * and are NOT the source of truth (requirement #4). Real-time queries via
 * DashboardQueryService always take precedence; snapshots serve as a fallback
 * or optimisation for future cache implementations.
 */
@Injectable()
export class DashboardSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: DashboardQueryService
  ) {}

  /**
   * Get the latest snapshot for a workspace, or rebuild one if none exists
   * or if the latest snapshot is stale.
   */
  async getOrRebuild(
    workspaceId: string,
    maxAgeMinutes: number = 60
  ): Promise<DashboardSnapshotResponseDto> {
    const latest = await this.prisma.client.dashboardSnapshot.findFirst({
      where: { workspaceId },
      orderBy: { rebuildedAt: 'desc' },
    });

    if (latest) {
      const ageMs = Date.now() - latest.rebuildedAt.getTime();
      if (ageMs < maxAgeMinutes * 60 * 1000) {
        return this.toSnapshotResponse(latest);
      }
    }

    // Rebuild
    return this.rebuild(workspaceId);
  }

  /**
   * Force rebuild the snapshot for a workspace.
   */
  async rebuild(workspaceId: string): Promise<DashboardSnapshotResponseDto> {
    // Always get fresh data via the query service
    const overview = await this.queryService.getOverview(workspaceId);

    // Save as new snapshot
    const snapshot = await this.prisma.client.dashboardSnapshot.create({
      data: {
        workspaceId,
        payload: overview as unknown as Prisma.InputJsonValue,
        rebuildedAt: new Date(),
      },
    });

    return {
      id: snapshot.id,
      workspaceId: snapshot.workspaceId,
      payload: overview,
      rebuildedAt: snapshot.rebuildedAt.toISOString(),
    };
  }

  /**
   * Delete the latest snapshot for a workspace (forces rebuild on next access).
   */
  async deleteLatestSnapshot(workspaceId: string): Promise<void> {
    const latest = await this.prisma.client.dashboardSnapshot.findFirst({
      where: { workspaceId },
      orderBy: { rebuildedAt: 'desc' },
    });

    if (latest) {
      await this.prisma.client.dashboardSnapshot.delete({
        where: { id: latest.id },
      });
    }
  }

  private toSnapshotResponse(
    snapshot: {
      id: string;
      workspaceId: string;
      payload: Prisma.JsonValue;
      rebuildedAt: Date;
    } | null
  ): DashboardSnapshotResponseDto {
    const payload = (snapshot?.payload ??
      {}) as unknown as DashboardOverviewResponseDto;
    return {
      id: snapshot!.id,
      workspaceId: snapshot!.workspaceId,
      payload,
      rebuildedAt: snapshot!.rebuildedAt.toISOString(),
    };
  }
}
