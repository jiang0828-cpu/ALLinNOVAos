// src/pages/IssuesPage.jsx
// 问题中心页面 —— /issues

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, AlertCircle, ShieldCheck, Plus, X, Save } from 'lucide-react';
import { getIssues, createIssue, updateIssueStatus, updateIssue } from '../services/issueService';
import { createLocalBackup } from '../services/localBackupStore';
import { IssueItem } from '../components/IssueItem';
import { IssueFilters } from '../components/IssueFilters';
import { IssueSkeleton } from '../components/IssueSkeleton';

// 通知 Dashboard 刷新
function notifyDashboardRefresh() {
  window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
  window.dispatchEvent(new CustomEvent('nova:refresh-suggestions'));
}

export function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [savingIssue, setSavingIssue] = useState(false);
  const [pendingIssueId, setPendingIssueId] = useState(null);

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
    const openCreateIssue = (event) => {
      if (event.detail?.actionId && event.detail.actionId !== 'issue') return;
      window.sessionStorage.removeItem('nova-pending-quick-action');
      setIsCreateModalOpen(true);
    };

    if (window.sessionStorage.getItem('nova-pending-quick-action') === 'issue') {
      openCreateIssue({ detail: { actionId: 'issue' } });
    }

    window.addEventListener('nova:quick-create', openCreateIssue);
    return () => window.removeEventListener('nova:quick-create', openCreateIssue);
  }, []);

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

  const handleCreateIssue = async (payload) => {
    try {
      const newIssue = await createIssue(payload);
      createLocalBackup();
      setIssues((prev) => [newIssue, ...prev]);
      setTotal((prev) => prev + 1);
      notifyDashboardRefresh();
      window.dispatchEvent(new CustomEvent('nova:refresh-issues'));
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('[IssuesPage] Failed to create issue:', err);
      throw err;
    }
  };

  const updateIssueInList = (issueId, status) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status,
              issueDetail: {
                ...(issue.issueDetail || {}),
                status,
              },
            }
          : issue
      )
    );
  };

  const handleResolveIssue = async (issueId) => {
    setPendingIssueId(issueId);
    try {
      await updateIssueStatus(issueId, 'RESOLVED');
      updateIssueInList(issueId, 'RESOLVED');
      createLocalBackup();
      notifyDashboardRefresh();
      window.dispatchEvent(new CustomEvent('nova:refresh-issues'));
    } catch (err) {
      console.error('[IssuesPage] Failed to resolve issue:', err);
      alert('处理问题失败: ' + (err.message || '未知错误'));
    } finally {
      setPendingIssueId(null);
    }
  };

  const handleIgnoreIssue = async (issueId) => {
    setPendingIssueId(issueId);
    try {
      await updateIssueStatus(issueId, 'IGNORED');
      updateIssueInList(issueId, 'IGNORED');
      createLocalBackup();
      notifyDashboardRefresh();
      window.dispatchEvent(new CustomEvent('nova:refresh-issues'));
    } catch (err) {
      console.error('[IssuesPage] Failed to ignore issue:', err);
      alert('忽略问题失败: ' + (err.message || '未知错误'));
    } finally {
      setPendingIssueId(null);
    }
  };

  const handleSaveIssue = async (issueId, payload) => {
    setSavingIssue(true);
    try {
      const updated = await updateIssue(issueId, payload);
      createLocalBackup();
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                ...updated,
                issueDetail: {
                  ...(issue.issueDetail || {}),
                  ...(updated.issueDetail || {}),
                },
              }
            : issue
        )
      );
      setEditingIssue(null);
      notifyDashboardRefresh();
      window.dispatchEvent(new CustomEvent('nova:refresh-issues'));
    } catch (err) {
      console.error('[IssuesPage] Failed to update issue:', err);
      alert('保存问题失败: ' + (err.message || '未知错误'));
    } finally {
      setSavingIssue(false);
    }
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
          <button
            type="button"
            className="primaryButton"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} />
            记录问题
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
            <IssueItem
              key={issue.id}
              issue={issue}
              onResolve={handleResolveIssue}
              onIgnore={handleIgnoreIssue}
              onEdit={setEditingIssue}
              pendingId={pendingIssueId}
            />
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateIssueModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateIssue}
        />
      )}

      {editingIssue && (
        <IssueEditModal
          issue={editingIssue}
          saving={savingIssue}
          onClose={() => !savingIssue && setEditingIssue(null)}
          onSave={handleSaveIssue}
        />
      )}
    </div>
  );
}

function IssueEditModal({ issue, saving, onClose, onSave }) {
  const detail = issue.issueDetail || {};
  const [form, setForm] = useState({
    title: issue.title || '',
    description: issue.description || '',
    level: detail.level || 'MEDIUM',
    status: detail.status || issue.status || 'OPEN',
    domainId: issue.domainId || detail.domainId || 'other',
    expectedValue: detail.expectedValue ?? '',
    actualValue: detail.actualValue ?? '',
    gapValue: detail.gapValue ?? '',
  });
  const [error, setError] = useState(null);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const toOptionalNumber = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? null : numberValue;
  };

  const expectedNumber = toOptionalNumber(form.expectedValue);
  const actualNumber = toOptionalNumber(form.actualValue);
  const calculatedGap =
    expectedNumber !== null && actualNumber !== null
      ? actualNumber - expectedNumber
      : null;
  const displayGap = calculatedGap === null ? '--' : calculatedGap;

  const handleSubmit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError('请填写问题标题');
      return;
    }

    onSave(issue.id, {
      title,
      description: form.description.trim(),
      status: form.status,
      level: form.level,
      domainId: form.domainId,
      issueDetail: {
        level: form.level,
        status: form.status,
        domainId: form.domainId,
        expectedValue: toOptionalNumber(form.expectedValue),
        actualValue: toOptionalNumber(form.actualValue),
        gapValue: calculatedGap,
      },
    });
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent issueEditModal" onClick={(event) => event.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">
            <AlertTriangle size={20} />
            <h2>查看/编辑问题</h2>
          </div>
          <button type="button" className="modalClose" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <form className="modalForm" onSubmit={handleSubmit}>
          <div className="formGroup">
            <label htmlFor="editIssueTitle">问题标题 *</label>
            <input
              id="editIssueTitle"
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </div>

          <div className="formGroup">
            <label htmlFor="editIssueDescription">问题说明</label>
            <textarea
              id="editIssueDescription"
              rows={4}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label htmlFor="editIssueLevel">风险等级</label>
              <select
                id="editIssueLevel"
                value={form.level}
                onChange={(event) => updateField('level', event.target.value)}
              >
                <option value="HIGH">高风险</option>
                <option value="MEDIUM">中风险</option>
                <option value="LOW">低风险</option>
              </select>
            </div>

            <div className="formGroup">
              <label htmlFor="editIssueStatus">状态</label>
              <select
                id="editIssueStatus"
                value={form.status}
                onChange={(event) => updateField('status', event.target.value)}
              >
                <option value="OPEN">待处理</option>
                <option value="RESOLVED">已解决</option>
                <option value="IGNORED">已忽略</option>
              </select>
            </div>
          </div>

          <div className="formGroup">
            <label htmlFor="editIssueDomain">所属领域</label>
            <select
              id="editIssueDomain"
              value={form.domainId}
              onChange={(event) => updateField('domainId', event.target.value)}
            >
              <option value="work">工作</option>
              <option value="health">健康</option>
              <option value="wealth">财富</option>
              <option value="content">生活</option>
              <option value="learning">学习</option>
              <option value="agi">AGI</option>
              <option value="media">市场</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label htmlFor="editIssueExpected">目标值</label>
              <input
                id="editIssueExpected"
                type="number"
                value={form.expectedValue}
                onChange={(event) => updateField('expectedValue', event.target.value)}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="editIssueActual">实际值</label>
              <input
                id="editIssueActual"
                type="number"
                value={form.actualValue}
                onChange={(event) => updateField('actualValue', event.target.value)}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="editIssueGap">偏差</label>
              <input
                id="editIssueGap"
                type="text"
                value={displayGap}
                readOnly
              />
            </div>
          </div>

          {error && <div className="modalError">{error}</div>}

          <div className="modalActions">
            <button type="button" className="secondaryButton" onClick={onClose} disabled={saving}>
              取消
            </button>
            <button type="submit" className="primaryButton" disabled={saving}>
              <Save size={16} />
              {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateIssueModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    level: 'MEDIUM',
    domainId: 'work',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setError('请填写问题标题');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title,
        description: form.description.trim(),
        level: form.level,
        domainId: form.domainId,
      });
    } catch (err) {
      setError(err.message || '问题记录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={() => !submitting && onClose()}>
      <div className="modalContent createTaskModal" onClick={(event) => event.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">
            <AlertTriangle size={20} />
            <h2>记录新问题</h2>
          </div>
          <button type="button" className="modalClose" onClick={onClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form className="modalForm" onSubmit={handleSubmit}>
          <div className="formGroup">
            <label htmlFor="issueTitle">问题标题 *</label>
            <input
              id="issueTitle"
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="例如：客户资料同步延迟"
              autoFocus
            />
          </div>

          <div className="formGroup">
            <label htmlFor="issueDescription">问题说明</label>
            <textarea
              id="issueDescription"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="补充影响范围、现象或待确认信息"
              rows={4}
            />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label htmlFor="issueLevel">风险等级</label>
              <select
                id="issueLevel"
                value={form.level}
                onChange={(event) => updateField('level', event.target.value)}
              >
                <option value="HIGH">高风险</option>
                <option value="MEDIUM">中风险</option>
                <option value="LOW">低风险</option>
              </select>
            </div>

            <div className="formGroup">
              <label htmlFor="issueDomain">所属领域</label>
              <select
                id="issueDomain"
                value={form.domainId}
                onChange={(event) => updateField('domainId', event.target.value)}
              >
                <option value="work">工作</option>
                <option value="health">健康</option>
                <option value="wealth">财富</option>
                <option value="content">生活</option>
                <option value="learning">学习</option>
                <option value="agi">AGI</option>
                <option value="media">市场</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>

          {error && <div className="modalError">{error}</div>}

          <div className="modalActions">
            <button type="button" className="secondaryButton" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" className="primaryButton" disabled={submitting}>
              {submitting ? '记录中...' : '记录问题'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
