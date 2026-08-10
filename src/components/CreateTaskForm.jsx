// src/components/CreateTaskForm.jsx
// 创建任务表单组件（第一版简化）

import { useState } from 'react';
import { X, Calendar, Flag, Tag } from 'lucide-react';
import { DOMAIN_OPTIONS } from '../types/tasks';

export function CreateTaskForm({ onCreate, onClose }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('P2');
  const [domainId, setDomainId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请输入任务标题');
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        title: title.trim(),
        priority,
        domainId: domainId || undefined,
        dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onClose?.();
    } catch (err) {
      setError(err.message || '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: 'P0', label: 'P0 · 紧急', color: '#173a34' },
    { value: 'P1', label: 'P1 · 重要', color: '#2d7768' },
    { value: 'P2', label: 'P2 · 一般', color: '#d59a2f' },
    { value: 'P3', label: 'P3 · 可选', color: '#66706a' },
  ];

  return (
    <div className="modalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="modalCard createTaskModal">
        <div className="modalHeader">
          <div className="modalIcon">✨</div>
          <h2>创建新任务</h2>
          <button className="modalCloseBtn" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="createTaskForm">
          {/* 标题 */}
          <div className="formGroup">
            <label htmlFor="taskTitle">任务标题 *</label>
            <input
              id="taskTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入任务标题..."
              maxLength={100}
              autoFocus
            />
          </div>

          {/* 优先级 */}
          <div className="formGroup">
            <label>
              <Flag size={16} />
              优先级
            </label>
            <div className="priorityOptions">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`priorityOption ${priority === opt.value ? 'active' : ''}`}
                  style={{
                    '--option-color': opt.color,
                  }}
                  onClick={() => setPriority(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 截止时间 */}
          <div className="formGroup">
            <label htmlFor="taskDueDate">
              <Calendar size={16} />
              截止时间
            </label>
            <input
              id="taskDueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* 所属领域 */}
          <div className="formGroup">
            <label htmlFor="taskDomain">
              <Tag size={16} />
              所属领域
            </label>
            <select
              id="taskDomain"
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
            >
              <option value="">未分类</option>
              {DOMAIN_OPTIONS.map((domain) => (
                <option key={domain.id} value={domain.name}>
                  {domain.label}
                </option>
              ))}
            </select>
          </div>

          {/* 错误提示 */}
          {error && <div className="formError">{error}</div>}

          {/* 操作按钮 */}
          <div className="formActions">
            <button
              type="button"
              className="ghostButton"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="primaryButton"
              disabled={loading || !title.trim()}
            >
              {loading ? '创建中...' : '创建任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
