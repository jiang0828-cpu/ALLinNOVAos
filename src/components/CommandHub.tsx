// src/components/CommandHub.tsx
// 全局指挥台 (COMMANDHUB) —— 核心容器组件
// 包含 4 个面板：STATE/TARGET、今日重点、信息资讯、AI 建议

import { useState, useMemo } from 'react';
import { Command, Sparkles } from 'lucide-react';
import type { DashboardSnapshot } from '../types/dashboard';
import { StateTarget } from './StateTarget';
import { TodayFocus } from './TodayFocus';
import { FeedsPanel } from './FeedsPanel';
import { AiSuggestion } from './AiSuggestion';
import { getDashboardSnapshot } from '../services/dashboardService';

export function CommandHub() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载数据（Phase 1: Mock, Phase 2: API）
  useMemo(() => {
    getDashboardSnapshot()
      .then(setSnapshot)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !snapshot) {
    return (
      <section className="commandHub">
        <div className="commandHubHeader">
          <span className="sectionEyebrow">COMMANDHUB</span>
          <h2>全局指挥台</h2>
        </div>
        <div className="heroGrid">
          <div className="panel loadingPlaceholder">
            <span>加载中...</span>
          </div>
        </div>
      </section>
    );
  }

  const handleConvertSuggestion = (suggestionId: number) => {
    setSnapshot(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        aiSuggestions: prev.aiSuggestions.map(s =>
          s.id === suggestionId ? { ...s, isConverted: true } : s
        ),
        // 同步到今日重点（作为新 Task）
        todayFocus: [
          {
            id: `task_from_suggestion_${suggestionId}`,
            title: prev.aiSuggestions.find(s => s.id === suggestionId)?.title || '新任务',
            system: 'AI Suggestion',
            priority: prev.aiSuggestions.find(s => s.id === suggestionId)?.priority || 'P1',
            eta: prev.aiSuggestions.find(s => s.id === suggestionId)?.time,
            status: 'TODO',
          },
          ...prev.todayFocus,
        ],
      };
    });
  };

  return (
    <section className="commandHub">
      <div className="commandHubHeader">
        <span className="sectionEyebrow">COMMANDHUB</span>
        <h2>全局指挥台</h2>
        <div className="commandHubActions">
          <button className="iconButton" title="AI 指令" aria-label="AI 指令">
            <Command size={18} />
          </button>
          <button className="iconButton" title="AI 辅助" aria-label="AI 辅助">
            <Sparkles size={18} />
          </button>
        </div>
      </div>

      <div className="heroGrid">
        {/* STATE / TARGET — 目标达成 */}
        <StateTarget
          lifeScore={snapshot.stateTarget.lifeScore}
          breakdown={snapshot.stateTarget.breakdown}
        />

        {/* 今日重点 (Today Focus) */}
        <TodayFocus items={snapshot.todayFocus} />

        {/* 信息资讯 (Feeds) */}
        <FeedsPanel feeds={snapshot.feeds} />

        {/* AI 建议 (AI Suggestion) */}
        <AiSuggestion
          suggestions={snapshot.aiSuggestions}
          onConvert={handleConvertSuggestion}
        />
      </div>
    </section>
  );
}
