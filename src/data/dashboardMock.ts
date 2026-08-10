// src/data/dashboardMock.ts
// 全局指挥台 Mock 数据（离线开发用，生产环境使用真实 API）

import type { DashboardSnapshot } from '../types/dashboard';

export const dashboardSnapshot: DashboardSnapshot = {
  workspaceId: 'ws_mock_001',
  generatedAt: '2026-08-06T12:00:00+08:00',

  stateTarget: {
    lifeScore: 82,
    breakdown: [
      { label: '健康', value: 78, weight: 0.2 },
      { label: '财富', value: 84, weight: 0.2 },
      { label: '工作', value: 72, weight: 0.2 },
      { label: '内容', value: 88, weight: 0.2 },
      { label: '学习', value: 76, weight: 0.2 },
    ],
  },

  todayFocus: [
    {
      id: 'task_001',
      title: '完成 NOVA OS MVP 首页验收',
      system: 'AGI OS',
      priority: 'P0',
      eta: '示例',
      status: 'IN_PROGRESS',
    },
    {
      id: 'task_002',
      title: '整理示例重点项目',
      system: 'Work OS',
      priority: 'P1',
      eta: '示例',
      status: 'TODO',
    },
    {
      id: 'task_003',
      title: '安排示例健康行动',
      system: 'Life OS',
      priority: 'P1',
      eta: '示例',
      status: 'TODO',
    },
    {
      id: 'task_004',
      title: '复盘示例内容节奏',
      system: 'Media OS',
      priority: 'P2',
      eta: '示例',
      status: 'TODO',
    },
  ],

  feeds: {
    news: [
      { id: 'feed_001', source: 'TechCrunch', time: '今日', title: 'AI 行业动态' },
      { id: 'feed_002', source: '医学界', time: '昨日', title: '健康生活趋势' },
    ],
    ideas: [
      { id: 'idea_001', title: '健康数据可视化' },
      { id: 'idea_002', title: 'AI 周报自动生成' },
      { id: 'idea_003', title: '社群运营新玩法' },
    ],
    plans: [
      { id: 'plan_001', title: 'NOVA OS V2 路线图', progress: 65 },
      { id: 'plan_002', title: 'Q3 内容规划', progress: 40 },
    ],
  },

  openIssues: [
    {
      id: 'issue_001',
      title: 'API 响应延迟偶发超过 3 秒',
      level: 'MEDIUM',
      status: 'OPEN',
    },
    {
      id: 'issue_002',
      title: '数据库连接池接近上限',
      level: 'HIGH',
      status: 'IN_PROGRESS',
    },
  ],

  latestReview: {
    id: 'review_001',
    title: '第 32 周复盘',
    reviewType: 'WEEKLY',
    status: 'COMPLETED',
    reviewedAt: '2026-08-05T18:00:00+08:00',
  },

  activeInsightsCount: 3,

  aiSuggestions: [
    {
      id: '1',
      title: '推进 NOVA OS V2 核心功能',
      source: '目标达成 + PLANS',
      reason: 'V2 路线图进度 65%，今日可完成核心模块验收',
      priority: 'P0',
      time: '90 分钟',
      isConverted: false,
    },
    {
      id: '2',
      title: '订阅 AI 行业动态周报',
      source: 'NEWS + IDEAS',
      reason: 'AI 行业资讯密集，自动化收集可节省 2 小时/周',
      priority: 'P1',
      time: '20 分钟',
      isConverted: false,
    },
    {
      id: '3',
      title: '完成健康数据日报',
      source: '目标达成 + NEWS',
      reason: '健康评分 78，低于 80 基准线，需加强监测',
      priority: 'P1',
      time: '15 分钟',
      isConverted: false,
    },
    {
      id: '4',
      title: '整理 Q3 内容框架',
      source: 'PLANS + IDEAS',
      reason: '内容规划进度 40%，本周需确定主题方向',
      priority: 'P2',
      time: '30 分钟',
      isConverted: false,
    },
  ],
};
