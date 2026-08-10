// src/pages/ProjectDetailPage.jsx
// 项目详情页面

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle, Calendar, User, ExternalLink } from 'lucide-react';
import { getProjectById, updateProject } from '../services/projectService';
import {
  PROJECT_STATUS_LABELS,
  PRIORITY_LABELS,
  HEALTH_STATUS_LABELS,
  HEALTH_STATUS_COLORS,
  DOMAIN_OPTIONS,
  getDomainLabel,
} from '../types/projects';

export function ProjectDetailPage({ projectId, onBack, onNavigateToTask }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);

    try {
      const data = await getProjectById(projectId);
      setProject(data);
    } catch (err) {
      setError(err);
      console.error('[ProjectDetailPage] Failed to load project:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleQuickUpdate = async (field, value) => {
    try {
      const updated = await updateProject(projectId, { [field]: value });
      setProject((prev) => ({
        ...prev,
        ...updated,
        projectDetail: updated.projectDetail || prev?.projectDetail,
      }));
    } catch (err) {
      console.error('[ProjectDetailPage] Failed to update project:', err);
      alert('更新失败: ' + (err.message || '未知错误'));
    }
  };

  if (loading) {
    return (
      <div className="projectDetailPage">
        <div className="detailSkeleton">
          <div className="skeleton skeleton-line" style={{ width: '30%' }} />
          <div className="skeleton skeleton-line" style={{ width: '60%' }} />
          <div className="skeleton skeleton-line" style={{ width: '40%' }} />
          <div className="skeleton skeleton-line" style={{ width: '80%' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projectDetailPage">
        <div className="errorState">
          <AlertCircle size={48} />
          <h3>加载失败</h3>
          <p>{error.message || '未知错误'}</p>
          <div className="errorActions">
            <button className="primaryButton" onClick={loadProject}>
              重试
            </button>
            <button className="secondaryButton" onClick={onBack}>
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const progress = project.projectDetail?.progress ?? 0;
  const healthStatus = project.projectDetail?.healthStatus;
  const domainLabel = getDomainLabel(project.domainId);

  return (
    <div className="projectDetailPage">
      <div className="detailPageHeader">
        <button className="backButton" onClick={onBack}>
          <ArrowLeft size={18} />
          返回项目列表
        </button>
        <button
          className="iconButton"
          onClick={loadProject}
          disabled={isRefreshing}
          title="刷新"
        >
          <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
        </button>
      </div>

      <div className="detailHeader">
        <div className="detailTitle">
          {project.priority && (
            <span className={`priorityBadge priority-${project.priority.toLowerCase()}`}>
              {project.priority}
            </span>
          )}
          <h1>{project.title}</h1>
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
          <p className="detailDescription">{project.description}</p>
        )}
        <div className="detailMeta">
          <span className={`statusBadge status-${project.status.toLowerCase()}`}>
            {PROJECT_STATUS_LABELS[project.status] || project.status}
          </span>
          <span className="metaItem">{domainLabel}</span>
          {project.parent && (
            <span className="metaItem">
              关联目标: {project.parent.title}
            </span>
          )}
          {project.plannedEndAt && (
            <span className="metaItem">
              <Calendar size={14} />
              截止: {new Date(project.plannedEndAt).toLocaleDateString('zh-CN')}
            </span>
          )}
        </div>
      </div>

      {/* Progress section */}
      <div className="detailSection">
        <h2>项目进度</h2>
        <div className="progressSection">
          <div className="progressBar large">
            <div
              className="progressFill"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: healthStatus ? HEALTH_STATUS_COLORS[healthStatus] : undefined,
              }}
            />
          </div>
          <div className="progressInfo">
            <span className="progressLargeNumber">{Math.round(progress)}%</span>
            <span className="progressLabel">完成度</span>
          </div>
          <div className="progressActions">
            <button
              className="secondaryButton"
              onClick={() => handleQuickUpdate('progress', Math.max(0, progress - 10))}
              disabled={progress <= 0}
            >
              -10%
            </button>
            <button
              className="primaryButton"
              onClick={() => handleQuickUpdate('progress', Math.min(100, progress + 10))}
              disabled={progress >= 100}
            >
              +10%
            </button>
          </div>
        </div>
        {project.projectDetail?.budget != null && (
          <div className="budgetInfo">
            <span>预算: ¥{project.projectDetail.budget}</span>
            {project.projectDetail.actualCost != null && (
              <span>实际: ¥{project.projectDetail.actualCost}</span>
            )}
          </div>
        )}
      </div>

      {/* Tasks section */}
      <div className="detailSection">
        <h2>关联任务 ({project.tasks?.length || 0})</h2>
        {(!project.tasks || project.tasks.length === 0) ? (
          <div className="emptySection">
            <p>暂无关联任务</p>
            <button className="primaryButton" onClick={onBack}>
              前往任务页创建
            </button>
          </div>
        ) : (
          <div className="taskList">
            {project.tasks.map((task) => (
              <div
                key={task.id}
                className="taskListItem"
                onClick={() => onNavigateToTask?.(task.id)}
              >
                <div className="taskItemInfo">
                  <span className="taskItemTitle">{task.title}</span>
                  <span className={`statusBadge status-${task.status?.toLowerCase() || 'todo'}`}>
                    {task.status}
                  </span>
                </div>
                <ExternalLink size={14} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issues section */}
      <div className="detailSection">
        <h2>相关问题 ({project.issues?.length || 0})</h2>
        {(!project.issues || project.issues.length === 0) ? (
          <div className="emptySection">
            <p>暂无相关问题</p>
          </div>
        ) : (
          <div className="issueList">
            {project.issues.map((issue) => (
              <div key={issue.id} className="issueItem">
                <div className={`issueLevel level-${issue.level?.toLowerCase()}`}>
                  {issue.level}
                </div>
                <div className="issueInfo">
                  <span className="issueTitle">{issue.title}</span>
                  <span className="issueStatus">{issue.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
