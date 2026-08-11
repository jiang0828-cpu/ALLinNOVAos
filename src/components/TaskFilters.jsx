import { X } from 'lucide-react';
import { STATUS_LABELS, PRIORITY_LABELS, DOMAIN_OPTIONS } from '../types/tasks';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];
const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3'];
const CYCLE_OPTIONS = [
  { key: 'ALL', label: '全部' },
  { key: 'YEARLY', label: '年' },
  { key: 'MONTHLY', label: '月' },
  { key: 'WEEKLY', label: '周' },
  { key: 'DAILY', label: '日' },
];

export function TaskFilters({ filters, cycleFilter = 'ALL', onCycleFilterChange, onFiltersChange, onReset }) {
  const toggleStatus = (status) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, status: updated });
  };

  const togglePriority = (priority) => {
    const current = filters.priority || [];
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    onFiltersChange({ ...filters, priority: updated });
  };

  const handleDomainChange = (e) => {
    const value = e.target.value;
    onFiltersChange({ ...filters, domainId: value || undefined });
  };

  const hasActiveFilters =
    cycleFilter !== 'ALL' ||
    (filters.status && filters.status.length > 0) ||
    (filters.priority && filters.priority.length > 0) ||
    filters.domainId;

  return (
    <div className="taskFilters">
      <div className="filterSection">
        <span className="filterLabel">周期</span>
        <div className="filterChips">
          {CYCLE_OPTIONS.map((cycle) => (
            <button
              key={cycle.key}
              className={`filterChip ${cycleFilter === cycle.key ? 'active' : ''}`}
              onClick={() => onCycleFilterChange?.(cycle.key)}
            >
              {cycle.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filterSection">
        <span className="filterLabel">状态</span>
        <div className="filterChips">
          {STATUS_OPTIONS.map((status) => {
            const isActive = filters.status?.includes(status);
            return (
              <button
                key={status}
                className={`filterChip ${isActive ? 'active' : ''}`}
                onClick={() => toggleStatus(status)}
              >
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filterSection">
        <span className="filterLabel">优先级</span>
        <div className="filterChips">
          {PRIORITY_OPTIONS.map((priority) => {
            const isActive = filters.priority?.includes(priority);
            return (
              <button
                key={priority}
                className={`filterChip ${isActive ? 'active' : ''}`}
                onClick={() => togglePriority(priority)}
              >
                {priority} · {PRIORITY_LABELS[priority]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filterSection">
        <span className="filterLabel">领域</span>
        <select
          className="filterSelect"
          value={filters.domainId || ''}
          onChange={handleDomainChange}
        >
          <option value="">全部领域</option>
          {DOMAIN_OPTIONS.map((domain) => (
            <option key={domain.id} value={domain.name}>
              {domain.label}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button className="resetFiltersBtn" onClick={onReset}>
          <X size={14} />
          清除筛选
        </button>
      )}
    </div>
  );
}
