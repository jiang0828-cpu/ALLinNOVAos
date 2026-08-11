// src/components/TodayFocus.tsx
// 今日重点 (Today Focus) —— Task 列表面板

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
}

interface TodayFocusProps {
  items: FocusItem[];
  onOpenTasks?: () => void;
}

export function TodayFocus({ items, onOpenTasks }: TodayFocusProps) {
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
      {items.length === 0 ? (
        <p className="emptyState">没有待办任务。</p>
      ) : (
        <div className="focusList">
          {items.map((item) => (
            <article key={item.id} className="focusItem" onClick={onOpenTasks}>
              <span
                className="priority"
                style={{
                  background: PRIORITY_COLORS[item.priority],
                  color: getPriorityTextColor(item.priority),
                }}
              >
                {item.priority}
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.system}
                  {item.eta ? ` · ${item.eta}` : ''}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
