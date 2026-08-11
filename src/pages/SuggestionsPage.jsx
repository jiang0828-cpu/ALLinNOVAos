// src/pages/SuggestionsPage.jsx
// 行动建议中心页面 —— /suggestions

import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, RefreshCw, AlertCircle, Sparkles, X, Save, Download } from 'lucide-react';
import {
  getSuggestions,
  acceptAndCreateTask,
  dismissSuggestion,
  deferSuggestion,
  updateSuggestion,
  deleteSuggestion,
} from '../services/suggestionService';
import { createLocalBackup } from '../services/localBackupStore';
import { SuggestionItem } from '../components/SuggestionItem';
import { SuggestionFilters } from '../components/SuggestionFilters';
import { SuggestionSkeleton } from '../components/SuggestionSkeleton';
import { exportCsv } from '../services/exportCsv';

// 通知 Dashboard 刷新
function notifyDashboardRefresh() {
  window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
  window.dispatchEvent(new CustomEvent('nova:refresh-tasks'));
}

export function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [toast, setToast] = useState(null);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);

    try {
      const response = await getSuggestions({
        status: selectedStatus.length > 0 ? selectedStatus : undefined,
      });
      setSuggestions(response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err);
      console.error('[SuggestionsPage] Failed to load suggestions:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    const handleRefresh = () => loadSuggestions();
    window.addEventListener('nova:refresh-suggestions', handleRefresh);
    return () => window.removeEventListener('nova:refresh-suggestions', handleRefresh);
  }, [loadSuggestions]);

  const handleToggleStatus = (value) => {
    if (value === null) {
      setSelectedStatus([]);
      return;
    }
    setSelectedStatus((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2400);
  };

  const handleSaveSuggestion = async (id, payload) => {
    setSavingEdit(true);
    try {
      const updated = await updateSuggestion(id, payload);
      createLocalBackup();
      setSuggestions((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...updated,
                suggestionDetail: {
                  ...(item.suggestionDetail || {}),
                  ...(updated.suggestionDetail || {}),
                },
              }
            : item
        )
      );
      setEditingSuggestion(null);
      showToast('success', '建议已保存');
      notifyDashboardRefresh();
      window.dispatchEvent(new CustomEvent('nova:refresh-suggestions'));
    } catch (err) {
      console.error('[SuggestionsPage] updateSuggestion failed:', err);
      showToast('error', `保存失败：${err.message || '未知错误'}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // 接受并创建任务
  const handleAccept = async (id) => {
    setPendingId(id);
    try {
      await acceptAndCreateTask(id);
      createLocalBackup();
      showToast('success', '已接受建议并创建任务');
      // 局部更新状态
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                suggestionDetail: {
                  ...(s.suggestionDetail || {}),
                  status: 'ACCEPTED',
                  isConverted: true,
                },
              }
            : s
        )
      );
      notifyDashboardRefresh();
    } catch (err) {
      console.error('[SuggestionsPage] acceptAndCreateTask failed:', err);
      showToast('error', `接受失败：${err.message || '未知错误'}`);
    } finally {
      setPendingId(null);
    }
  };

  // 忽略
  const handleDismiss = async (id) => {
    setPendingId(id);
    try {
      await dismissSuggestion(id);
      createLocalBackup();
      showToast('success', '建议已忽略');
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                suggestionDetail: {
                  ...(s.suggestionDetail || {}),
                  status: 'DISMISSED',
                },
              }
            : s
        )
      );
      notifyDashboardRefresh();
    } catch (err) {
      console.error('[SuggestionsPage] dismiss failed:', err);
      showToast('error', `忽略失败：${err.message || '未知错误'}`);
    } finally {
      setPendingId(null);
    }
  };

  // 稍后处理
  const handleDefer = async (id) => {
    setPendingId(id);
    try {
      await deferSuggestion(id);
      createLocalBackup();
      showToast('success', '建议已延后处理');
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                suggestionDetail: {
                  ...(s.suggestionDetail || {}),
                  status: 'DEFERRED',
                },
              }
            : s
        )
      );
      notifyDashboardRefresh();
    } catch (err) {
      console.error('[SuggestionsPage] defer failed:', err);
      showToast('error', `延后失败：${err.message || '未知错误'}`);
    } finally {
      setPendingId(null);
    }
  };

  const handleDeleteSuggestion = async (id) => {
    if (!window.confirm('确定删除这条建议吗？')) return;
    setPendingId(id);
    try {
      await deleteSuggestion(id);
      createLocalBackup();
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast('success', '建议已删除');
      notifyDashboardRefresh();
      window.dispatchEvent(new CustomEvent('nova:refresh-suggestions'));
    } catch (err) {
      console.error('[SuggestionsPage] deleteSuggestion failed:', err);
      showToast('error', `删除失败：${err.message || '未知错误'}`);
    } finally {
      setPendingId(null);
    }
  };

  const handleExportSuggestions = () => {
    exportCsv(
      'nova-os-suggestions.csv',
      [
        { label: '标题', value: (item) => item.title },
        { label: '状态', value: (item) => item.suggestionDetail?.status || item.status },
        { label: '优先级', value: (item) => item.suggestionDetail?.priority || item.priority },
        { label: '生成原因', value: (item) => item.suggestionDetail?.reason || item.description },
        { label: '支撑证据', value: (item) => item.suggestionDetail?.evidence || '' },
        { label: '关联问题', value: (item) => item.suggestionDetail?.sourceIssueId || '' },
      ],
      suggestions
    );
  };

  return (
    <div className="suggestionsPage">
      <header className="suggestionsPageHeader">
        <div className="suggestionsPageTitle">
          <h1>行动建议中心</h1>
          <span className="suggestionsPageMeta">
            <Lightbulb size={14} />
            共 {total} 条建议
          </span>
        </div>
        <div className="suggestionsPageActions">
          <button
            type="button"
            className="refreshBtn"
            onClick={handleExportSuggestions}
            disabled={loading}
          >
            <Download size={16} />
            导出
          </button>
          <button
            type="button"
            className="refreshBtn"
            onClick={loadSuggestions}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
            刷新
          </button>
        </div>
      </header>

      <SuggestionFilters selected={selectedStatus} onToggle={handleToggleStatus} />

      {loading ? (
        <SuggestionSkeleton count={4} />
      ) : error ? (
        <div className="errorState">
          <AlertCircle size={48} />
          <h3>建议加载失败</h3>
          <p className="errorMessage">{error.message || '无法获取建议数据'}</p>
          <button className="retryButton" onClick={loadSuggestions}>
            <RefreshCw size={16} />
            <span>重试</span>
          </button>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="emptyState fullEmpty">
          <Sparkles size={48} />
          <h3>暂无行动建议</h3>
          <p>系统运行平稳，继续保持当前节奏</p>
        </div>
      ) : (
        <div className="suggestionsList">
          {suggestions.map((s) => (
            <SuggestionItem
              key={s.id}
              suggestion={s}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
              onDefer={handleDefer}
              onEdit={setEditingSuggestion}
              onDelete={handleDeleteSuggestion}
              pendingId={pendingId}
            />
          ))}
        </div>
      )}

      {editingSuggestion && (
        <SuggestionEditModal
          suggestion={editingSuggestion}
          saving={savingEdit}
          onClose={() => !savingEdit && setEditingSuggestion(null)}
          onSave={handleSaveSuggestion}
        />
      )}

      {toast && (
        <div className={`suggestionToast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function suggestionEvidenceToText(evidence) {
  if (!evidence || typeof evidence !== 'object') return '';
  return JSON.stringify(evidence, null, 2);
}

function parseEvidence(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

function SuggestionEditModal({ suggestion, saving, onClose, onSave }) {
  const detail = suggestion.suggestionDetail || {};
  const [form, setForm] = useState({
    title: suggestion.title || '',
    reason: detail.reason || suggestion.description || '',
    priority: suggestion.priority || detail.priority || 'P2',
    status: detail.status || 'PENDING',
    evidenceText: suggestionEvidenceToText(detail.evidence),
  });
  const [error, setError] = useState(null);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const reason = form.reason.trim();
    if (!title) {
      setError('请填写建议标题');
      return;
    }
    if (!reason) {
      setError('请填写建议原因');
      return;
    }

    let evidence = null;
    try {
      evidence = parseEvidence(form.evidenceText);
    } catch {
      setError('支撑证据需要是有效 JSON，例如 {"level":"LOW"}');
      return;
    }

    onSave(suggestion.id, {
      title,
      description: reason,
      priority: form.priority,
      status: form.status,
      suggestionDetail: {
        reason,
        priority: form.priority,
        status: form.status,
        evidence,
      },
    });
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent suggestionEditModal" onClick={(event) => event.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">
            <Lightbulb size={20} />
            <h2>查看/编辑建议</h2>
          </div>
          <button type="button" className="modalClose" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <form className="modalForm" onSubmit={handleSubmit}>
          <div className="formGroup">
            <label htmlFor="suggestionTitle">建议标题 *</label>
            <input
              id="suggestionTitle"
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </div>

          <div className="formGroup">
            <label htmlFor="suggestionReason">建议原因 *</label>
            <textarea
              id="suggestionReason"
              rows={4}
              value={form.reason}
              onChange={(event) => updateField('reason', event.target.value)}
            />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label htmlFor="suggestionPriority">优先级</label>
              <select
                id="suggestionPriority"
                value={form.priority}
                onChange={(event) => updateField('priority', event.target.value)}
              >
                <option value="P0">P0 · 紧急</option>
                <option value="P1">P1 · 重要</option>
                <option value="P2">P2 · 一般</option>
              </select>
            </div>

            <div className="formGroup">
              <label htmlFor="suggestionStatus">状态</label>
              <select
                id="suggestionStatus"
                value={form.status}
                onChange={(event) => updateField('status', event.target.value)}
              >
                <option value="PENDING">待处理</option>
                <option value="ACCEPTED">已接受</option>
                <option value="DEFERRED">已延后</option>
                <option value="DISMISSED">已忽略</option>
                <option value="EXPIRED">已过期</option>
              </select>
            </div>
          </div>

          <div className="formGroup">
            <label htmlFor="suggestionEvidence">支撑证据 JSON</label>
            <textarea
              id="suggestionEvidence"
              rows={5}
              value={form.evidenceText}
              onChange={(event) => updateField('evidenceText', event.target.value)}
              placeholder='例如：{"level":"LOW","status":"OPEN"}'
            />
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
