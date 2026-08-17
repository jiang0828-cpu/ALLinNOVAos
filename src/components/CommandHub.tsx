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
import { getDashboardSnapshot } from '../services/dashboardService';
import { createLocalBackup } from '../services/localBackupStore';
import { acceptAndCreateTask } from '../services/suggestionService';

interface CommandHubProps {
  onDateUpdate?: (date: string) => void;
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

function getDaysUntilEndDate(value?: string) {
  const now = value ? new Date(value) : new Date();
  const target = new Date('2072-08-28T00:00:00+08:00');
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.max(0, Math.ceil((targetStart - todayStart) / 86400000));
}

export function CommandHub({
  onDateUpdate,
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
  const [currentClock, setCurrentClock] = useState(() => new Date().toISOString());
  const daysUntilEnd = getDaysUntilEndDate(currentClock);

  const applySnapshot = useCallback((data: DashboardSnapshot) => {
    setSnapshot(data);
    onDateUpdate?.(data.generatedAt);
    setLoadState('success');
  }, [onDateUpdate]);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoadState('loading');
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
      setCurrentClock(new Date().toISOString());
    }, 1000);
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
          <button className="primaryButton" style={{ maxWidth: 200 }} onClick={onOpenGoals}>
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
              {formatHeaderDate(currentClock)}
            </div>
            <div className="countdownPill" title="距离 2072-08-28">
              {daysUntilEnd} 天
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
