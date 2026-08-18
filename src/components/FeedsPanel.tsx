import { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { DashboardSnapshot } from '../types/dashboard';
import { getLatestM2News, type M2NewsItem } from '../services/m2NewsService';

const M2NEWS_LATEST_URL = 'https://lifeos-personal-manager.github.io/M2news/latest.html';
const M2NEWS_REFRESH_MS = 5 * 60 * 1000;

interface FeedsPanelProps {
  feeds: DashboardSnapshot['feeds'];
}

type NewsItem = {
  id: string;
  source: string;
  time: string;
  title: string;
  url?: string;
};

export function FeedsPanel({ feeds }: FeedsPanelProps) {
  const [latestNews, setLatestNews] = useState<M2NewsItem[]>([]);

  useEffect(() => {
    let ignore = false;

    const loadLatestNews = () => {
      getLatestM2News()
        .then((items) => {
          if (!ignore) {
            setLatestNews(items);
          }
        })
        .catch((error) => {
          console.warn('[FeedsPanel] Failed to load M2news:', error);
        });
    };

    loadLatestNews();
    const timer = window.setInterval(loadLatestNews, M2NEWS_REFRESH_MS);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  const fallbackNewsItems = useMemo<NewsItem[]>(
    () =>
      [
        ...feeds.news.map((item) => ({
          id: item.id,
          source: item.source || 'NEWS',
          time: item.time || '最新',
          title: item.title,
          url: item.url,
        })),
        ...feeds.ideas.map((item) => ({
          id: `idea-${item.id}`,
          source: '要闻',
          time: '观点',
          title: item.title,
          url: undefined,
        })),
        ...feeds.plans.map((item) => ({
          id: `plan-${item.id}`,
          source: '要闻',
          time: `${item.progress}%`,
          title: item.title,
          url: undefined,
        })),
      ].filter((item) => item.title),
    [feeds]
  );
  const newsItems = latestNews.length > 0 ? latestNews : fallbackNewsItems;

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
                  <span className="feedSource">M2NEWS</span>
                  <span className="feedTime">待同步</span>
                </div>
                <h3>正在等待 M2news 今日 5 件大事更新</h3>
              </div>
            ) : (
              newsItems.slice(0, 5).map((item) => (
                <a
                  key={item.id}
                  href={item.url || '#'}
                  className="feedItem news"
                  target={item.url ? '_blank' : undefined}
                  rel={item.url ? 'noreferrer' : undefined}
                  onClick={item.url ? undefined : (event) => event.preventDefault()}
                >
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
        <a
          href={M2NEWS_LATEST_URL}
          className="feedsExternalLink"
          target="_blank"
          rel="noreferrer"
        >
          打开 M2news 最新要闻
        </a>
      </div>
    </section>
  );
}
