// src/components/StateTarget.tsx
// 目标达成面板。

import { Target } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { getScoreColor } from '../types/dashboard';
import type { DashboardSnapshot } from '../types/dashboard';

interface StateTargetProps {
  lifeScore: DashboardSnapshot['stateTarget']['lifeScore'];
  breakdown: DashboardSnapshot['stateTarget']['breakdown'];
  onOpen?: () => void;
}

export function StateTarget({ lifeScore, breakdown, onOpen }: StateTargetProps) {
  const ringColor = getScoreColor(lifeScore);
  const isClickable = Boolean(onOpen);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onOpen) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <section
      className={`scorePanel ${isClickable ? 'isClickable' : ''}`}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label="进入目标管理"
    >
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">STATE / TARGET</span>
          <h2>目标达成</h2>
          <span className="strictTag">P · GOAL</span>
        </div>
        <button
          type="button"
          className="panelIconButton"
          onClick={(event) => {
            event.stopPropagation();
            onOpen?.();
          }}
          title="进入目标管理"
          aria-label="进入目标管理"
        >
          <Target size={20} />
        </button>
      </div>
      <div className="scoreGrid">
        <div className="scoreDial">
          <svg viewBox="0 0 120 120" role="img" aria-label={`目标达成 ${lifeScore}`}>
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
