// src/components/CommandHub.tsx
// 全局指挥台 (COMMANDHUB) —— 核心容器组件
// 包含 8 个面板：目标达成、今日重点、信息资讯、当前问题、最新复盘、AI 建议

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Inbox, FolderKanban, CheckSquare, ClipboardList } from 'lucide-react';
import type { DashboardSnapshot } from '../types/dashboard';
import { StateTarget } from './StateTarget';
import { TodayFocus } from './TodayFocus';
import { FeedsPanel } from './FeedsPanel';
import { OpenIssues } from './OpenIssues';
import { LatestReview } from './LatestReview';
import { AiSuggestion } from './AiSuggestion';
import { DashboardSkeleton } from './Skeleton';
import { getDashboardSnapshot } from '../services/dashboardService';
import { createProject } from '../services/projectService';
import { createTask } from '../services/taskService';
import { createIssue } from '../services/issueService';
import { generateReviewDraft } from '../services/reviewService';
import { createLocalBackup, getLocalBackupMeta } from '../services/localBackupStore';

interface CommandHubProps {
  onDateUpdate?: (date: string) => void;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export function CommandHub({ onDateUpdate }: CommandHubProps) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickBusy, setQuickBusy] = useState('');
  const [quickMessage, setQuickMessage] = useState('');
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

  const syncAfterWrite = async (message: string) => {
    createLocalBackup();
    setBackupMeta(getLocalBackupMeta());
    setQuickMessage(message);
    window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
    await loadData();
  };

  const getTitle = (fallback: string) => quickTitle.trim() || fallback;

  const handleQuickAction = async (type: 'project' | 'task' | 'issue' | 'review') => {
    setQuickBusy(type);
    setQuickMessage('');
    try {
      if (type === 'project') {
        await createProject({
          title: getTitle('新建项目'),
          priority: 'P1',
          domainId: 'work',
          progress: 0,
          healthStatus: 'ON_TRACK',
        });
        await syncAfterWrite('项目已创建并同步到指挥台');
      }
      if (type === 'task') {
        await createTask({
          title: getTitle('新建任务'),
          priority: 'P1',
          domainId: 'work',
          estimatedMinutes: 30,
        });
        await syncAfterWrite('任务已创建并同步到今日重点');
      }
      if (type === 'issue') {
        await createIssue({
          title: getTitle('新的问题提示'),
          description: '由全局指挥台快速记录',
          level: 'MEDIUM',
          domainId: 'work',
        });
        await syncAfterWrite('问题提示已记录并同步到风险模块');
      }
      if (type === 'review') {
        await generateReviewDraft('local-current-cycle', 'local-user');
        await syncAfterWrite('复盘草稿已生成并同步到最新复盘');
      }
      setQuickTitle('');
    } catch (err) {
      setQuickMessage((err as Error).message || '操作失败，请稍后重试');
    } finally {
      setQuickBusy('');
    }
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
              onClick={() => loadData()}
            >
              <RefreshCw size={16} />
              <span>刷新</span>
            </button>
          </div>
        </div>
      </div>

      <div className="commandQuickStart" aria-label="全局指挥台快速启动">
        <div className="quickStartCopy">
          <span className="sectionEyebrow">QUICK START</span>
          <h3>快速启动任务管理</h3>
          <p>手动创建项目、任务、问题提示和复盘；系统会自动刷新并写入本地备份。</p>
        </div>
        <div className="quickStartInput">
          <input
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            placeholder="输入标题，例如：整理本周重点项目"
          />
          <div className="quickStartActions">
            <button type="button" onClick={() => handleQuickAction('project')} disabled={Boolean(quickBusy)}>
              <FolderKanban size={15} />
              项目
            </button>
            <button type="button" onClick={() => handleQuickAction('task')} disabled={Boolean(quickBusy)}>
              <CheckSquare size={15} />
              任务
            </button>
            <button type="button" onClick={() => handleQuickAction('issue')} disabled={Boolean(quickBusy)}>
              <AlertCircle size={15} />
              问题
            </button>
            <button type="button" onClick={() => handleQuickAction('review')} disabled={Boolean(quickBusy)}>
              <ClipboardList size={15} />
              复盘
            </button>
          </div>
        </div>
        <div className="quickStartMeta">
          <span>{quickBusy ? '同步中...' : quickMessage || '自动更新已开启'}</span>
          <small>备份 {backupMeta.backupCount} 次 · {new Date(backupMeta.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</small>
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
