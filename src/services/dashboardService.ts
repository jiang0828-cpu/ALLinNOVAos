// src/services/dashboardService.ts
// 全局指挥台数据服务 —— 抽象层，支持 Mock 数据与 API 数据源切换

import { dashboardSnapshot } from '../data/dashboardMock';
import type { DashboardSnapshot } from '../types/dashboard';

/**
 * 获取全局指挥台快照数据
 * Phase 1: 返回本地 Mock 数据
 * Phase 2: 替换为 fetch('/api/dashboard')
 */
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  // Phase 2 示例：
  // const res = await fetch('/api/dashboard');
  // return res.json();

  // 当前：Phase 1 本地 Mock
  return Promise.resolve(dashboardSnapshot);
}
