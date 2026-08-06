import { useEffect, useState } from 'react';
import { CalendarDays, Command, LayoutDashboard, Moon, Search, Sparkles, Sun, X } from 'lucide-react';
import dashboard from './data/dashboard.json';
import { CommandHub } from './components/CommandHub';

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function matches(query, ...fields) {
  if (!query) return true;
  return fields.join(' ').toLowerCase().includes(query);
}

function Header({ query, onQueryChange, theme, onToggleTheme }) {
  function scrollToCommandCenter() {
    document
      .getElementById('commandCenter')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brandMark">
          <LayoutDashboard size={20} />
        </div>
        <div>
          <p>NOVA OS</p>
          <span>Personal Command Dashboard</span>
        </div>
      </div>

      <div className="globalSearch">
        <Search size={16} />
        <input
          aria-label="全局搜索"
          placeholder="搜索系统、任务、数据卡片"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="clearSearch"
            aria-label="清除搜索"
            onClick={() => onQueryChange('')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="topActions">
        <div className="datePill">
          <CalendarDays size={16} />
          {formatDate(dashboard.updatedAt)}
        </div>
        <button
          className="iconButton"
          aria-label="跳转到 AI 指令区"
          title="AI 指令入口"
          onClick={scrollToCommandCenter}
        >
          <Command size={18} />
        </button>
        <button
          className="iconButton"
          aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          title="切换主题"
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('nova-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('nova-theme', theme);
  }, [theme]);

  return (
    <main className="appShell">
      <Header
        query={query}
        onQueryChange={setQuery}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />

      <CommandHub />
    </main>
  );
}
