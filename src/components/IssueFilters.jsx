// src/components/IssueFilters.jsx
// 问题筛选器 —— 按状态筛选

import { CheckCircle2, AlertOctagon, CircleSlash } from 'lucide-react';
import { ISSUE_STATUS_LABELS } from '../types/issues';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: ISSUE_STATUS_LABELS.OPEN, icon: AlertOctagon },
  { value: 'RESOLVED', label: ISSUE_STATUS_LABELS.RESOLVED, icon: CheckCircle2 },
  { value: 'IGNORED', label: ISSUE_STATUS_LABELS.IGNORED, icon: CircleSlash },
];

export function IssueFilters({ selected, onToggle }) {
  const isAll = selected.length === 0;

  return (
    <div className="issueFilters filterRow">
      <button
        type="button"
        className={`filterChip ${isAll ? 'active' : ''}`}
        onClick={() => onToggle(null)}
      >
        全部
      </button>
      {STATUS_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            className={`filterChip ${active ? 'active' : ''}`}
            onClick={() => onToggle(opt.value)}
          >
            <Icon size={13} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
