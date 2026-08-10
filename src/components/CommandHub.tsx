// src/components/CommandHub.tsx
// 全局指挥台 (COMMANDHUB) —— 核心容器组件
// 包含 8 个面板：目标达成、今日重点、信息资讯、当前问题、最新复盘、AI 建议

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import type { DashboardSnapshot } from '../types/dashboard';
import { StateTarget } from './StateTarget';
import { TodayFocus } from './TodayFocus';
import { FeedsPanel } from './FeedsPanel';
import { OpenIssues } from './OpenIssues';
import { LatestReview } from './LatestReview';
import { AiSuggestion } from './AiSuggestion';
import { DashboardSkeleton } from './Skeleton';
import { getDashboardSnapshot } from '../services/dashboardService';

interface CommandHubProps {
  onDateUpdate?: (date: string) => void;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export function CommandHub({ onDateUpdate }: CommandHubProps) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isBackendLive, setIsBackendLive] = useState(false);

  const loadData = useCallback(async () => {
    setLoadState('loading');
    setErrorMessage('');

    try {
      const data = await getDashboardSnapshot();

      // 检查是否有数据
      const hasData =
        data.stateTarget.lifeScore > 0 ||
        data.todayFocus.length > 0 ||
        data.openIssues.length > 0 ||
        data.aiSuggestions.length > 0 ||
        data.latestReview !== null;

      setSnapshot(data);
      onDateUpdate?.(data.generatedAt);

      // 判断是否是真实后端数据（Mock 使用 ws_mock_001）
      if (data.workspaceId !== 'ws_mock_001') {
        setIsBackendLive(true);
      }

      setLoadState(hasData ? 'success' : 'empty');
    } catch (err) {
      console.error('[CommandHub] Failed to load dashboard:', err);
      setErrorMessage((err as Error).message || '未知错误');
      setLoadState('error');
    }
  }, [onDateUpdate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 监听其他页面（如建议/问题页）触发的刷新事件，同步更新 Dashboard
  useEffect(() => {
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener('nova:refresh-dashboard', handleRefresh as EventListener);
    return () => {
      window.removeEventListener('nova:refresh-dashboard', handleRefresh as EventListener);
    };
  }, [loadData]);

  // 加载状态 - 显示骨架屏
  if (loadState === 'loading' || loadState === 'idle') {
    return (
      <section className="commandHub">
        <div className="commandHubHeader">
          <span className="sectionEyebrow">COMMANDHUB</span>
          <h2>全局指挥台</h2>
        </div>
        <DashboardSkeleton />
      </section>
    );
  }

  // 错误状态 - 显示重试按钮
  if (loadState === 'error') {
    return (
      <section className="commandHub">
        <div className="commandHubHeader">
          <span className="sectionEyebrow">COMMANDHUB</span>
          <h2>全局指挥台</h2>
        </div>
        <div className="errorState">
          <AlertCircle size={48} />
          <h3>数据加载失败</h3>
          <p className="errorMessage">{errorMessage || '无法获取 Dashboard 数据'}</p>
          <button
            className="retryButton"
            onClick={loadData}
            disabled={loadState === 'loading'}
          >
            <RefreshCw size={16} />
            <span>重新加载</span>
          </button>
        </div>
      </section>
    );
  }

  // 空状态 - 友好提示
  if (loadState === 'empty' || !snapshot) {
    return (
      <section className="commandHub">
        <div className="commandHubHeader">
          <span className="sectionEyebrow">COMMANDHUB</span>
          <h2>全局指挥台</h2>
        </div>
        <div className="emptyState fullEmpty">
          <Inbox size={48} />
          <h3>暂无数据</h3>
          <p>系统中还没有任何数据，开始创建目标和任务吧</p>
          <button className="primaryButton" style={{ maxWidth: 200 }}>
            创建第一个目标
          </button>
        </div>
      </section>
    );
  }

  // 成功状态 - 展示所有面板
  const handleConvertSuggestion = (suggestionId: string) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const suggestion = prev.aiSuggestions.find((s) => s.id === suggestionId);
      if (!suggestion) return prev;

      return {
        ...prev,
        aiSuggestions: prev.aiSuggestions.map((s) =>
          s.id === suggestionId ? { ...s, isConverted: true } : s
        ),
        todayFocus: [
          {
            id: `task_from_suggestion_${suggestionId}`,
            title: suggestion.title,
            system: 'AI Suggestion',
            priority: suggestion.priority,
            eta: suggestion.time,
            status: 'TODO' as const,
          },
          ...prev.todayFocus,
        ],
      };
    });
  };

  return (
    <section className="commandHub">
      <div className="commandHubHeader">
        <div>
          <span className="sectionEyebrow">COMMANDHUB</span>
          <h2>全局指挥台</h2>
        </div>
        <div className="commandHubControls">
          <span
            className={`backendBadge ${isBackendLive ? 'live' : 'mock'}`}
          >
            {isBackendLive ? '● 后端已连接' : '○ 离线模式'}
          </span>
          <div className="commandHubActions">
            <button
              className="refreshDataButton"
              title="刷新数据"
              aria-label="刷新数据"
              onClick={loadData}
            >
              <RefreshCw size={16} />
              <span>刷新</span>
            </button>
          </div>
        </div>
      </div>

      <div className="heroGrid">
        {/* 1. STATE / TARGET — 目标达成 */}
        <StateTarget
          lifeScore={snapshot.stateTarget.lifeScore}
          breakdown={snapshot.stateTarget.breakdown}
        />

        {/* 2. 今日重点 (Today Focus) */}
        <TodayFocus items={snapshot.todayFocus} />

        {/* 3. 信息资讯 (Feeds) */}
        <FeedsPanel feeds={snapshot.feeds} />

        {/* 4. 当前问题 · 风险 */}
        <OpenIssues issues={snapshot.openIssues} />

        {/* 5. 最新复盘 */}
        <LatestReview
          review={snapshot.latestReview}
          insightsCount={snapshot.activeInsightsCount}
        />

        {/* 6. AI 建议 (AI Suggestion) */}
        <AiSuggestion
          suggestions={snapshot.aiSuggestions}
          onConvert={handleConvertSuggestion}
        />
      </div>
    </section>
  );
}
