// src/services/dashboardService.ts
// Dashboard data service — Phase 2: Real API with graceful fallback to Mock

import { adaptBackendToSnapshot } from './dashboard-adapter';
import { dashboardSnapshot as mockSnapshot } from '../data/dashboardMock';
import type { DashboardSnapshot } from '../types/dashboard';
import { getLocalDashboardOverview } from './localBackupStore';
import { buildApiUrl } from './apiClient';

const DEFAULT_WORKSPACE_ID = 'ws_default';

export function getLocalDashboardSnapshot(
  workspaceId: string = DEFAULT_WORKSPACE_ID
): DashboardSnapshot {
  return {
    ...adaptBackendToSnapshot(getLocalDashboardOverview(), workspaceId),
    dataSource: 'local',
  };
}

/**
 * Fetch dashboard snapshot from the real API.
 * Falls back to mock data when the backend is unreachable
 * (so the UI still works during offline development).
 */
export async function getDashboardSnapshot(
  workspaceId: string = DEFAULT_WORKSPACE_ID,
  date?: string
): Promise<DashboardSnapshot> {
  try {
    const params = new URLSearchParams({ workspaceId });
    if (date) params.set('date', date);

    const response = await fetch(buildApiUrl(`/dashboard/overview?${params.toString()}`));
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

    const body = await response.json();
    const isSuccess = body.code === 0 || (body.code >= 200 && body.code < 300);
    if (!isSuccess) throw new Error(body.message || `API error: code=${body.code}`);

    return {
      ...adaptBackendToSnapshot(body.data, workspaceId),
      dataSource: 'online',
    };
  } catch (err) {
    if (typeof window !== 'undefined') {
      return getLocalDashboardSnapshot(workspaceId);
    }

    console.warn('[dashboard] API and local store unavailable, falling back to mock:', (err as Error).message);
    return { ...mockSnapshot, dataSource: 'mock' };
  }
}
