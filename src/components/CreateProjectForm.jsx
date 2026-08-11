import { useEffect, useState } from 'react';
import { X, FolderKanban, Calendar } from 'lucide-react';
import { createProject, updateProject } from '../services/projectService';
import { getGoals } from '../services/goalService';
import { DOMAIN_OPTIONS } from '../types/projects';

const PRIORITY_OPTIONS = [
  { value: 'P0', label: '紧急' },
  { value: 'P1', label: '重要' },
  { value: 'P2', label: '一般' },
];

const HEALTH_OPTIONS = [
  { value: 'ON_TRACK', label: '正常' },
  { value: 'AT_RISK', label: '有风险' },
  { value: 'OFF_TRACK', label: '已偏离' },
  { value: 'ON_HOLD', label: '搁置' },
];

const CYCLE_OPTIONS = [
  { value: 'YEARLY', label: '年度项目' },
  { value: 'MONTHLY', label: '月度项目' },
  { value: 'WEEKLY', label: '周项目' },
];

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

export function CreateProjectForm({ project, onCreate, onUpdate, onClose }) {
  const isEdit = Boolean(project);
  const [goals, setGoals] = useState([]);
  const [formData, setFormData] = useState({
    title: project?.title || '',
    goalId: project?.metadata?.goalId || project?.parent?.id || '',
    description: project?.description || '',
    priority: project?.priority || 'P2',
    cycleType: getCycleTypeFromId(project?.cycleId),
    domainId: project?.domainId || '',
    plannedEndAt: dateInputValue(project?.plannedEndAt),
    healthStatus: project?.projectDetail?.healthStatus || 'ON_TRACK',
    progress: Number(project?.projectDetail?.progress ?? 0),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    getGoals({ limit: 100 })
      .then((response) => {
        if (mounted) setGoals(response.data || []);
      })
      .catch((err) => {
        console.warn('[CreateProjectForm] Failed to load goals:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedGoal = goals.find((goal) => goal.id === formData.goalId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('请输入项目标题');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        domainId: formData.domainId || selectedGoal?.domainId || undefined,
        cycleId: selectedGoal?.cycleId || buildCycleId(formData.cycleType, formData.plannedEndAt),
        plannedEndAt: formData.plannedEndAt || undefined,
        healthStatus: formData.healthStatus,
        progress: Number(formData.progress),
        metadata: formData.goalId
          ? {
              goalId: formData.goalId,
              goalTitle: selectedGoal?.title,
            }
          : undefined,
      };
      const savedProject = isEdit
        ? await updateProject(project.id, payload)
        : await createProject(payload);
      const normalizedProject = {
        ...savedProject,
        parent: selectedGoal
          ? { id: selectedGoal.id, title: selectedGoal.title, itemType: 'GOAL' }
          : savedProject.parent,
      };
      if (isEdit) {
        onUpdate?.(normalizedProject);
      } else {
        onCreate?.(normalizedProject);
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
            <FolderKanban size={20} />
            <h2>{isEdit ? '编辑项目' : '创建新项目'}</h2>
          </div>
          <button className="modalClose" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>项目标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="输入项目标题..."
              autoFocus
            />
          </div>

          <div className="formGroup">
            <label>所属目标</label>
            <select
              value={formData.goalId}
              onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
            >
              <option value="">暂不关联目标</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label>备注说明</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="补充项目背景、关键范围、交付结果或注意事项。"
              rows={3}
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

          <div className="formGroup">
            <label>健康状态</label>
            <div className="prioritySelect">
              {HEALTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`priorityOption ${formData.healthStatus === opt.value ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, healthStatus: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label>截止日期</label>
              <div className="dateInput">
                <Calendar size={16} />
                <input
                  type="date"
                  value={formData.plannedEndAt}
                  onChange={(e) => setFormData({ ...formData, plannedEndAt: e.target.value })}
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
              {submitting ? '保存中...' : isEdit ? '保存修改' : '创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
