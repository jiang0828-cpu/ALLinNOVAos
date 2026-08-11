// src/pages/ProjectsPage.jsx
// 项目列表主页面

import { useState, useEffect, useCallback } from 'react';
import { Plus, FolderKanban, RefreshCw, AlertCircle, ChevronRight, Pencil } from 'lucide-react';
import { getProjects, deleteProject } from '../services/projectService';
import { CreateProjectForm } from '../components/CreateProjectForm';
import { createLocalBackup } from '../services/localBackupStore';
import {
  PROJECT_STATUS_LABELS,
  PRIORITY_LABELS,
  HEALTH_STATUS_LABELS,
  HEALTH_STATUS_COLORS,
  DOMAIN_OPTIONS,
  getDomainLabel,
} from '../types/projects';

const INITIAL_FILTERS = {
  status: [],
  priority: [],
  domainId: undefined,
};

const CYCLE_OPTIONS = [
  { key: 'ALL', label: '全部' },
  { key: 'YEARLY', label: '年' },
  { key: 'MONTHLY', label: '月' },
  { key: 'WEEKLY', label: '周' },
];

const CYCLE_LABELS = {
  YEARLY: '年度项目',
  MONTHLY: '月度项目',
  WEEKLY: '周项目',
};

function getProjectCycleType(project) {
  const cycleId = String(project.cycleId || '').toLowerCase();
  if (cycleId.includes('year')) return 'YEARLY';
  if (cycleId.includes('month')) return 'MONTHLY';
  if (cycleId.includes('week')) return 'WEEKLY';

  const endDate = project.plannedEndAt;
  if (!endDate) return 'MONTHLY';
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return 'MONTHLY';

  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (daysLeft <= 14) return 'WEEKLY';
  if (daysLeft <= 75) return 'MONTHLY';
  return 'YEARLY';
}

function getProjectCycleLabel(project) {
  return CYCLE_LABELS[getProjectCycleType(project)] || '月度项目';
}

function syncDashboardAfterProjectChange() {
  createLocalBackup();
  window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
}

export function ProjectsPage({ onNavigateToProject }) {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);

    try {
      const response = await getProjects(filters);
      setProjects(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err);
      console.error('[ProjectsPage] Failed to load projects:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const openCreateProject = (event) => {
      if (event.detail?.actionId && event.detail.actionId !== 'project') return;
      window.sessionStorage.removeItem('nova-pending-quick-action');
      setEditingProject(null);
      setIsCreateModalOpen(true);
    };

    if (window.sessionStorage.getItem('nova-pending-quick-action') === 'project') {
      openCreateProject({ detail: { actionId: 'project' } });
    }

    window.addEventListener('nova:quick-create', openCreateProject);
    return () => window.removeEventListener('nova:quick-create', openCreateProject);
  }, []);

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('确定要删除这个项目吗？')) return;
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setTotal((prev) => prev - 1);
      syncDashboardAfterProjectChange();
    } catch (err) {
      console.error('[ProjectsPage] Failed to delete project:', err);
      alert('删除项目失败: ' + (err.message || '未知错误'));
    }
  };

  const handleUpdateProject = (updatedProject) => {
    setProjects((prev) =>
      prev.map((project) => (project.id === updatedProject.id ? { ...project, ...updatedProject } : project))
    );
    setEditingProject(null);
    syncDashboardAfterProjectChange();
  };

  const toggleStatusFilter = (status) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const togglePriorityFilter = (priority) => {
    setFilters((prev) => ({
      ...prev,
      priority: prev.priority.includes(priority)
        ? prev.priority.filter((p) => p !== priority)
        : [...prev.priority, priority],
    }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCycleFilter('ALL');
  };

  const visibleProjects = projects.filter((project) => (
    cycleFilter === 'ALL' || getProjectCycleType(project) === cycleFilter
  ));

  // Loading state
  if (loading) {
    return (
      <div className="projectsPage">
        <div className="projectsPageSkeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="projectSkeletonCard">
              <div className="skeleton skeleton-line" style={{ width: '40%' }} />
              <div className="skeleton skeleton-line" style={{ width: '80%' }} />
              <div className="skeleton skeleton-line" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="projectsPage">
      <div className="projectsPageHeader">
        <div className="projectsPageTitle">
          <span className="sectionEyebrow">PROJECTS</span>
          <h1>项目管理</h1>
          <span className="projectsPageMeta">
            <FolderKanban size={18} />
            共 {total} 个项目
          </span>
        </div>
        <div className="projectsPageActions">
          <button
            className="iconButton"
            onClick={loadProjects}
            disabled={isRefreshing}
            title="刷新"
          >
            <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
          </button>
          <button
            className="primaryButton"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={18} />
            新建项目
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="errorState">
          <AlertCircle size={48} />
          <h3>加载失败</h3>
          <p>{error.message || '未知错误'}</p>
          <button className="primaryButton" onClick={loadProjects}>
            重试
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* Filters */}
          <div className="projectsFilters">
            <div className="filterGroup">
              <span className="filterLabel">周期</span>
              {CYCLE_OPTIONS.map((cycle) => (
                <button
                  key={cycle.key}
                  className={`filterChip ${cycleFilter === cycle.key ? 'active' : ''}`}
                  onClick={() => setCycleFilter(cycle.key)}
                >
                  {cycle.label}
                </button>
              ))}
            </div>
            <div className="filterGroup">
              <span className="filterLabel">状态</span>
              {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`filterChip ${filters.status.includes(key) ? 'active' : ''}`}
                  onClick={() => toggleStatusFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="filterGroup">
              <span className="filterLabel">优先级</span>
              {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`filterChip ${filters.priority.includes(key) ? 'active' : ''}`}
                  onClick={() => togglePriorityFilter(key)}
                >
                  {key} · {label}
                </button>
              ))}
            </div>
            <div className="filterGroup">
              <span className="filterLabel">领域</span>
              <select
                className="filterSelect"
                value={filters.domainId || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, domainId: e.target.value || undefined }))}
              >
                <option value="">全部领域</option>
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
            {(filters.status.length > 0 || filters.priority.length > 0 || filters.domainId || cycleFilter !== 'ALL') && (
              <button className="resetButton" onClick={handleResetFilters}>
                重置筛选
              </button>
            )}
          </div>

          {/* Empty state */}
          {visibleProjects.length === 0 && (
            <div className="emptyState">
              <FolderKanban size={48} />
              <h3>暂无项目</h3>
              <p>点击"新建项目"来创建你的第一个项目</p>
              <button className="primaryButton" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={16} />
                新建项目
              </button>
            </div>
          )}

          {/* Projects grid */}
          {visibleProjects.length > 0 && (
            <div className="projectsGrid">
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => onNavigateToProject?.(project.id)}
                  onEdit={setEditingProject}
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>
          )}
        </>
      )}

      {isCreateModalOpen && (
        <CreateProjectForm
          onCreate={(p) => {
            setProjects((prev) => [p, ...prev]);
            setTotal((prev) => prev + 1);
            syncDashboardAfterProjectChange();
          }}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {editingProject && (
        <CreateProjectForm
          project={editingProject}
          onUpdate={handleUpdateProject}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, onClick, onEdit, onDelete }) {
  const progress = project.projectDetail?.progress ?? 0;
  const healthStatus = project.projectDetail?.healthStatus;
  const domainLabel = getDomainLabel(project.domainId);

  return (
    <div className="projectCard" onClick={onClick}>
      <div className="projectCardHeader">
        <div className="projectCardTitle">
          {project.priority && (
            <span className={`priorityBadge priority-${project.priority.toLowerCase()}`}>
              {project.priority}
            </span>
          )}
          <span className="cycleBadge">{getProjectCycleLabel(project)}</span>
          <h3>{project.title}</h3>
        </div>
        {healthStatus && (
          <span
            className="healthBadge"
            style={{ backgroundColor: HEALTH_STATUS_COLORS[healthStatus] }}
          >
            {HEALTH_STATUS_LABELS[healthStatus]}
          </span>
        )}
      </div>

      {project.description && (
        <p className="projectCardDesc">{project.description}</p>
      )}

      <div className="projectCardProgress">
        <div className="progressBar">
          <div
            className="progressFill"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              backgroundColor: healthStatus ? HEALTH_STATUS_COLORS[healthStatus] : undefined,
            }}
          />
        </div>
        <span className="progressText">{Math.round(progress)}%</span>
      </div>

      <div className="projectCardMeta">
        <span className="metaItem">
          <ChevronRight size={14} />
          {domainLabel}
        </span>
        {project.parent && (
          <span className="metaItem">
            <ChevronRight size={14} />
            关联目标: {project.parent.title}
          </span>
        )}
        <span className={`statusBadge status-${project.status.toLowerCase()}`}>
          {PROJECT_STATUS_LABELS[project.status] || project.status}
        </span>
        {project.plannedEndAt && (
          <span className="metaItem">
            截止: {new Date(project.plannedEndAt).toLocaleDateString('zh-CN')}
          </span>
        )}
      </div>

      <div className="projectCardActions" onClick={(e) => e.stopPropagation()}>
        <button className="textButton" onClick={() => onEdit?.(project)}>
          <Pencil size={14} />
          编辑
        </button>
        <button className="textButton danger" onClick={() => onDelete?.(project.id)}>
          删除
        </button>
      </div>
    </div>
  );
}
