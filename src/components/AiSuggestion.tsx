// src/components/AiSuggestion.tsx
import { ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react';
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
  onConvert: (id: string) => void | Promise<void>;
  onOpenSuggestions?: () => void;
}

export function AiSuggestion({ suggestions, onConvert, onOpenSuggestions }: AiSuggestionProps) {
  return (
    <section className="panel aiSuggestionPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">SUGGESTION</span>
          <h2>行动建议</h2>
          <span className="strictTag">A · ACTION</span>
        </div>
        <button
          type="button"
          className="panelIconButton"
          onClick={onOpenSuggestions}
          title="进入行动建议中心"
          aria-label="进入行动建议中心"
        >
          <Lightbulb size={20} />
        </button>
      </div>

      <div className="aiActionsList compactSuggestionList">
        {suggestions.length === 0 ? (
          <div className="aiSuggestionEmpty compactEmpty">
            <Lightbulb size={22} />
            <h3>暂无待确认建议</h3>
            <p>新的问题、任务或复盘线索会在这里汇总。</p>
          </div>
        ) : (
          suggestions.map((item) => (
            <div key={item.id} className={`aiAction ${item.isConverted ? 'done' : ''}`}>
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
                  {item.isConverted ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
