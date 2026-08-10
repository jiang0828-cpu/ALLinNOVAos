// src/components/LatestReview.tsx
// 最新复盘入口面板

import { BookMarked, ArrowRight } from 'lucide-react';

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
}

const REVIEW_TYPE_LABELS: Record<string, string> = {
  WEEKLY: '周复盘',
  DAILY: '日复盘',
  MONTHLY: '月复盘',
  QUARTERLY: '季度复盘',
  PROJECT: '项目复盘',
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function LatestReview({ review, insightsCount = 0 }: LatestReviewProps) {
  return (
    <section className="panel latestReviewPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">REVIEW</span>
          <h2>最新复盘</h2>
        </div>
        <BookMarked size={20} />
      </div>

      {!review ? (
        <div className="emptyState">
          <p>暂无复盘记录，点击创建首次复盘</p>
          <button className="primaryButton" style={{ marginTop: 'auto' }}>
            创建复盘
          </button>
        </div>
      ) : (
        <div className="reviewContent">
          <div className="reviewCard">
            <div className="reviewBadge">
              {REVIEW_TYPE_LABELS[review.reviewType] || review.reviewType}
            </div>
            <h3 className="reviewTitle">{review.title}</h3>
            <div className="reviewMeta">
              <span className="reviewStatus">{review.status}</span>
              <span className="reviewDate">{formatDate(review.reviewedAt)}</span>
            </div>
          </div>

          {insightsCount > 0 && (
            <div className="insightsSummary">
              <span className="insightsCount">{insightsCount}</span>
              <span className="insightsLabel">条活跃洞察</span>
            </div>
          )}

          <button className="reviewAction">
            <span>查看复盘详情</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
