// src/components/OpenIssues.tsx
// 当前问题或风险面板

import { AlertTriangle } from 'lucide-react';
import type { IssueLevel } from '../types/dashboard';

interface OpenIssueItem {
  id: string;
  title: string;
  level: IssueLevel;
  status: string;
}

interface OpenIssuesProps {
  issues: OpenIssueItem[];
}

const LEVEL_LABELS: Record<IssueLevel, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
};

const LEVEL_CLASS: Record<IssueLevel, string> = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export function OpenIssues({ issues }: OpenIssuesProps) {
  return (
    <section className="panel openIssuesPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">ISSUES</span>
          <h2>当前问题 · 风险</h2>
        </div>
        <AlertTriangle size={20} />
      </div>

      {issues.length === 0 ? (
        <div className="emptyState">
          <p>暂无活跃问题，系统运转正常</p>
        </div>
      ) : (
        <div className="issuesList">
          {issues.map((issue) => (
            <article
              key={issue.id}
              className={`issueItem ${LEVEL_CLASS[issue.level]}`}
            >
              <div className="issueHeader">
                <span className={`issueLevel level-${LEVEL_CLASS[issue.level]}`}>
                  {LEVEL_LABELS[issue.level]}
                </span>
                <span className="issueStatus">{issue.status}</span>
              </div>
              <h3>{issue.title}</h3>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
