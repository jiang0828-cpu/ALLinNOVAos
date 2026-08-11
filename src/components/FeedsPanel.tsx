import { BookOpen } from 'lucide-react';
import type { DashboardSnapshot } from '../types/dashboard';

interface FeedsPanelProps {
  feeds: DashboardSnapshot['feeds'];
}

export function FeedsPanel({ feeds }: FeedsPanelProps) {
  const newsItems = [
    ...feeds.news.map((item) => ({
      id: item.id,
      source: item.source || 'NEWS',
      time: item.time || '最新',
      title: item.title,
    })),
    ...feeds.ideas.map((item) => ({
      id: `idea-${item.id}`,
      source: '要闻',
      time: '观点',
      title: item.title,
    })),
    ...feeds.plans.map((item) => ({
      id: `plan-${item.id}`,
      source: '要闻',
      time: `${item.progress}%`,
      title: item.title,
    })),
  ].filter((item) => item.title);

  return (
    <section className="panel feedsPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">FEEDS</span>
          <h2>信息资讯</h2>
          <span className="strictTag">NEWS</span>
        </div>
        <BookOpen size={20} />
      </div>

      <div className="feedsAllContent">
        <div className="feedsSection">
          <div className="feedsList compactNewsList">
            {newsItems.length === 0 ? (
              <div className="feedItem news feedPlaceholder">
                <div className="feedMeta">
                  <span className="feedSource">API RESERVED</span>
                  <span className="feedTime">待接入</span>
                </div>
                <h3>最新要闻 API 预留，接入后自动展示资讯摘要</h3>
              </div>
            ) : (
              newsItems.slice(0, 5).map((item) => (
                <a key={item.id} href="#" className="feedItem news" onClick={(event) => event.preventDefault()}>
                  <div className="feedMeta">
                    <span className="feedSource">{item.source}</span>
                    <span className="feedTime">{item.time}</span>
                  </div>
                  <h3>{item.title}</h3>
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
