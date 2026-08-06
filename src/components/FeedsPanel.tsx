// src/components/FeedsPanel.tsx
// 信息资讯 (Feeds) —— NEWS / IDEAS / PLANS 三模块同屏展示

import { BookOpen } from 'lucide-react';
import type { DashboardSnapshot } from '../types/dashboard';

interface FeedsPanelProps {
  feeds: DashboardSnapshot['feeds'];
}

export function FeedsPanel({ feeds }: FeedsPanelProps) {
  return (
    <section className="panel feedsPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">FEEDS</span>
          <h2>信息资讯</h2>
        </div>
        <BookOpen size={20} />
      </div>
      <div className="feedsAllContent">
        {/* NEWS — 新闻 (绿点) */}
        <div className="feedsSection">
          <div className="feedsSectionHeader">
            <span className="feedsSectionTitle">NEWS</span>
            <span className="feedsSectionDot news" />
          </div>
          <div className="feedsList">
            {feeds.news.map((item) => (
              <a
                key={item.id}
                href="#"
                className="feedItem news"
                onClick={(e) => e.preventDefault()}
              >
                <div className="feedMeta">
                  <span className="feedSource">{item.source}</span>
                  <span className="feedTime">{item.time}</span>
                </div>
                <h3>{item.title}</h3>
              </a>
            ))}
          </div>
        </div>

        {/* IDEAS — 灵感 (金点) */}
        <div className="feedsSection">
          <div className="feedsSectionHeader">
            <span className="feedsSectionTitle">IDEAS</span>
            <span className="feedsSectionDot ideas" />
          </div>
          <div className="ideasList">
            {feeds.ideas.map((item) => (
              <a
                key={item.id}
                href="#"
                className="ideaItem ideas"
                onClick={(e) => e.preventDefault()}
              >
                <h3>{item.title}</h3>
              </a>
            ))}
          </div>
        </div>

        {/* PLANS — 计划 (深绿点) */}
        <div className="feedsSection">
          <div className="feedsSectionHeader">
            <span className="feedsSectionTitle">PLANS</span>
            <span className="feedsSectionDot plans" />
          </div>
          <div className="plansList">
            {feeds.plans.map((item) => (
              <a
                key={item.id}
                href="#"
                className="planItem plans"
                onClick={(e) => e.preventDefault()}
              >
                <div className="planHeader">
                  <h3>{item.title}</h3>
                  <span className="planProgress">{item.progress}%</span>
                </div>
                <div className="progress" aria-label={`进度 ${item.progress}%`}>
                  <span style={{ width: `${item.progress}%` }} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
