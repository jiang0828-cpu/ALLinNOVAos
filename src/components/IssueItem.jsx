// src/components/IssueItem.jsx
// 问题卡片 —— 展示标题、严重程度、领域、目标值、实际值、偏差、状态

import { AlertTriangle, CheckCircle2, Ban, Pencil } from 'lucide-react';
import {
  ISSUE_LEVEL_LABELS,
  ISSUE_LEVEL_CLASS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_CLASS,
} from '../types/issues';

function formatNumber(value) {
  if (value === null || value === undefined) return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return '--';
  // 整数直接显示，浮点保留 2 位
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function formatGap(value) {
  if (value === null || value === undefined) return '--';
  const num = Number(value);
  if (Number.isNaN(num)) return '--';
  const text = Number.isInteger(num) ? String(num) : num.toFixed(2);
  return num > 0 ? `+${text}` : text;
}

export function IssueItem({ issue, onResolve, onIgnore, onEdit, pendingId }) {
  const detail = issue.issueDetail || {};
  const level = detail.level || 'MEDIUM';
  const status = detail.status || 'OPEN';
  const levelClass = ISSUE_LEVEL_CLASS[level] || 'medium';
  const statusClass = ISSUE_STATUS_CLASS[status] || 'open';
  const isOpen = status === 'OPEN';
  const isBusy = pendingId === issue.id;

  const gap = detail.gapValue;
  const gapClass = gap !== null && gap !== undefined && gap > 0 ? 'positive' : 'negative';
  const domain = detail.metricName || '通用';

  return (
    <article className={`issueCard level-${levelClass}`}>
      <div className="issueCardHeader">
        <span className={`issueLevelTag level-${levelClass}`}>
          {ISSUE_LEVEL_LABELS[level] || '中风险'}
        </span>
        <span className={`issueStatusTag status-${statusClass}`}>
          {ISSUE_STATUS_LABELS[status] || '待处理'}
        </span>
        <button
          type="button"
          className="issueIconBtn"
          onClick={() => onEdit?.(issue)}
          title="查看/编辑问题"
          aria-label="查看/编辑问题"
        >
          <Pencil size={15} />
        </button>
      </div>

      <h3 className="issueCardTitle">{issue.title}</h3>

      <div className="issueCardDomain">
        <AlertTriangle size={13} />
        <span>领域 · {domain}</span>
      </div>

      <div className="issueCardMetrics">
        <div className="metricCell">
          <span className="metricLabel">目标值</span>
          <span className="metricValue">{formatNumber(detail.expectedValue)}</span>
        </div>
        <div className="metricCell">
          <span className="metricLabel">实际值</span>
          <span className="metricValue">{formatNumber(detail.actualValue)}</span>
        </div>
        <div className="metricCell">
          <span className="metricLabel">偏差</span>
          <span className={`metricValue gap-${gapClass}`}>{formatGap(gap)}</span>
        </div>
      </div>

      {isOpen && (
        <div className="issueCardActions">
          <button
            type="button"
            className="issueActionBtn resolve"
            onClick={() => onResolve?.(issue.id)}
            disabled={isBusy}
          >
            <CheckCircle2 size={14} />
            {isBusy ? '处理中...' : '标记已解决'}
          </button>
          <button
            type="button"
            className="issueActionBtn ignore"
            onClick={() => onIgnore?.(issue.id)}
            disabled={isBusy}
          >
            <Ban size={14} />
            忽略
          </button>
        </div>
      )}
    </article>
  );
}
