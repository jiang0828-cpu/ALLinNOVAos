import { useState } from 'react';
import { LayoutDashboard, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';

export function LoginPage({ onEnter }) {
  const [name, setName] = useState('');
  const [entering, setEntering] = useState(false);

  const handleEnter = () => {
    setEntering(true);
    setTimeout(() => onEnter?.(), 400);
  };

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginBrand">
          <div className="brandMark">
            <LayoutDashboard size={28} />
          </div>
          <div>
            <h1>NOVA OS</h1>
            <p>
              个人指挥系统<br />
              让目标管理变得清晰、高效
            </p>
          </div>
        </div>

        <div className="loginForm">
          <div className="formGroup">
            <label htmlFor="userName">你的名字</label>
            <input
              id="userName"
              type="text"
              placeholder="输入你的名字"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
              autoFocus
            />
          </div>

          <button
            className="loginEntryBtn"
            onClick={handleEnter}
            disabled={entering}
          >
            {entering ? '进入中...' : '进入指挥台'}
            <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </button>
        </div>

        <div className="loginDivider">核心功能</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <FeatureBadge icon={<Zap size={14} />} label="任务管理" />
          <FeatureBadge icon={<Sparkles size={14} />} label="AI 建议" />
          <FeatureBadge icon={<Shield size={14} />} label="复盘回顾" />
          <FeatureBadge icon={<LayoutDashboard size={14} />} label="指挥台" />
        </div>

        <div className="loginFooter">
          v1.0 · 基于 PDCAr 方法论
        </div>
      </div>
    </div>
  );
}

function FeatureBadge({ icon, label }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '10px',
        background: 'var(--chip-bg)',
        color: 'var(--text-soft)',
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      {icon}
      {label}
    </div>
  );
}