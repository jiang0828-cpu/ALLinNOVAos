// src/pages/IssuesPage.jsx
// 问题中心页面 —— /issues

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { getIssues } from '../services/issueService';
import { IssueItem } from '../components/IssueItem';
import { IssueFilters } from '../components/IssueFilters';
import { IssueSkeleton } from '../components/IssueSkeleton';

// 通知 Dashboard 刷新
function notifyDashboardRefresh() {
  window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
}

export function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);

    try {
      const response = await getIssues({
        status: selectedStatus.length > 0 ? selectedStatus : undefined,
      });
      setIssues(response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err);
      console.error('[IssuesPage] Failed to load issues:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  useEffect(() => {
    const handleRefresh = () => loadIssues();
    window.addEventListener('nova:refresh-issues', handleRefresh);
    return () => window.removeEventListener('nova:refresh-issues', handleRefresh);
  }, [loadIssues]);

  const handleToggleStatus = (value) => {
    if (value === null) {
      setSelectedStatus([]);
      return;
    }
    setSelectedStatus((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  return (
    <div className="issuesPage">
      <header className="issuesPageHeader">
        <div className="issuesPageTitle">
          <h1>问题 · 风险中心</h1>
          <span className="issuesPageMeta">
            <AlertTriangle size={14} />
            共 {total} 条问题
          </span>
        </div>
        <div className="issuesPageActions">
          <button
            type="button"
            className="refreshBtn"
            onClick={loadIssues}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
            刷新
          </button>
        </div>
      </header>

      <IssueFilters selected={selectedStatus} onToggle={handleToggleStatus} />

      {loading ? (
        <IssueSkeleton count={6} />
      ) : error ? (
        <div className="errorState">
          <AlertCircle size={48} />
          <h3>问题加载失败</h3>
          <p className="errorMessage">{error.message || '无法获取问题数据'}</p>
          <button className="retryButton" onClick={loadIssues}>
            <RefreshCw size={16} />
            <span>重试</span>
          </button>
        </div>
      ) : issues.length === 0 ? (
        <div className="emptyState fullEmpty">
          <ShieldCheck size={48} />
          <h3>暂无活跃问题</h3>
          <p>系统运转良好，所有指标都在目标范围内</p>
        </div>
      ) : (
        <div className="issuesGrid">
          {issues.map((issue) => (
            <IssueItem key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
