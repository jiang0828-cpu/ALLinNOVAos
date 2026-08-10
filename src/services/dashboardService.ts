// src/services/dashboardService.ts
// Dashboard data service — Phase 2: Real API with graceful fallback to Mock

import { apiClient } from './apiClient';
import { adaptBackendToSnapshot } from './dashboard-adapter';
import { dashboardSnapshot as mockSnapshot } from '../data/dashboardMock';
import type { DashboardSnapshot } from '../types/dashboard';

const DEFAULT_WORKSPACE_ID = 'ws_default';

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

    const backend = await apiClient.get<import('./dashboard-adapter').DashboardOverviewResponse>(
      `/dashboard/overview?${params.toString()}`
    );
    return adaptBackendToSnapshot(backend, workspaceId);
  } catch (err) {
    console.warn('[dashboard] API unreachable, falling back to mock:', (err as Error).message);
    return mockSnapshot;
  }
}
