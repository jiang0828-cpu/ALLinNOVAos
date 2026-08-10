// src/components/ReviewFilters.jsx
// 复盘筛选器 —— 按状态筛选

import { FileText, CheckCircle2, Send } from 'lucide-react';
import { REVIEW_STATUS_LABELS } from '../types/reviews';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: REVIEW_STATUS_LABELS.DRAFT, icon: FileText },
  { value: 'COMPLETED', label: REVIEW_STATUS_LABELS.COMPLETED, icon: CheckCircle2 },
  { value: 'PUBLISHED', label: REVIEW_STATUS_LABELS.PUBLISHED, icon: Send },
];

export function ReviewFilters({ selected, onToggle }) {
  const isAll = selected.length === 0;

  return (
    <div className="reviewFilters filterRow">
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
