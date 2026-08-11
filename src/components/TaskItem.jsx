import { useState } from 'react';
import { Check, Play, XCircle, MoreVertical, Timer } from 'lucide-react';
import { STATUS_LABELS, STATUS_CLASS_MAP, PRIORITY_LABELS, getDomainLabel } from '../types/tasks';

const CYCLE_LABELS = {
  YEARLY: '年度任务',
  MONTHLY: '月度任务',
  WEEKLY: '周任务',
  DAILY: '日任务',
};

function getTaskCycleType(task) {
  const cycleId = String(task.cycleId || '').toLowerCase();
  if (cycleId.includes('year')) return 'YEARLY';
  if (cycleId.includes('month')) return 'MONTHLY';
  if (cycleId.includes('week')) return 'WEEKLY';
  if (cycleId.includes('day') || cycleId.includes('daily')) return 'DAILY';

  const dueAt = task.dueAt || task.taskDetail?.dueAt;
  if (!dueAt) return 'MONTHLY';
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return 'MONTHLY';

  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (daysLeft <= 1) return 'DAILY';
  if (daysLeft <= 14) return 'WEEKLY';
  if (daysLeft <= 75) return 'MONTHLY';
  return 'YEARLY';
}

function calculateActualMinutes(task) {
  if (task.taskDetail?.actualMinutes != null) return Number(task.taskDetail.actualMinutes);
  const startedAt = task.plannedStartAt || task.taskDetail?.scheduledStartAt;
  const completedAt = task.completedAt;
  if (!startedAt || !completedAt) return null;
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function TaskItem({ task, onComplete, onStart, onCancel, onUpdate }) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const canComplete = task.status === 'IN_PROGRESS';
  const canStart = task.status === 'TODO';
  const canCancel = task.status !== 'DONE' && task.status !== 'CANCELLED';
  const actualMinutes = calculateActualMinutes(task);

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
    const days = Math.ceil(diff / 86400000);

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
        <span className="cycleBadge">{CYCLE_LABELS[getTaskCycleType(task)]}</span>
        <h3 className="taskTitle">{task.title}</h3>
        <span className={`taskStatus status-${STATUS_CLASS_MAP[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      {task.description && (
        <p className="taskDescription">{task.description}</p>
      )}

      <div className="taskItemMeta">
        {task.priority && (
          <span className="taskPriority">{PRIORITY_LABELS[task.priority]}</span>
        )}
        {(task.domainName || task.domainId) && (
          <span className="taskDomain">{getDomainLabel(task.domainName || task.domainId)}</span>
        )}
        {task.dueAt && (
          <span className={`taskDueDate ${isOverdue ? 'overdue' : ''}`}>
            {formatDueDate(task.dueAt)}
          </span>
        )}
        {actualMinutes != null && (
          <span className="taskDueDate">
            <Timer size={13} />
            {actualMinutes} min
          </span>
        )}
      </div>

      <div className="taskItemActions">
        {canStart && (
          <button className="taskActionBtn start" onClick={() => onStart(task.id)} title="开始任务">
            <Play size={14} />
            <span>开始</span>
          </button>
        )}

        {canComplete && (
          <button className="taskActionBtn complete" onClick={handleComplete} disabled={isCompleting} title="完成任务">
            <Check size={14} />
            <span>{isCompleting ? '提交中...' : '完成'}</span>
          </button>
        )}

        {canCancel && (
          <button className="taskActionBtn cancel" onClick={() => onCancel(task.id)} title="取消任务">
            <XCircle size={14} />
            <span>取消</span>
          </button>
        )}

        <div className="taskMoreActions">
          <button className="taskActionBtn more" onClick={() => setIsActionsOpen(!isActionsOpen)} title="更多操作">
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
