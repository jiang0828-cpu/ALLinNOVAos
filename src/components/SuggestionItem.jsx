// src/components/SuggestionItem.jsx
// 建议卡片 —— 展示标题、优先级、原因、证据、关联问题 + 操作按钮

import { CheckCircle2, Ban, Clock, Sparkles, Link2, Pencil } from 'lucide-react';
import {
  SUGGESTION_STATUS_LABELS,
  SUGGESTION_STATUS_CLASS,
  SUGGESTION_SOURCE_LABELS,
} from '../types/suggestions';
import { PRIORITY_COLORS, getPriorityTextColor } from '../types/dashboard';

function formatEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') return [];
  const entries = Object.entries(evidence).slice(0, 4);
  return entries.map(([key, value]) => {
    let display = value;
    if (typeof value === 'object' && value !== null) {
      display = JSON.stringify(value);
    }
    const text = String(display);
    return { key, value: text.length > 60 ? `${text.slice(0, 60)}…` : text };
  });
}

function truncateId(id) {
  if (!id || typeof id !== 'string') return '--';
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function SuggestionItem({ suggestion, onAccept, onDismiss, onDefer, onEdit, pendingId }) {
  const detail = suggestion.suggestionDetail || {};
  const status = detail.status || 'PENDING';
  const statusClass = SUGGESTION_STATUS_CLASS[status] || 'pending';
  const priority = suggestion.priority || detail.priority || 'P2';
  const isPending = status === 'PENDING' || status === 'DEFERRED';
  const isBusy = pendingId === suggestion.id;
  const isAccepted = status === 'ACCEPTED';

  const sourceLabel = SUGGESTION_SOURCE_LABELS[detail.sourceType] || '系统';
  const evidenceList = formatEvidence(detail.evidence);
  const reason = detail.reason || suggestion.description || '系统基于当前数据自动生成';

  return (
    <article className={`suggestionCard status-${statusClass}`}>
      <div className="suggestionCardHeader">
        <span
          className="suggestionPriority"
          style={{
            background: PRIORITY_COLORS[priority],
            color: getPriorityTextColor(priority),
          }}
        >
          {priority}
        </span>
        <h3 className="suggestionCardTitle">{suggestion.title}</h3>
        <span className={`suggestionStatusTag status-${statusClass}`}>
          {SUGGESTION_STATUS_LABELS[status] || '待处理'}
        </span>
        <button
          type="button"
          className="suggestionIconBtn"
          onClick={() => onEdit?.(suggestion)}
          title="查看/编辑建议"
          aria-label="查看/编辑建议"
        >
          <Pencil size={15} />
        </button>
      </div>

      {/* 原因：为什么生成此建议 */}
      <div className="suggestionReason">
        <div className="reasonLabel">
          <Sparkles size={13} />
          <span>生成原因</span>
        </div>
        <p className="reasonText">{reason}</p>
      </div>

      {/* 证据 */}
      {evidenceList.length > 0 && (
        <div className="suggestionEvidence">
          <div className="reasonLabel">
            <Link2 size={13} />
            <span>支撑证据</span>
          </div>
          <ul className="evidenceList">
            {evidenceList.map((item) => (
              <li key={item.key} className="evidenceItem">
                <span className="evidenceKey">{item.key}</span>
                <span className="evidenceValue">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 关联问题 */}
      <div className="suggestionSource">
        <span className="sourceLabel">关联问题</span>
        <span className="sourceValue">
          {sourceLabel} · {truncateId(detail.sourceRefId)}
        </span>
        {detail.isConverted && (
          <span className="convertedBadge">已生成任务</span>
        )}
      </div>

      {/* 操作按钮 */}
      {isPending && (
        <div className="suggestionActions">
          <button
            type="button"
            className="suggestionBtn accept"
            onClick={() => onAccept(suggestion.id)}
            disabled={isBusy}
          >
            <CheckCircle2 size={14} />
            {isBusy ? '处理中…' : '接受并创建任务'}
          </button>
          <button
            type="button"
            className="suggestionBtn dismiss"
            onClick={() => onDismiss(suggestion.id)}
            disabled={isBusy}
          >
            <Ban size={14} />
            忽略
          </button>
          <button
            type="button"
            className="suggestionBtn defer"
            onClick={() => onDefer(suggestion.id)}
            disabled={isBusy}
          >
            <Clock size={14} />
            稍后处理
          </button>
        </div>
      )}

      {!isPending && isAccepted && (
        <div className="suggestionFooter acceptedFooter">
          <CheckCircle2 size={14} />
          <span>已接受，{detail.isConverted ? '任务已生成' : '决策已记录'}</span>
        </div>
      )}
    </article>
  );
}
