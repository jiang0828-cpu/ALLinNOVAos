// src/components/TaskList.jsx
// 任务列表组件

import { Inbox } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { TaskListSkeleton } from './TaskSkeleton';
import { STATUS_LABELS } from '../types/tasks';

export function TaskList({
  tasks,
  loading,
  error,
  onComplete,
  onStart,
  onCancel,
  onUpdate,
  onRetry,
}) {
  // 加载状态
  if (loading) {
    return <TaskListSkeleton count={6} />;
  }

  // 错误状态
  if (error) {
    return (
      <div className="taskListError">
        <div className="errorIcon">⚠️</div>
        <h3>加载失败</h3>
        <p>{error.message || '无法获取任务数据'}</p>
        <button className="retryButton" onClick={onRetry}>
          重新加载
        </button>
      </div>
    );
  }

  // 空状态
  if (!tasks || tasks.length === 0) {
    return (
      <div className="taskListEmpty">
        <Inbox size={48} />
        <h3>暂无任务</h3>
        <p>当前筛选条件下没有任务，尝试调整筛选或创建新任务</p>
      </div>
    );
  }

  // 按状态分组显示
  const groupedTasks = tasks.reduce((acc, task) => {
    const status = task.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {});

  const statusOrder = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];

  return (
    <div className="taskList">
      {statusOrder.map((status) => {
        const tasksInStatus = groupedTasks[status];
        if (!tasksInStatus || tasksInStatus.length === 0) return null;

        return (
          <div key={status} className="taskGroup">
            <div className="taskGroupHeader">
              <span className={`statusDot status-${status.toLowerCase()}`} />
              <span className="taskGroupTitle">{STATUS_LABELS[status]}</span>
              <span className="taskGroupCount">{tasksInStatus.length}</span>
            </div>
            <div className="taskGroupItems">
              {tasksInStatus.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onStart={onStart}
                  onCancel={onCancel}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
