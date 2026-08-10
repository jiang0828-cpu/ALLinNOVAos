// src/pages/TasksPage.jsx
// 任务管理主页面

import { useState, useEffect, useCallback } from 'react';
import { Plus, ListTodo, LayoutGrid, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { TaskFilters } from '../components/TaskFilters';
import { TaskList } from '../components/TaskList';
import { CreateTaskForm } from '../components/CreateTaskForm';
import {
  getTasks,
  createTask,
  startTask,
  completeTask,
  cancelTask,
  deleteTask,
} from '../services/taskService';

const INITIAL_FILTERS = {
  status: [],
  priority: [],
  domainId: undefined,
};

export function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
        prev.map((t) => (t.id === taskId ? { ...t, status: updated.status } : t))
      );
    } catch (err) {
      console.error('[TasksPage] Failed to start task:', err);
      alert('开始任务失败: ' + (err.message || '未知错误'));
    }
  };

  // 完成任务
  const handleCompleteTask = async (taskId) => {
    try {
      const updated = await completeTask(taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: updated.status, completedAt: updated.completedAt } : t))
      );
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
    } catch (err) {
      console.error('[TasksPage] Failed to delete task:', err);
      alert('删除任务失败: ' + (err.message || '未知错误'));
    }
  };

  // 编辑任务（预留接口，暂未实现）
  const handleUpdateTask = (task) => {
    alert('编辑功能开发中...\n\n任务: ' + task.title);
  };

  // 重置筛选
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

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
        <TaskStatCard label="待办" count={tasks.filter((t) => t.status === 'TODO').length} status="todo" />
        <TaskStatCard label="进行中" count={tasks.filter((t) => t.status === 'IN_PROGRESS').length} status="in-progress" />
        <TaskStatCard label="阻塞" count={tasks.filter((t) => t.status === 'BLOCKED').length} status="blocked" />
        <TaskStatCard label="已完成" count={tasks.filter((t) => t.status === 'DONE').length} status="done" />
      </div>

      {/* 筛选器 */}
      <TaskFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* 任务列表 */}
      <TaskList
        tasks={tasks}
        loading={loading}
        error={error}
        onComplete={handleCompleteTask}
        onStart={handleStartTask}
        onCancel={handleCancelTask}
        onUpdate={handleUpdateTask}
        onRetry={loadTasks}
      />

      {/* 创建任务弹窗 */}
      {isCreateModalOpen && (
        <CreateTaskForm
          onCreate={handleCreateTask}
          onClose={() => setIsCreateModalOpen(false)}
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
