// src/pages/ReviewsPage.jsx
// 复盘列表页面 —— /reviews

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  AlertCircle,
  ClipboardList,
  Sparkles,
  X,
  Calendar,
} from 'lucide-react';
import { getReviews, generateReviewDraft } from '../services/reviewService';
import { ReviewItem } from '../components/ReviewItem';
import { ReviewFilters } from '../components/ReviewFilters';
import { ReviewSkeleton } from '../components/ReviewSkeleton';
import { CYCLE_TYPE_LABELS } from '../types/reviews';

// 已知周期列表（后端未暴露 cycle 列表接口，使用预置选项）
const KNOWN_CYCLES = [
  {
    id: 'cycle_weekly_2026_w33',
    cycleType: 'WEEKLY',
    status: 'ACTIVE',
    name: '2026 W33 周度计划',
    startDate: '2026-08-09T16:00:00.000Z',
    endDate: '2026-08-16T15:59:59.000Z',
  },
  {
    id: 'cycle_monthly_2026_08',
    cycleType: 'MONTHLY',
    status: 'ACTIVE',
    name: '2026-08 月度计划',
    startDate: '2026-07-31T16:00:00.000Z',
    endDate: '2026-08-30T16:00:00.000Z',
  },
  {
    id: 'cycle_quarterly_2026_q3',
    cycleType: 'QUARTERLY',
    status: 'ACTIVE',
    name: '2026 Q3 季度计划',
    startDate: '2026-06-30T16:00:00.000Z',
    endDate: '2026-09-29T16:00:00.000Z',
  },
  {
    id: 'cycle_yearly_2026',
    cycleType: 'YEARLY',
    status: 'ACTIVE',
    name: '2026 年度计划',
    startDate: '2025-12-31T16:00:00.000Z',
    endDate: '2026-12-30T16:00:00.000Z',
  },
];

// 通知 Dashboard 刷新
function notifyDashboardRefresh() {
  window.dispatchEvent(new CustomEvent('nova:refresh-dashboard'));
}

export function ReviewsPage({ onNavigateToReview }) {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 生成草稿弹窗状态
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [toast, setToast] = useState(null);

  // 获取所有复盘（后端 QueryReviewsDto 的 status 参数缺少 @Transform，
  // 传逗号分隔字符串会触发 Prisma 500，改为前端筛选）
  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);

    try {
      const response = await getReviews({});
      const allReviews = (response.data || []).filter((r) => r.reviewDetail?.reviewType !== 'DAILY');
      const filtered =
        selectedStatus.length > 0
          ? allReviews.filter((r) =>
              selectedStatus.includes(r.reviewDetail?.status)
            )
          : allReviews;
      setReviews(filtered);
      setTotal(filtered.length);
    } catch (err) {
      setError(err);
      console.error('[ReviewsPage] Failed to load reviews:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    const handleRefresh = () => loadReviews();
    window.addEventListener('nova:refresh-reviews', handleRefresh);
    return () => window.removeEventListener('nova:refresh-reviews', handleRefresh);
  }, [loadReviews]);

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
    window.setTimeout(() => setToast(null), 2800);
  };

  // 打开生成草稿弹窗
  const handleOpenGenerate = () => {
    setShowGenerateModal(true);
    setGenerateError(null);
    setSelectedCycleId(KNOWN_CYCLES[0]?.id || '');
    setCycles(KNOWN_CYCLES);
  };

  // 生成复盘草稿
  const handleGenerate = async () => {
    if (!selectedCycleId) {
      setGenerateError('请选择一个周期');
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const newReview = await generateReviewDraft(selectedCycleId, 'user');
      showToast('success', '复盘草稿已生成');
      setShowGenerateModal(false);
      // 刷新列表
      await loadReviews();
      // 通知 Dashboard 刷新
      notifyDashboardRefresh();
      // 直接跳转到详情页
      if (newReview?.id) {
        onNavigateToReview?.(newReview.id);
      }
    } catch (err) {
      console.error('[ReviewsPage] generateReviewDraft failed:', err);
      const msg = err.message || '未知错误';
      if (msg.includes('already exists') || msg.includes('Conflict')) {
        setGenerateError('该周期已存在复盘，请直接查看或选择其他周期');
      } else {
        setGenerateError(`生成失败：${msg}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCardClick = (reviewId) => {
    onNavigateToReview?.(reviewId);
  };

  return (
    <div className="reviewsPage">
      <header className="reviewsPageHeader">
        <div className="reviewsPageTitle">
          <h1>复盘中心</h1>
          <span className="reviewsPageMeta">
            <ClipboardList size={14} />
            共 {total} 条复盘
          </span>
        </div>
        <div className="reviewsPageActions">
          <button
            type="button"
            className="primaryButton generateBtn"
            onClick={handleOpenGenerate}
          >
            <Sparkles size={16} />
            生成复盘草稿
          </button>
          <button
            type="button"
            className="refreshBtn"
            onClick={loadReviews}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
            刷新
          </button>
        </div>
      </header>

      <ReviewFilters selected={selectedStatus} onToggle={handleToggleStatus} />

      {loading ? (
        <ReviewSkeleton count={4} />
      ) : error ? (
        <div className="errorState">
          <AlertCircle size={48} />
          <h3>复盘加载失败</h3>
          <p className="errorMessage">{error.message || '无法获取复盘数据'}</p>
          <button className="retryButton" onClick={loadReviews}>
            <RefreshCw size={16} />
            <span>重试</span>
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="emptyState fullEmpty">
          <ClipboardList size={48} />
          <h3>本周期复盘尚未生成</h3>
          <p>点击「生成复盘草稿」开始你的第一次复盘</p>
          <button className="primaryButton" onClick={handleOpenGenerate}>
            <Sparkles size={16} />
            生成复盘草稿
          </button>
        </div>
      ) : (
        <div className="reviewsGrid">
          {reviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {/* 生成草稿弹窗 */}
      {showGenerateModal && (
        <div className="modalOverlay" onClick={() => !generating && setShowGenerateModal(false)}>
          <div className="modalContent generateModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>生成复盘草稿</h2>
              {!generating && (
                <button className="modalCloseBtn" onClick={() => setShowGenerateModal(false)}>
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="modalBody">
              <p className="modalDesc">
                选择一个周期，系统将自动聚合该周期的任务完成情况、项目进度、指标变化等信息，生成复盘草稿。
              </p>
              <div className="cycleSelectGroup">
                <label className="formLabel">选择周期</label>
                <div className="cycleOptions">
                  {cycles.map((cycle) => (
                    <label
                      key={cycle.id}
                      className={`cycleOption ${selectedCycleId === cycle.id ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="cycle"
                        value={cycle.id}
                        checked={selectedCycleId === cycle.id}
                        onChange={(e) => setSelectedCycleId(e.target.value)}
                      />
                      <div className="cycleOptionInfo">
                        <Calendar size={14} className="cycleOptionIcon" />
                        <div className="cycleOptionText">
                          <span className="cycleOptionName">
                            {cycle.name || cycle.id}
                          </span>
                          <span className="cycleOptionMeta">
                            {CYCLE_TYPE_LABELS[cycle.cycleType] || cycle.cycleType} ·{' '}
                            {cycle.status}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {generateError && (
                <div className="modalError">{generateError}</div>
              )}
            </div>
            <div className="modalFooter">
              <button
                className="secondaryButton"
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
              >
                取消
              </button>
              <button
                className="primaryButton"
                onClick={handleGenerate}
                disabled={generating || !selectedCycleId}
              >
                {generating ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    生成中…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    生成草稿
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`suggestionToast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
