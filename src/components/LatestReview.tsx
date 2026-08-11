// src/components/LatestReview.tsx
import { ArrowRight, BookMarked, ClipboardList } from 'lucide-react';

interface LatestReviewData {
  id: string;
  title: string;
  reviewType: string;
  status: string;
  reviewedAt: string;
}

interface LatestReviewProps {
  review: LatestReviewData | null;
  insightsCount?: number;
  onCreateReview?: () => void;
  onOpenReview?: (id: string) => void;
  onOpenReviews?: () => void;
}

const REVIEW_TYPE_LABELS: Record<string, string> = {
  DAILY: '日复盘',
  WEEKLY: '周复盘',
  MONTHLY: '月复盘',
  QUARTERLY: '季度复盘',
  PROJECT: '项目复盘',
  CUSTOM: '自定义复盘',
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  COMPLETED: '已完成',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '待生成';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function LatestReview({
  review,
  onCreateReview,
  onOpenReview,
  onOpenReviews,
}: LatestReviewProps) {
  const typeLabel = review ? REVIEW_TYPE_LABELS[review.reviewType] || review.reviewType || '复盘' : '未开始';
  const statusLabel = review ? REVIEW_STATUS_LABELS[review.status] || review.status || '草稿' : '待生成';

  return (
    <section className="panel latestReviewPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">REVIEW</span>
          <h2>最新复盘</h2>
          <span className="strictTag">R · REVIEW</span>
        </div>
        <BookMarked size={20} />
      </div>

      {!review ? (
        <div className="reviewContent reviewEmptyContent">
          <div className="reviewEmptyCard compactReviewCard">
            <ClipboardList size={24} />
            <h3>暂无复盘记录</h3>
            <p>进入复盘中心生成草稿。</p>
          </div>

          <div className="reviewActionRow">
            <button className="reviewAction primaryReviewAction" onClick={onCreateReview}>
              <span>生成复盘</span>
              <ArrowRight size={16} />
            </button>
            <button className="reviewAction secondaryReviewAction" onClick={onOpenReviews}>
              <span>复盘中心</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="reviewContent">
          <div className="reviewCard compactReviewCard">
            <h3 className="reviewTitle">{review.title || '未命名复盘'}</h3>
            <div className="reviewMeta">
              <span className="reviewTypeText">{typeLabel}</span>
              <span className="reviewStatus">{statusLabel}</span>
              <span className="reviewDate">{formatDate(review.reviewedAt)}</span>
            </div>
          </div>

          <div className="reviewActionRow">
            <button className="reviewAction primaryReviewAction" onClick={() => onOpenReview?.(review.id)}>
              <span>打开详情</span>
              <ArrowRight size={16} />
            </button>
            <button className="reviewAction secondaryReviewAction" onClick={onOpenReviews}>
              <span>复盘中心</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
