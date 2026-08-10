// src/components/CreateGoalForm.jsx
// 创建目标表单组件

import { useState } from 'react';
import { X, Target, Calendar } from 'lucide-react';
import { DOMAIN_OPTIONS } from '../types/goals';

const PRIORITY_OPTIONS = [
  { value: 'P0', label: '紧急' },
  { value: 'P1', label: '重要' },
  { value: 'P2', label: '一般' },
];

export function CreateGoalForm({ onCreate, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    priority: 'P2',
    domainId: '',
    targetDate: '',
    progress: 0,
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

    try {
      await onCreate({
        title: formData.title.trim(),
        priority: formData.priority,
        domainId: formData.domainId || undefined,
        targetDate: formData.targetDate || undefined,
        progress: Number(formData.progress),
      });
      onClose();
    } catch (err) {
      setError(err.message || '创建失败');
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
            <h2>创建新目标</h2>
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
              placeholder="输入目标标题..."
              autoFocus
            />
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
              <label>初始进度</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              />
            </div>
          </div>

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

          {error && (
            <div className="formError">{error}</div>
          )}

          <div className="formActions">
            <button type="button" className="secondaryButton" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="primaryButton" disabled={submitting}>
              {submitting ? '创建中...' : '创建目标'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
