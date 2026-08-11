// src/components/CommandHub.tsx
// 全局指挥台核心容器组件。

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Inbox, CalendarDays, Moon, Sun } from 'lucide-react';
import type { DashboardSnapshot } from '../types/dashboard';
import { StateTarget } from './StateTarget';
import { TodayFocus } from './TodayFocus';
import { FeedsPanel } from './FeedsPanel';
import { OpenIssues } from './OpenIssues';
import { LatestReview } from './LatestReview';
import { AiSuggestion } from './AiSuggestion';
import { DashboardSkeleton } from './Skeleton';
import { getDashboardSnapshot, getLocalDashboardSnapshot } from '../services/dashboardService';
import { flushLocalSyncQueue } from '../services/apiClient';
import {
  createLocalBackup,
  getLocalBackupMeta,
  getLocalSyncMeta,
} from '../services/localBackupStore';
import { acceptAndCreateTask } from '../services/suggestionService';

interface CommandHubProps {
  onDateUpdate?: (date: string) => void;
  lastUpdatedAt?: string;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
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

function formatHeaderDate(value?: string) {
  if (!value) return '---';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function CommandHub({
  onDateUpdate,
  lastUpdatedAt,
  theme = 'light',
  onThemeToggle,
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
  const [syncMeta, setSyncMeta] = useState(() => getLocalSyncMeta());

  const applySnapshot = useCallback((data: DashboardSnapshot) => {
    const hasData =
      data.stateTarget.lifeScore > 0 ||
      data.todayFocus.length > 0 ||
      data.openIssues.length > 0 ||
      data.aiSuggestions.length > 0 ||
      data.latestReview !== null;

    setSnapshot(data);
    onDateUpdate?.(data.generatedAt);
    setBackupMeta(getLocalBackupMeta());
    setSyncMeta(getLocalSyncMeta());
    setDataSource(data.dataSource || 'local');
    setLoadState(hasData ? 'success' : 'empty');
  }, [onDateUpdate]);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      const localData = getLocalDashboardSnapshot();
      applySnapshot(localData);
    }
    setErrorMessage('');

    try {
      const data = await getDashboardSnapshot();
      applySnapshot(data);
    } catch (err) {
      console.error('[CommandHub] Failed to load dashboard:', err);
      setErrorMessage((err as Error).message || '未知错误');
      setLoadState((current) => (current === 'idle' || current === 'loading' ? 'error' : current));
    }
  }, [applySnapshot]);

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
      setSyncMeta(getLocalSyncMeta());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // 监听其他页面触发的刷新事件，同步更新 Dashboard。
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

  useEffect(() => {
    const handleSyncUpdate = () => setSyncMeta(getLocalSyncMeta());
    window.addEventListener('nova:sync-queue-updated', handleSyncUpdate as EventListener);
    return () => window.removeEventListener('nova:sync-queue-updated', handleSyncUpdate as EventListener);
  }, []);

  // 加载状态。
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

  // 错误状态。
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

  // 空状态。
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
          <p>系统中还没有任何数据，可以先创建目标和任务。</p>
          <button className="primaryButton" style={{ maxWidth: 200 }}>
            创建第一个目标
          </button>
        </div>
      </section>
    );
  }

  // 成功状态。
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
            title={dataSource === 'online' ? '正在读取云端数据库' : '云端数据加载中'}
          >
            {dataSource === 'online' ? '● 云端数据库' : dataSource === 'local' ? '○ 云端加载中' : '○ 示例缓存'}
          </span>
          <button
            className="syncDataButton"
            title="只刷新云端数据，不再同步本地队列"
            onClick={async () => {
              await flushLocalSyncQueue();
              setSyncMeta(getLocalSyncMeta());
              await loadData(true);
            }}
          >
            云端刷新
          </button>
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
          <div className="commandHubTimeTools">
            <div className="datePill">
              <CalendarDays size={16} />
              {formatHeaderDate(lastUpdatedAt || snapshot.generatedAt)}
            </div>
            <button
              className="iconButton"
              aria-label="Toggle theme"
              title="Toggle theme"
              onClick={onThemeToggle}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="heroGrid">
        {/* 1. STATE / TARGET */}
        <StateTarget
          lifeScore={snapshot.stateTarget.lifeScore}
          breakdown={snapshot.stateTarget.breakdown}
          onOpen={onOpenGoals}
        />

        {/* 2. FEEDS */}
        <FeedsPanel feeds={snapshot.feeds} />

        {/* 3. TODAY */}
        <TodayFocus
          items={snapshot.todayFocus}
          onOpenTasks={onOpenTasks}
        />

        {/* 4. ISSUES */}
        <OpenIssues issues={snapshot.openIssues} onOpenIssues={onOpenIssues} />

        {/* 5. SUGGESTION */}
        <AiSuggestion
          suggestions={snapshot.aiSuggestions}
          onConvert={handleConvertSuggestion}
          onOpenSuggestions={onOpenSuggestions}
        />

        {/* 6. REVIEW */}
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
