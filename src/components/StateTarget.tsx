// src/components/StateTarget.tsx
// STATE / TARGET —— 目标达成面板
// 包含 Life Score 环形进度 + 分项指标

import { Target } from 'lucide-react';
import { getScoreColor } from '../types/dashboard';
import type { DashboardSnapshot } from '../types/dashboard';

interface StateTargetProps {
  lifeScore: DashboardSnapshot['stateTarget']['lifeScore'];
  breakdown: DashboardSnapshot['stateTarget']['breakdown'];
}

export function StateTarget({ lifeScore, breakdown }: StateTargetProps) {
  const ringColor = getScoreColor(lifeScore);

  return (
    <section className="scorePanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">STATE / TARGET</span>
          <h2>目标达成</h2>
        </div>
        <Target size={20} />
      </div>
      <div className="scoreGrid">
        {/* Life Score 环形进度 */}
        <div className="scoreDial">
          <svg viewBox="0 0 120 120" role="img" aria-label={`Life Score ${lifeScore}`}>
            <circle cx="60" cy="60" r="50" className="dialTrack" />
            <circle
              cx="60"
              cy="60"
              r="50"
              className="dialValue"
              pathLength="100"
              strokeDasharray={`${lifeScore} 100`}
              style={{ stroke: ringColor }}
            />
          </svg>
          <div className="scoreValue">
            <strong style={{ color: ringColor }}>{lifeScore}</strong>
            <span>目标达成</span>
          </div>
        </div>

        {/* 分项指标 */}
        <div className="breakdown">
          {breakdown.map((item) => (
            <div key={item.label} className="breakdownItem">
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="progress" aria-label={`进度 ${item.value}%`}>
                <span style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
