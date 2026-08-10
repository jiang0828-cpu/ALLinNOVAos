// src/components/TaskItem.jsx
// 单个任务卡片组件

import { useState } from 'react';
import { Check, Play, XCircle, MoreVertical } from 'lucide-react';
import { STATUS_LABELS, STATUS_CLASS_MAP, PRIORITY_LABELS, getDomainLabel } from '../types/tasks';

export function TaskItem({ task, onComplete, onStart, onCancel, onUpdate }) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const canComplete = task.status === 'IN_PROGRESS';
  const canStart = task.status === 'TODO';
  const canCancel = task.status !== 'DONE' && task.status !== 'CANCELLED';

  const handleComplete = async () => {
    if (!canComplete || isCompleting) return;
    setIsCompleting(true);
    try {
      await onComplete(task.id);
    } finally {
      setIsCompleting(false);
    }
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
    if (days === 0) return '今天到期';
    if (days === 1) return '明天到期';
    if (days <= 7) return `${days} 天后到期`;

    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'DONE';

  const getPriorityClass = (priority) => {
    const p = priority?.toLowerCase() || 'p2';
    return `priority p${p.slice(1)}`;
  };

  return (
    <article className={`taskItem ${STATUS_CLASS_MAP[task.status]}`}>
      <div className="taskItemHeader">
        <div className={getPriorityClass(task.priority)}>
          {task.priority || 'P2'}
        </div>
        <h3 className="taskTitle">{task.title}</h3>
        <span className={`taskStatus status-${STATUS_CLASS_MAP[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <div className="taskItemMeta">
        {task.priority && (
          <span className="taskPriority">{PRIORITY_LABELS[task.priority]}</span>
        )}
        {task.domainName && (
          <span className="taskDomain">{getDomainLabel(task.domainName)}</span>
        )}
        {task.dueAt && (
          <span className={`taskDueDate ${isOverdue ? 'overdue' : ''}`}>
            {formatDueDate(task.dueAt)}
          </span>
        )}
      </div>

      <div className="taskItemActions">
        {canStart && (
          <button
            className="taskActionBtn start"
            onClick={() => onStart(task.id)}
            title="开始任务"
          >
            <Play size={14} />
            <span>开始</span>
          </button>
        )}

        {canComplete && (
          <button
            className="taskActionBtn complete"
            onClick={handleComplete}
            disabled={isCompleting}
            title="完成任务"
          >
            <Check size={14} />
            <span>{isCompleting ? '提交中...' : '完成'}</span>
          </button>
        )}

        {canCancel && (
          <button
            className="taskActionBtn cancel"
            onClick={() => onCancel(task.id)}
            title="取消任务"
          >
            <XCircle size={14} />
            <span>取消</span>
          </button>
        )}

        <div className="taskMoreActions">
          <button
            className="taskActionBtn more"
            onClick={() => setIsActionsOpen(!isActionsOpen)}
            title="更多操作"
          >
            <MoreVertical size={14} />
          </button>

          {isActionsOpen && (
            <div className="taskDropdown">
              <button onClick={() => { setIsActionsOpen(false); onUpdate(task); }}>
                编辑任务
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
