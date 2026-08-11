import { useMemo, useState } from 'react';
import { X, Target, Calendar } from 'lucide-react';
import { DOMAIN_OPTIONS, GOAL_STATUS_LABELS } from '../types/goals';

const PRIORITY_OPTIONS = [
  { value: 'P0', label: '紧急' },
  { value: 'P1', label: '重要' },
  { value: 'P2', label: '一般' },
];

const CYCLE_OPTIONS = [
  { value: 'YEARLY', label: '年度目标' },
  { value: 'MONTHLY', label: '月度目标' },
  { value: 'WEEKLY', label: '周目标' },
];

const KEY_ELEMENT_OPTIONS = [
  '根本目的',
  '内容本质',
  '目标结果',
  '指标参数',
  '行动指南',
  '组成要素',
  '衡量标准',
  '现状起点',
  '问题障碍',
  '计划执行',
  '结果反馈',
  '其他',
];

const STATUS_OPTIONS = ['PLANNING', 'ACTIVE', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];

function getWeekNumber(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

function buildCycleId(cycleType, targetDate) {
  const baseDate = targetDate ? new Date(targetDate) : new Date();
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  if (cycleType === 'YEARLY') return `yearly:${year}`;
  if (cycleType === 'WEEKLY') return `weekly:${year}-w${String(getWeekNumber(baseDate)).padStart(2, '0')}`;
  return `monthly:${year}-${month}`;
}

function getCycleTypeFromId(cycleId = '') {
  const id = String(cycleId).toLowerCase();
  if (id.includes('year')) return 'YEARLY';
  if (id.includes('week')) return 'WEEKLY';
  return 'MONTHLY';
}

function dateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function parseGoalDescription(description = '') {
  const keyMatch = description.match(/【关键要素】(.+)/);
  const noteMatch = description.match(/【要素说明】([\s\S]+)/);
  return {
    keyElement: keyMatch?.[1]?.trim() || '目标结果',
    note: noteMatch?.[1]?.trim() || description || '',
  };
}

function buildGoalDescription(keyElement, note) {
  const cleanNote = note.trim();
  if (!cleanNote) return `【关键要素】${keyElement}`;
  return `【关键要素】${keyElement}\n【要素说明】${cleanNote}`;
}

export function CreateGoalForm({ goal, onCreate, onUpdate, onClose }) {
  const isEdit = Boolean(goal);
  const parsedDescription = useMemo(() => parseGoalDescription(goal?.description), [goal]);
  const targetDate = goal?.goalDetail?.targetDate || goal?.plannedEndAt || '';

  const [formData, setFormData] = useState({
    title: goal?.title || '',
    status: goal?.status || 'ACTIVE',
    priority: goal?.priority || 'P2',
    cycleType: getCycleTypeFromId(goal?.cycleId),
    keyElement: parsedDescription.keyElement,
    elementNote: parsedDescription.note,
    domainId: goal?.domainId || '',
    targetDate: dateInputValue(targetDate),
    progress: Number(goal?.goalDetail?.progress ?? 0),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('请输入目标标题');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      title: formData.title.trim(),
      description: buildGoalDescription(formData.keyElement, formData.elementNote),
      status: formData.status,
      priority: formData.priority,
      domainId: formData.domainId || undefined,
      cycleId: buildCycleId(formData.cycleType, formData.targetDate),
      targetDate: formData.targetDate || undefined,
      plannedEndAt: formData.targetDate || undefined,
      progress: Number(formData.progress),
    };

    try {
      if (isEdit) {
        await onUpdate(goal.id, payload);
      } else {
        await onCreate(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || (isEdit ? '保存失败' : '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">
            <Target size={20} />
            <h2>{isEdit ? '编辑目标' : '创建新目标'}</h2>
          </div>
          <button className="modalClose" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>目标标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例如：完成 Work OS 重点项目推进"
              autoFocus
            />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label>所属领域</label>
              <select
                value={formData.domainId}
                onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
              >
                <option value="">未分类</option>
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label>关键要素</label>
              <select
                value={formData.keyElement}
                onChange={(e) => setFormData({ ...formData, keyElement: e.target.value })}
              >
                {KEY_ELEMENT_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="formGroup">
            <label>要素说明</label>
            <textarea
              value={formData.elementNote}
              onChange={(e) => setFormData({ ...formData, elementNote: e.target.value })}
              placeholder="说明当前目标的起点、结果、障碍或执行方案，保持一到三句话即可。"
            />
          </div>

          <div className="formGroup">
            <label>周期</label>
            <div className="prioritySelect">
              {CYCLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`priorityOption ${formData.cycleType === opt.value ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, cycleType: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="formGroup">
            <label>优先级</label>
            <div className="prioritySelect">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`priorityOption ${formData.priority === opt.value ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, priority: opt.value })}
                >
                  {opt.value} · {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label>目标日期</label>
              <div className="dateInput">
                <Calendar size={16} />
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                />
              </div>
            </div>

            <div className="formGroup">
              <label>进度</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              />
            </div>
          </div>

          {isEdit && (
            <div className="formGroup">
              <label>状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {GOAL_STATUS_LABELS[status] || status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="formError">{error}</div>
          )}

          <div className="formActions">
            <button type="button" className="secondaryButton" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="primaryButton" disabled={submitting}>
              {submitting ? '保存中...' : isEdit ? '保存修改' : '创建目标'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
