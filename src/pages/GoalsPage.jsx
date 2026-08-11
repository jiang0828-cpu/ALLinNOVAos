import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Target, RefreshCw, AlertCircle, ChevronRight, CalendarDays, Layers3, Pencil } from 'lucide-react';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../services/goalService';
import { createLocalBackup } from '../services/localBackupStore';
import { CreateGoalForm } from '../components/CreateGoalForm';
import { GOAL_STATUS_LABELS, PRIORITY_LABELS, DOMAIN_OPTIONS, getDomainLabel } from '../types/goals';

const INITIAL_FILTERS = {
  status: [],
  priority: [],
  domainId: undefined,
};

const CYCLE_OPTIONS = [
  { key: 'ALL', shortLabel: '全部' },
  { key: 'YEARLY', shortLabel: '年' },
  { key: 'MONTHLY', shortLabel: '月' },
  { key: 'WEEKLY', shortLabel: '周' },
];

const CYCLE_LABELS = {
  YEARLY: '年度目标',
  MONTHLY: '月度目标',
  WEEKLY: '周目标',
};

function getGoalProgress(goal) {
  return Number(goal.goalDetail?.progress ?? goal.progress ?? 0);
}

function getGoalEndDate(goal) {
  return goal.goalDetail?.targetDate || goal.plannedEndAt || goal.targetDate;
}

function getGoalCycleType(goal) {
  const cycleId = String(goal.cycleId || '').toLowerCase();
  if (cycleId.includes('year')) return 'YEARLY';
  if (cycleId.includes('month')) return 'MONTHLY';
  if (cycleId.includes('week')) return 'WEEKLY';

  const endDate = getGoalEndDate(goal);
  if (!endDate) return 'MONTHLY';

  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return 'MONTHLY';

  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (daysLeft <= 14) return 'WEEKLY';
  if (daysLeft <= 75) return 'MONTHLY';
  return 'YEARLY';
}

function getCycleLabel(goal) {
  return CYCLE_LABELS[getGoalCycleType(goal)] || '月度目标';
}

function getKeyElement(description = '') {
  const match = description.match(/【关键要素】(.+)/);
  return match?.[1]?.trim();
}

function getElementNote(description = '') {
  const match = description.match(/【要素说明】([\s\S]+)/);
  return match?.[1]?.trim() || description.replace(/【关键要素】.+/, '').trim();
}

function summarizeGoals(goals, cycleType) {
  const items = goals.filter((goal) => getGoalCycleType(goal) === cycleType);
  const activeItems = items.filter((goal) => !['DONE', 'CANCELLED'].includes(goal.status));
  const progress =
    items.length === 0
      ? 0
      : Math.round(items.reduce((sum, goal) => sum + getGoalProgress(goal), 0) / items.length);
  return {
    count: items.length,
    activeCount: activeItems.length,
    progress,
    focus: activeItems[0]?.title || '暂无重点',
  };
}

function syncDashboardAfterGoalChange() {
  createLocalBackup();
  window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
}

export function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
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

  useEffect(() => {
    const openCreateGoal = (event) => {
      if (event.detail?.actionId && event.detail.actionId !== 'goal') return;
      window.sessionStorage.removeItem('nova-pending-quick-action');
      setEditingGoal(null);
      setIsCreateModalOpen(true);
    };

    if (window.sessionStorage.getItem('nova-pending-quick-action') === 'goal') {
      openCreateGoal({ detail: { actionId: 'goal' } });
    }

    window.addEventListener('nova:quick-create', openCreateGoal);
    return () => window.removeEventListener('nova:quick-create', openCreateGoal);
  }, []);

  const visibleGoals = useMemo(() => {
    return goals.filter((goal) => {
      if (filters.priority.length > 0 && !filters.priority.includes(goal.priority)) return false;
      if (filters.domainId && goal.domainId !== filters.domainId) return false;
      if (cycleFilter !== 'ALL' && getGoalCycleType(goal) !== cycleFilter) return false;
      return true;
    });
  }, [goals, filters.priority, filters.domainId, cycleFilter]);

  const goalSummary = useMemo(() => {
    const yearly = summarizeGoals(goals, 'YEARLY');
    const monthly = summarizeGoals(goals, 'MONTHLY');
    const weekly = summarizeGoals(goals, 'WEEKLY');
    const average =
      goals.length === 0
        ? 0
        : Math.round(goals.reduce((sum, goal) => sum + getGoalProgress(goal), 0) / goals.length);

    return { yearly, monthly, weekly, average };
  }, [goals]);

  const handleCreateGoal = async (payload) => {
    try {
      const newGoal = await createGoal(payload);
      setGoals((prev) => [newGoal, ...prev]);
      setTotal((prev) => prev + 1);
      syncDashboardAfterGoalChange();
    } catch (err) {
      console.error('[GoalsPage] Failed to create goal:', err);
      throw err;
    }
  };

  const handleUpdateGoal = async (goalId, payload) => {
    try {
      const updated = await updateGoal(goalId, payload);
      setGoals((prev) => prev.map((goal) => (goal.id === goalId ? updated : goal)));
      syncDashboardAfterGoalChange();
    } catch (err) {
      console.error('[GoalsPage] Failed to update goal:', err);
      throw err;
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('确定删除这个目标吗？')) return;
    try {
      await deleteGoal(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      setTotal((prev) => Math.max(0, prev - 1));
      syncDashboardAfterGoalChange();
    } catch (err) {
      console.error('[GoalsPage] Failed to delete goal:', err);
      alert(`删除目标失败：${err.message || '未知错误'}`);
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
    setCycleFilter('ALL');
  };

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
          <GoalControlSummary summary={goalSummary} />

          <div className="goalsFilters">
            <div className="filterGroup">
              <span className="filterLabel">周期</span>
              {CYCLE_OPTIONS.map((cycle) => (
                <button
                  key={cycle.key}
                  className={`filterChip ${cycleFilter === cycle.key ? 'active' : ''}`}
                  onClick={() => setCycleFilter(cycle.key)}
                >
                  {cycle.shortLabel}
                </button>
              ))}
            </div>
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
            {(filters.status.length > 0 || filters.priority.length > 0 || filters.domainId || cycleFilter !== 'ALL') && (
              <button className="resetButton" onClick={handleResetFilters}>
                重置筛选
              </button>
            )}
          </div>

          {visibleGoals.length === 0 && (
            <div className="emptyState">
              <Target size={48} />
              <h3>暂无目标</h3>
              <p>点击“新建目标”，从年度、月度或本周重点开始。</p>
              <button className="primaryButton" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={16} />
                新建目标
              </button>
            </div>
          )}

          {visibleGoals.length > 0 && (
            <div className="goalsList">
              {visibleGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={setEditingGoal}
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

      {editingGoal && (
        <CreateGoalForm
          goal={editingGoal}
          onUpdate={handleUpdateGoal}
          onClose={() => setEditingGoal(null)}
        />
      )}
    </div>
  );
}

function GoalControlSummary({ summary }) {
  const cards = [
    { key: 'YEARLY', title: '年度目标', note: '方向与结果', data: summary.yearly },
    { key: 'MONTHLY', title: '月度目标', note: '阶段推进', data: summary.monthly },
    { key: 'WEEKLY', title: '周目标', note: '当前执行', data: summary.weekly },
  ];

  return (
    <section className="goalControlSummary" aria-label="目标达成概览">
      <div className="goalControlHero">
        <div>
          <span className="sectionEyebrow">YEAR / MONTH / WEEK</span>
          <h2>目标达成控制</h2>
          <p>按年度定方向、按月度抓阶段、按周推动作；每个目标保留关键要素，便于后续复盘和任务拆解。</p>
        </div>
        <div className="goalControlScore">
          <span>{summary.average}</span>
          <small>总体进度</small>
        </div>
      </div>

      <div className="goalCycleGrid">
        {cards.map((card) => (
          <div key={card.key} className="goalCycleCard">
            <div className="goalCycleCardTop">
              <span className="goalCycleIcon">
                {card.key === 'YEARLY' ? <Layers3 size={16} /> : <CalendarDays size={16} />}
              </span>
              <span className="goalCycleProgress">{card.data.progress}%</span>
            </div>
            <h3>{card.title}</h3>
            <p>{card.note}</p>
            <div className="progressBar">
              <div className="progressFill" style={{ width: `${card.data.progress}%` }} />
            </div>
            <div className="goalCycleMeta">
              <span>{card.data.activeCount} 个推进中</span>
              <span>{card.data.count} 个总计</span>
            </div>
            <strong>{card.data.focus}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function GoalCard({ goal, onEdit, onDelete }) {
  const progress = getGoalProgress(goal);
  const targetDate = getGoalEndDate(goal);
  const domainLabel = getDomainLabel(goal.domainId);
  const keyElement = getKeyElement(goal.description);
  const elementNote = getElementNote(goal.description);

  return (
    <div className="goalCard">
      <div className="goalCardHeader">
        <div className="goalCardTitle">
          {goal.priority && (
            <span className={`priorityBadge priority-${goal.priority.toLowerCase()}`}>
              {goal.priority}
            </span>
          )}
          <span className="cycleBadge">{getCycleLabel(goal)}</span>
          {keyElement && <span className="cycleBadge">{keyElement}</span>}
          <h3>{goal.title}</h3>
        </div>
        <div className="goalCardStatus">
          <span className={`statusBadge status-${goal.status.toLowerCase()}`}>
            {GOAL_STATUS_LABELS[goal.status] || goal.status}
          </span>
        </div>
      </div>

      {elementNote && (
        <p className="goalCardDesc">{elementNote}</p>
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
            截止：{new Date(targetDate).toLocaleDateString('zh-CN')}
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
          className="textButton"
          onClick={() => onEdit(goal)}
        >
          <Pencil size={14} />
          编辑
        </button>
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
