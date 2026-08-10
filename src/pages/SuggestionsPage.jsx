// src/pages/SuggestionsPage.jsx
// 行动建议中心页面 —— /suggestions

import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import {
  getSuggestions,
  acceptAndCreateTask,
  dismissSuggestion,
  deferSuggestion,
} from '../services/suggestionService';
import { SuggestionItem } from '../components/SuggestionItem';
import { SuggestionFilters } from '../components/SuggestionFilters';
import { SuggestionSkeleton } from '../components/SuggestionSkeleton';

// 通知 Dashboard 刷新
function notifyDashboardRefresh() {
  window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
}

export function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState(null);
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

  // 接受并创建任务
  const handleAccept = async (id) => {
    setPendingId(id);
    try {
      await acceptAndCreateTask(id);
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
              pendingId={pendingId}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className={`suggestionToast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
