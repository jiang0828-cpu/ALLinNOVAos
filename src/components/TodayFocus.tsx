// src/components/TodayFocus.tsx
// 今日重点 (Today Focus) - Task 列表面板

import { ListChecks } from 'lucide-react';
import { PRIORITY_COLORS, getPriorityTextColor } from '../types/dashboard';
import type { Priority, TaskStatus } from '../types/dashboard';

interface FocusItem {
  id: string;
  title: string;
  system: string;
  priority: Priority;
  eta?: string;
  status: TaskStatus;
  completedAt?: string;
  actualMinutes?: number | null;
}

interface TodayFocusProps {
  items: FocusItem[];
  onOpenTasks?: () => void;
}

const PRIORITY_ORDER: Record<string, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function getPriorityRank(priority: Priority) {
  return PRIORITY_ORDER[priority] ?? 9;
}

function getDurationText(item: FocusItem) {
  if (typeof item.actualMinutes === 'number' && Number.isFinite(item.actualMinutes) && item.actualMinutes > 0) {
    return `用时 ${Math.round(item.actualMinutes)} min`;
  }
  return '已完成';
}

export function TodayFocus({ items, onOpenTasks }: TodayFocusProps) {
  const sortedItems = [...items].sort((a, b) => {
    const priorityDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
    if (priorityDiff !== 0) return priorityDiff;

    const doneDiff = Number(a.status === 'DONE') - Number(b.status === 'DONE');
    if (doneDiff !== 0) return doneDiff;

    return a.title.localeCompare(b.title, 'zh-CN');
  });

  return (
    <section className="panel todayFocusPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">TODAY</span>
          <h2>今日重点</h2>
          <span className="strictTag">D · TASK</span>
        </div>
        <button
          type="button"
          className="panelIconButton"
          onClick={onOpenTasks}
          title="进入任务管理"
          aria-label="进入任务管理"
        >
          <ListChecks size={20} />
        </button>
      </div>
      {sortedItems.length === 0 ? (
        <p className="emptyState">没有今日任务。</p>
      ) : (
        <div className="focusList">
          {sortedItems.map((item) => {
            const isDone = item.status === 'DONE';

            return (
              <article
                key={item.id}
                className={`focusItem ${isDone ? 'completed' : ''}`}
                onClick={onOpenTasks}
              >
                <span
                  className="priority"
                  style={{
                    background: isDone ? undefined : PRIORITY_COLORS[item.priority],
                    color: isDone ? undefined : getPriorityTextColor(item.priority),
                  }}
                >
                  {item.priority}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.system}
                    {item.eta ? ` · ${item.eta}` : ''}
                    {isDone ? ` · ${getDurationText(item)}` : ''}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
