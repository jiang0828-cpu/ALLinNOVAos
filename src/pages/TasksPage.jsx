// src/pages/TasksPage.jsx
// 任务管理主页面

import { useState, useEffect, useCallback } from 'react';
import { Plus, ListTodo, RefreshCw } from 'lucide-react';
import { TaskFilters } from '../components/TaskFilters';
import { TaskList } from '../components/TaskList';
import { CreateTaskForm } from '../components/CreateTaskForm';
import {
  getTasks,
  createTask,
  updateTask,
  startTask,
  completeTask,
  cancelTask,
  deleteTask,
} from '../services/taskService';
import { createLocalBackup } from '../services/localBackupStore';

const INITIAL_FILTERS = {
  status: [],
  priority: [],
  domainId: undefined,
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

function getTaskDueDate(task) {
  return (
    task.dueAt ||
    task.taskDetail?.dueAt ||
    task.plannedEndAt ||
    task.taskDetail?.scheduledEndAt
  );
}

function isDueToday(task) {
  const dueAt = getTaskDueDate(task);
  if (!dueAt) return false;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

function syncDashboardAfterTaskChange() {
  createLocalBackup();
  window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
}

function calculateActualMinutes(task) {
  const startedAt = task.plannedStartAt || task.taskDetail?.scheduledStartAt;
  if (!startedAt) return undefined;
  const start = new Date(startedAt);
  const end = new Date();
  if (Number.isNaN(start.getTime()) || end < start) return undefined;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 加载任务列表
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);

    try {
      const response = await getTasks(filters);
      setTasks(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err);
      console.error('[TasksPage] Failed to load tasks:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const openCreateTask = (event) => {
      if (event.detail?.actionId && event.detail.actionId !== 'task') return;
      window.sessionStorage.removeItem('nova-pending-quick-action');
      setEditingTask(null);
      setIsCreateModalOpen(true);
    };

    if (window.sessionStorage.getItem('nova-pending-quick-action') === 'task') {
      openCreateTask({ detail: { actionId: 'task' } });
    }

    window.addEventListener('nova:quick-create', openCreateTask);
    return () => window.removeEventListener('nova:quick-create', openCreateTask);
  }, []);

  useEffect(() => {
    const handleRefresh = () => loadTasks();
    window.addEventListener('nova:refresh-tasks', handleRefresh);
    return () => window.removeEventListener('nova:refresh-tasks', handleRefresh);
  }, [loadTasks]);

  // 创建任务
  const handleCreateTask = async (payload) => {
    try {
      const newTask = await createTask(payload);
      setTasks((prev) => [newTask, ...prev]);
      setTotal((prev) => prev + 1);
      syncDashboardAfterTaskChange();
    } catch (err) {
      console.error('[TasksPage] Failed to create task:', err);
      throw err;
    }
  };

  // 开始任务
  const handleStartTask = async (taskId) => {
    try {
      const updated = await startTask(taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? {
          ...t,
          ...updated,
          status: updated.status,
          plannedStartAt: updated.plannedStartAt || t.plannedStartAt || new Date().toISOString(),
          taskDetail: {
            ...(t.taskDetail || {}),
            ...(updated.taskDetail || {}),
          },
        } : t))
      );
      syncDashboardAfterTaskChange();
    } catch (err) {
      console.error('[TasksPage] Failed to start task:', err);
      alert('开始任务失败: ' + (err.message || '未知错误'));
    }
  };

  // 完成任务
  const handleCompleteTask = async (taskId) => {
    try {
      const currentTask = tasks.find((task) => task.id === taskId);
      const actualMinutes = currentTask ? calculateActualMinutes(currentTask) : undefined;
      const updated = await completeTask(taskId, undefined, actualMinutes);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? {
          ...t,
          ...updated,
          status: updated.status,
          completedAt: updated.completedAt || new Date().toISOString(),
          taskDetail: {
            ...(t.taskDetail || {}),
            ...(updated.taskDetail || {}),
            actualMinutes: actualMinutes ?? updated.taskDetail?.actualMinutes ?? t.taskDetail?.actualMinutes,
          },
        } : t))
      );
      syncDashboardAfterTaskChange();
    } catch (err) {
      console.error('[TasksPage] Failed to complete task:', err);
      alert('完成任务失败: ' + (err.message || '未知错误'));
    }
  };

  // 取消任务
  const handleCancelTask = async (taskId) => {
    if (!window.confirm('确定要取消这个任务吗？')) return;
    try {
      const updated = await cancelTask(taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: updated.status } : t))
      );
      syncDashboardAfterTaskChange();
    } catch (err) {
      console.error('[TasksPage] Failed to cancel task:', err);
      alert('取消任务失败: ' + (err.message || '未知错误'));
    }
  };

  // 删除任务
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('确定要删除这个任务吗？此操作不可撤销。')) return;
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setTotal((prev) => prev - 1);
      syncDashboardAfterTaskChange();
    } catch (err) {
      console.error('[TasksPage] Failed to delete task:', err);
      alert('删除任务失败: ' + (err.message || '未知错误'));
    }
  };

  const handleOpenEditTask = (task) => {
    setEditingTask(task);
  };

  const handleSaveTask = async (payload) => {
    if (!editingTask) return;
    try {
      const updated = await updateTask(editingTask.id, payload);
      setTasks((prev) =>
        prev.map((task) => (task.id === editingTask.id ? { ...task, ...updated } : task))
      );
      setEditingTask(null);
      syncDashboardAfterTaskChange();
    } catch (err) {
      console.error('[TasksPage] Failed to update task:', err);
      throw err;
    }
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCycleFilter('ALL');
  };

  const visibleTasks = tasks.filter((task) => {
    if (cycleFilter === 'ALL') return true;
    if (cycleFilter === 'DAILY') {
      return getTaskCycleType(task) === 'DAILY' || isDueToday(task);
    }
    return getTaskCycleType(task) === cycleFilter;
  });

  return (
    <div className="tasksPage">
      {/* 页面头部 */}
      <div className="tasksPageHeader">
        <div className="tasksPageTitle">
          <span className="sectionEyebrow">TASKS</span>
          <h1>任务管理</h1>
          <span className="tasksPageMeta">
            <ListTodo size={18} />
            共 {total} 个任务
          </span>
        </div>
        <div className="tasksPageActions">
          <button
            className="iconButton"
            onClick={loadTasks}
            disabled={isRefreshing}
            title="刷新"
          >
            <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
          </button>
          <button
            className="primaryButton createTaskBtn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={18} />
            新建任务
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="tasksStats">
        <TaskStatCard label="待办" count={visibleTasks.filter((t) => t.status === 'TODO').length} status="todo" />
        <TaskStatCard label="进行中" count={visibleTasks.filter((t) => t.status === 'IN_PROGRESS').length} status="in-progress" />
        <TaskStatCard label="阻塞" count={visibleTasks.filter((t) => t.status === 'BLOCKED').length} status="blocked" />
        <TaskStatCard label="已完成" count={visibleTasks.filter((t) => t.status === 'DONE').length} status="done" />
      </div>

      {/* 筛选器 */}
      <TaskFilters
        filters={filters}
        cycleFilter={cycleFilter}
        onCycleFilterChange={setCycleFilter}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* 任务列表 */}
      <TaskList
        tasks={visibleTasks}
        loading={loading}
        error={error}
        onComplete={handleCompleteTask}
        onStart={handleStartTask}
        onCancel={handleCancelTask}
        onUpdate={handleOpenEditTask}
        onRetry={loadTasks}
      />

      {/* 创建任务弹窗 */}
      {isCreateModalOpen && (
        <CreateTaskForm
          onCreate={handleCreateTask}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {editingTask && (
        <CreateTaskForm
          mode="edit"
          initialTask={editingTask}
          onCreate={handleSaveTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

/** 任务统计卡片 */
function TaskStatCard({ label, count, status }) {
  return (
    <div className={`taskStatCard stat-${status}`}>
      <span className="statCount">{count}</span>
      <span className="statLabel">{label}</span>
    </div>
  );
}
