// src/pages/GoalsPage.jsx
// 目标管理主页面

import { useState, useEffect, useCallback } from 'react';
import { Plus, Target, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import { getGoals, createGoal, deleteGoal } from '../services/goalService';
import { CreateGoalForm } from '../components/CreateGoalForm';
import { GOAL_STATUS_LABELS, PRIORITY_LABELS, DOMAIN_OPTIONS, getDomainLabel } from '../types/goals';

const INITIAL_FILTERS = {
  status: [],
  priority: [],
  domainId: undefined,
};

export function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);

    try {
      const response = await getGoals(filters);
      setGoals(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err);
      console.error('[GoalsPage] Failed to load goals:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleCreateGoal = async (payload) => {
    try {
      const newGoal = await createGoal(payload);
      setGoals((prev) => [newGoal, ...prev]);
      setTotal((prev) => prev + 1);
    } catch (err) {
      console.error('[GoalsPage] Failed to create goal:', err);
      throw err;
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('确定要删除这个目标吗？')) return;
    try {
      await deleteGoal(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error('[GoalsPage] Failed to delete goal:', err);
      alert('删除目标失败: ' + (err.message || '未知错误'));
    }
  };

  const toggleStatusFilter = (status) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const togglePriorityFilter = (priority) => {
    setFilters((prev) => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter((p) => p !== priority)
        : [...prev.priority, priority],
    }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // Loading state
  if (loading) {
    return (
      <div className="goalsPage">
        <div className="goalsPageSkeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="goalSkeletonCard">
              <div className="skeleton skeleton-line" style={{ width: '40%' }} />
              <div className="skeleton skeleton-line" style={{ width: '80%' }} />
              <div className="skeleton skeleton-line" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="goalsPage">
      <div className="goalsPageHeader">
        <div className="goalsPageTitle">
          <span className="sectionEyebrow">GOALS</span>
          <h1>目标管理</h1>
          <span className="goalsPageMeta">
            <Target size={18} />
            共 {total} 个目标
          </span>
        </div>
        <div className="goalsPageActions">
          <button
            className="iconButton"
            onClick={loadGoals}
            disabled={isRefreshing}
            title="刷新"
          >
            <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
          </button>
          <button
            className="primaryButton"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={18} />
            新建目标
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="errorState">
          <AlertCircle size={48} />
          <h3>加载失败</h3>
          <p>{error.message || '未知错误'}</p>
          <button className="primaryButton" onClick={loadGoals}>
            重试
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* Filters */}
          <div className="goalsFilters">
            <div className="filterGroup">
              <span className="filterLabel">状态</span>
              {Object.entries(GOAL_STATUS_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`filterChip ${filters.status.includes(key) ? 'active' : ''}`}
                  onClick={() => toggleStatusFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="filterGroup">
              <span className="filterLabel">优先级</span>
              {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`filterChip ${filters.priority.includes(key) ? 'active' : ''}`}
                  onClick={() => togglePriorityFilter(key)}
                >
                  {key} · {label}
                </button>
              ))}
            </div>
            <div className="filterGroup">
              <span className="filterLabel">领域</span>
              <select
                className="filterSelect"
                value={filters.domainId || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, domainId: e.target.value || undefined }))}
              >
                <option value="">全部领域</option>
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
            {(filters.status.length > 0 || filters.priority.length > 0 || filters.domainId) && (
              <button className="resetButton" onClick={handleResetFilters}>
                重置筛选
              </button>
            )}
          </div>

          {/* Empty state */}
          {goals.length === 0 && (
            <div className="emptyState">
              <Target size={48} />
              <h3>暂无目标</h3>
              <p>点击"新建目标"来创建你的第一个目标</p>
              <button className="primaryButton" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={16} />
                新建目标
              </button>
            </div>
          )}

          {/* Goals list */}
          {goals.length > 0 && (
            <div className="goalsList">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </div>
          )}
        </>
      )}

      {isCreateModalOpen && (
        <CreateGoalForm
          onCreate={handleCreateGoal}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}

function GoalCard({ goal, onDelete }) {
  const progress = goal.goalDetail?.progress ?? 0;
  const targetDate = goal.goalDetail?.targetDate;
  const domainLabel = getDomainLabel(goal.domainId);

  return (
    <div className="goalCard">
      <div className="goalCardHeader">
        <div className="goalCardTitle">
          {goal.priority && (
            <span className={`priorityBadge priority-${goal.priority.toLowerCase()}`}>
              {goal.priority}
            </span>
          )}
          <h3>{goal.title}</h3>
        </div>
        <div className="goalCardStatus">
          <span className={`statusBadge status-${goal.status.toLowerCase()}`}>
            {GOAL_STATUS_LABELS[goal.status] || goal.status}
          </span>
        </div>
      </div>

      {goal.description && (
        <p className="goalCardDesc">{goal.description}</p>
      )}

      <div className="goalCardProgress">
        <div className="progressBar">
          <div
            className="progressFill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <span className="progressText">{Math.round(progress)}%</span>
      </div>

      <div className="goalCardMeta">
        <span className="metaItem">
          <ChevronRight size={14} />
          {domainLabel}
        </span>
        {targetDate && (
          <span className="metaItem">
            截止: {new Date(targetDate).toLocaleDateString('zh-CN')}
          </span>
        )}
        {goal.plannedEndAt && !targetDate && (
          <span className="metaItem">
            截止: {new Date(goal.plannedEndAt).toLocaleDateString('zh-CN')}
          </span>
        )}
        {goal.goalDetail?.targetValue != null && (
          <span className="metaItem">
            {goal.goalDetail.currentValue ?? 0} / {goal.goalDetail.targetValue}
            {goal.goalDetail.unit && ` ${goal.goalDetail.unit}`}
          </span>
        )}
      </div>

      <div className="goalCardActions">
        <button
          className="textButton danger"
          onClick={() => onDelete(goal.id)}
        >
          删除
        </button>
      </div>
    </div>
  );
}
