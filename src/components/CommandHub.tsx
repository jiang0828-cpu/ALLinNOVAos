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
import { createLocalBackup, getLocalBackupMeta } from '../services/localBackupStore';
import { acceptAndCreateTask } from '../services/suggestionService';

interface CommandHubProps {
  onDateUpdate?: (date: string) => void;
  onOpenGoals?: () => void;
  onOpenTasks?: () => void;
  onOpenIssues?: () => void;
  onOpenSuggestions?: () => void;
  onCreateReview?: () => void;
  onOpenReview?: (id: string) => void;
  onOpenReviews?: () => void;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error' | 'empty';
type DataSource = 'online' | 'local' | 'mock';

export function CommandHub({
  onDateUpdate,
  onOpenGoals,
  onOpenTasks,
  onOpenIssues,
  onOpenSuggestions,
  onCreateReview,
  onOpenReview,
  onOpenReviews,
}: CommandHubProps) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [dataSource, setDataSource] = useState<DataSource>('local');
  const [backupMeta, setBackupMeta] = useState(() => getLocalBackupMeta());

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoadState('loading');
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
      setBackupMeta(getLocalBackupMeta());
      setDataSource(data.dataSource || 'local');

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadData(true);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      createLocalBackup();
      setBackupMeta(getLocalBackupMeta());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // 监听其他页面（如建议/问题页）触发的刷新事件，同步更新 Dashboard
  useEffect(() => {
    const handleRefresh = () => {
      loadData(true);
    };
    window.addEventListener('nova:refresh-dashboard', handleRefresh as EventListener);
    window.addEventListener('nova:local-store-updated', handleRefresh as EventListener);
    return () => {
      window.removeEventListener('nova:refresh-dashboard', handleRefresh as EventListener);
      window.removeEventListener('nova:local-store-updated', handleRefresh as EventListener);
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
            onClick={() => loadData()}
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
  const handleConvertSuggestion = async (suggestionId: string) => {
    const suggestion = snapshot?.aiSuggestions.find((s) => s.id === suggestionId);
    if (!suggestion) return;

    try {
      await acceptAndCreateTask(suggestionId);
      createLocalBackup();
      window.dispatchEvent(new CustomEvent('nova:refresh-tasks'));
      window.dispatchEvent(new CustomEvent('nova:refresh-suggestions'));
      await loadData(true);
    } catch (err) {
      console.error('[CommandHub] Failed to convert suggestion:', err);
    }

    setSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        aiSuggestions: prev.aiSuggestions.map((s) =>
          s.id === suggestionId ? { ...s, isConverted: true } : s
        ),
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
            className={`backendBadge ${dataSource === 'online' ? 'live' : 'mock'}`}
            title={dataSource === 'online' ? '正在读取线上数据库' : '正在读取浏览器本地备份'}
          >
            {dataSource === 'online' ? '● 线上数据库' : dataSource === 'local' ? '○ 本地备份' : '○ 示例兜底'}
          </span>
          <div className="commandHubActions">
            <button
              className="refreshDataButton"
              title="刷新数据"
              aria-label="刷新数据"
              onClick={() => loadData()}
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
          onOpen={onOpenGoals}
        />

        {/* 2. 今日重点 (Today Focus) */}
        <TodayFocus
          items={snapshot.todayFocus}
          onOpenTasks={onOpenTasks}
        />

        {/* 3. 信息资讯 (Feeds) */}
        <FeedsPanel feeds={snapshot.feeds} />

        {/* 4. 当前问题 · 风险 */}
        <OpenIssues issues={snapshot.openIssues} onOpenIssues={onOpenIssues} />

        {/* 5. AI 建议 (AI Suggestion) */}
        <AiSuggestion
          suggestions={snapshot.aiSuggestions}
          onConvert={handleConvertSuggestion}
          onOpenSuggestions={onOpenSuggestions}
        />

        {/* 6. 最新复盘 */}
        <LatestReview
          review={snapshot.latestReview}
          insightsCount={snapshot.activeInsightsCount}
          onCreateReview={onCreateReview}
          onOpenReview={onOpenReview}
          onOpenReviews={onOpenReviews || onCreateReview}
        />
      </div>
    </section>
  );
}
