// src/components/SuggestionFilters.jsx
// 建议筛选器 —— 按状态筛选

import { Clock, CheckCircle2, Ban, Hourglass } from 'lucide-react';
import { SUGGESTION_STATUS_LABELS } from '../types/suggestions';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: SUGGESTION_STATUS_LABELS.PENDING, icon: Clock },
  { value: 'ACCEPTED', label: SUGGESTION_STATUS_LABELS.ACCEPTED, icon: CheckCircle2 },
  { value: 'DEFERRED', label: SUGGESTION_STATUS_LABELS.DEFERRED, icon: Hourglass },
  { value: 'DISMISSED', label: SUGGESTION_STATUS_LABELS.DISMISSED, icon: Ban },
];

export function SuggestionFilters({ selected, onToggle }) {
  const isAll = selected.length === 0;

  return (
    <div className="suggestionFilters filterRow">
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
