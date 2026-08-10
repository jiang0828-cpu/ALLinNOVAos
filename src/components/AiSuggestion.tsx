// src/components/AiSuggestion.tsx
// AI 建议 (AI Suggestion) —— Suggestion 列表，支持「转为行动」

import { Lightbulb, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PRIORITY_COLORS, getPriorityTextColor } from '../types/dashboard';
import type { Priority } from '../types/dashboard';

interface AiSuggestionItem {
  id: string;
  title: string;
  source: string;
  reason: string;
  priority: Priority;
  time: string;
  isConverted: boolean;
}

interface AiSuggestionProps {
  suggestions: AiSuggestionItem[];
  onConvert: (id: string) => void;
}

export function AiSuggestion({ suggestions, onConvert }: AiSuggestionProps) {
  return (
    <section className="panel aiSuggestionPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">AI SUGGESTION</span>
          <h2>行动建议</h2>
        </div>
        <Lightbulb size={20} />
      </div>

      <div className="aiActionsList">
        {suggestions.map((item) => (
          <div
            key={item.id}
            className={`aiAction ${item.isConverted ? 'done' : ''}`}
          >
            <div className="aiActionHeader">
              <span
                className="priority"
                style={{
                  background: PRIORITY_COLORS[item.priority],
                  color: getPriorityTextColor(item.priority),
                }}
              >
                {item.priority}
              </span>
              <div className="aiActionInfo">
                <h4>{item.title}</h4>
                <span className="aiActionMeta">{item.reason}</span>
              </div>
              <button
                className="convertButton"
                onClick={() => onConvert(item.id)}
                disabled={item.isConverted}
                aria-label={item.isConverted ? '已转为行动' : '转为行动'}
              >
                {item.isConverted ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <ArrowRight size={14} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="aiSuggestionFooter">
        <span className="aiDisclaimer">
          ⚠️ AI 生成的建议需用户确认后转为真实任务
        </span>
      </div>
    </section>
  );
}
