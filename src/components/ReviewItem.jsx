// src/components/ReviewItem.jsx
// 复盘卡片 —— 展示标题、周期、领域、完成率、创建时间、状态

import { Calendar, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import {
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_CLASS,
  REVIEW_TYPE_LABELS,
  CYCLE_TYPE_LABELS,
} from '../types/reviews';

function formatDate(value) {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '--';
  }
}

function formatRate(value) {
  if (value === null || value === undefined) return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return '--';
  return `${num.toFixed(num < 10 ? 1 : 0)}%`;
}

export function ReviewItem({ review, onClick }) {
  const detail = review.reviewDetail || {};
  const status = detail.status || 'DRAFT';
  const statusClass = REVIEW_STATUS_CLASS[status] || 'draft';
  const reviewType = detail.reviewType || 'CUSTOM';
  const cycleType = detail.cycleType || 'CUSTOM';
  const period = detail.period || '--';
  const completionRate = detail.completionRate;

  return (
    <article
      className={`reviewCard status-${statusClass}`}
      onClick={() => onClick?.(review.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(review.id);
        }
      }}
    >
      <div className="reviewCardHeader">
        <span className={`reviewStatusTag status-${statusClass}`}>
          {REVIEW_STATUS_LABELS[status] || '草稿'}
        </span>
        <ChevronRight size={18} className="reviewCardArrow" />
      </div>

      <h3 className="reviewCardTitle">{review.title}</h3>

      <div className="reviewCardMeta">
        <div className="reviewMetaItem">
          <Calendar size={13} />
          <span className="metaLabel">周期</span>
          <span className="metaValue">{period}</span>
        </div>
        <div className="reviewMetaItem">
          <Clock size={13} />
          <span className="metaLabel">领域</span>
          <span className="metaValue">
            {REVIEW_TYPE_LABELS[reviewType] || '自定义'}
            <span className="metaSubLabel">
              · {CYCLE_TYPE_LABELS[cycleType] || ''}
            </span>
          </span>
        </div>
      </div>

      <div className="reviewCardFooter">
        <div className="reviewCompletion">
          <TrendingUp size={14} />
          <span className="completionLabel">完成率</span>
          <span className={`completionValue ${completionRate !== null && completionRate !== undefined && completionRate < 50 ? 'low' : ''}`}>
            {formatRate(completionRate)}
          </span>
        </div>
        <span className="reviewCreatedAt">{formatDate(review.createdAt)}</span>
      </div>
    </article>
  );
}
