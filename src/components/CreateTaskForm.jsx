import { useEffect, useState } from 'react';
import { X, Calendar, Flag, Tag, CircleDot, FolderKanban, Target, Timer } from 'lucide-react';
import { DOMAIN_OPTIONS, STATUS_LABELS } from '../types/tasks';
import { getProjects } from '../services/projectService';
import { getGoals } from '../services/goalService';

const CYCLE_OPTIONS = [
  { value: 'YEARLY', label: '年度任务' },
  { value: 'MONTHLY', label: '月度任务' },
  { value: 'WEEKLY', label: '周任务' },
  { value: 'DAILY', label: '日任务' },
];

const PRIORITY_OPTIONS = [
  { value: 'P0', label: 'P0 · 紧急' },
  { value: 'P1', label: 'P1 · 重要' },
  { value: 'P2', label: 'P2 · 一般' },
  { value: 'P3', label: 'P3 · 可选' },
];

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];

function getWeekNumber(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

function buildCycleId(cycleType, dueDate) {
  const baseDate = dueDate ? new Date(dueDate) : new Date();
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  if (cycleType === 'YEARLY') return `yearly:${year}`;
  if (cycleType === 'WEEKLY') return `weekly:${year}-w${String(getWeekNumber(baseDate)).padStart(2, '0')}`;
  if (cycleType === 'DAILY') return `daily:${year}-${month}-${day}`;
  return `monthly:${year}-${month}`;
}

function getCycleTypeFromId(cycleId = '') {
  const id = String(cycleId).toLowerCase();
  if (id.includes('year')) return 'YEARLY';
  if (id.includes('week')) return 'WEEKLY';
  if (id.includes('day') || id.includes('daily')) return 'DAILY';
  return 'MONTHLY';
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function CreateTaskForm({ onCreate, onClose, initialTask = null, mode = 'create' }) {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [priority, setPriority] = useState(initialTask?.priority || 'P2');
  const [status, setStatus] = useState(initialTask?.status || 'TODO');
  const [cycleType, setCycleType] = useState(getCycleTypeFromId(initialTask?.cycleId));
  const [domainId, setDomainId] = useState(initialTask?.domainId || initialTask?.domainName || '');
  const [dueDate, setDueDate] = useState(toDateTimeLocal(initialTask?.dueAt || initialTask?.taskDetail?.dueAt));
  const [actualMinutes, setActualMinutes] = useState(initialTask?.taskDetail?.actualMinutes ?? '');
  const [projectId, setProjectId] = useState(initialTask?.projectId || initialTask?.parent?.id || '');
  const [goalId, setGoalId] = useState(initialTask?.goalId || '');
  const [projects, setProjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function loadRelations() {
      try {
        const [projectResponse, goalResponse] = await Promise.all([
          getProjects({ limit: 100 }),
          getGoals({ limit: 100 }),
        ]);
        if (!alive) return;
        setProjects(projectResponse.data || []);
        setGoals(goalResponse.data || []);
      } catch (err) {
        console.warn('[CreateTaskForm] Failed to load task relations:', err);
      }
    }
    loadRelations();
    return () => {
      alive = false;
    };
  }, []);

  const selectedProject = projects.find((project) => project.id === projectId);
  const selectedGoal = goals.find((goal) => goal.id === goalId);

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
        description: description.trim() || undefined,
        status,
        priority,
        cycleId: selectedProject?.cycleId || selectedGoal?.cycleId || buildCycleId(cycleType, dueDate),
        domainId: domainId || selectedProject?.domainId || selectedGoal?.domainId || undefined,
        projectId: projectId || undefined,
        goalId: goalId || undefined,
        dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
        actualMinutes: actualMinutes === '' ? undefined : Number(actualMinutes),
      });
      onClose?.();
    } catch (err) {
      setError(err.message || (mode === 'edit' ? '保存任务失败' : '创建任务失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="modalCard createTaskModal">
        <div className="modalHeader">
          <div className="modalIcon">✦</div>
          <h2>{mode === 'edit' ? '编辑任务' : '创建新任务'}</h2>
          <button className="modalCloseBtn" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="createTaskForm">
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

          <div className="formGroup">
            <label htmlFor="taskDescription">备注说明</label>
            <textarea
              id="taskDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="补充任务背景、执行要点或验收标准。"
              rows={3}
            />
          </div>

          <div className="formGroup">
            <label><Flag size={16} />优先级</label>
            <div className="priorityOptions">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`priorityOption ${priority === opt.value ? 'active' : ''}`}
                  onClick={() => setPriority(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="formGroup">
            <label>周期</label>
            <div className="priorityOptions">
              {CYCLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`priorityOption ${cycleType === opt.value ? 'active' : ''}`}
                  onClick={() => setCycleType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="formGroup">
            <label htmlFor="taskStatus"><CircleDot size={16} />状态</label>
            <select id="taskStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>{STATUS_LABELS[item] || item}</option>
              ))}
            </select>
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label htmlFor="taskDueDate"><Calendar size={16} />截止时间</label>
              <input
                id="taskDueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="formGroup">
              <label htmlFor="taskActualMinutes"><Timer size={16} />耗时时长 (min)</label>
              <input
                id="taskActualMinutes"
                type="number"
                min="0"
                value={actualMinutes}
                onChange={(e) => setActualMinutes(e.target.value)}
                placeholder="自动或手动记录"
              />
            </div>
          </div>

          <div className="formGroup">
            <label htmlFor="taskDomain"><Tag size={16} />所属领域</label>
            <select id="taskDomain" value={domainId} onChange={(e) => setDomainId(e.target.value)}>
              <option value="">未分类</option>
              {DOMAIN_OPTIONS.map((domain) => (
                <option key={domain.id} value={domain.name}>{domain.label}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label htmlFor="taskProject"><FolderKanban size={16} />所属项目</label>
            <select id="taskProject" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">未关联项目</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label htmlFor="taskGoal"><Target size={16} />所属目标</label>
            <select id="taskGoal" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">未关联目标</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
          </div>

          {error && <div className="formError">{error}</div>}

          <div className="formActions">
            <button type="button" className="ghostButton" onClick={onClose} disabled={loading}>
              取消
            </button>
            <button type="submit" className="primaryButton" disabled={loading || !title.trim()}>
              {loading ? (mode === 'edit' ? '保存中...' : '创建中...') : (mode === 'edit' ? '保存修改' : '创建任务')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
