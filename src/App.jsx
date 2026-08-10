import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays,
  Command,
  LayoutDashboard,
  Moon,
  Search,
  Sun,
  X,
  CheckSquare,
  Target,
  FolderKanban,
  AlertTriangle,
  Lightbulb,
  ClipboardList,
  Plus,
  Sparkles,
  Home,
  PanelLeft,
  HeartPulse,
  BriefcaseBusiness,
  Radio,
  BookOpen,
  Activity,
  DollarSign,
  FileText,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { ToastProvider, useToast, REALTIME_EVENT_TOAST } from './hooks/useToast.tsx';
import { useRealtime, useRealtimeOn } from './hooks/useRealtime.ts';
import { CommandHub } from './components/CommandHub';
import { TasksPage } from './pages/TasksPage';
import { GoalsPage } from './pages/GoalsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { IssuesPage } from './pages/IssuesPage';
import { SuggestionsPage } from './pages/SuggestionsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { ReviewDetailPage } from './pages/ReviewDetailPage';
import { LoginPage } from './pages/LoginPage';

const ROUTES = {
  DASHBOARD: '/',
  TASKS: '/tasks',
  GOALS: '/goals',
  PROJECTS: '/projects',
  PROJECT_DETAIL_PREFIX: '/projects/',
  ISSUES: '/issues',
  SUGGESTIONS: '/suggestions',
  REVIEWS: '/reviews',
  REVIEW_DETAIL_PREFIX: '/reviews/',
};

const REFRESH_EVENTS = {
  'dashboard.updated': 'nova:refresh-dashboard',
  'task.completed': 'nova:refresh-tasks',
  'suggestion.generated': 'nova:refresh-suggestions',
  'review.generated': 'nova:refresh-reviews',
};

const NAV_ITEMS = [
  { route: ROUTES.DASHBOARD, icon: LayoutDashboard, label: '指挥台', section: '概览' },
  { route: ROUTES.GOALS, icon: Target, label: '目标', section: '工作台' },
  { route: ROUTES.PROJECTS, icon: FolderKanban, label: '项目', section: '工作台' },
  { route: ROUTES.TASKS, icon: CheckSquare, label: '任务', section: '工作台' },
  { route: ROUTES.ISSUES, icon: AlertTriangle, label: '问题', section: '工作台' },
  { route: ROUTES.SUGGESTIONS, icon: Lightbulb, label: '建议', section: '工作台' },
  { route: ROUTES.REVIEWS, icon: ClipboardList, label: '复盘', section: '工作台' },
];

const QUICK_ACTIONS = [
  { id: 'goal', label: '创建目标', icon: Target, hint: 'G' },
  { id: 'project', label: '创建项目', icon: FolderKanban, hint: 'P' },
  { id: 'task', label: '创建任务', icon: CheckSquare, hint: 'T' },
  { id: 'issue', label: '记录问题', icon: AlertTriangle, hint: 'I' },
];

const SYSTEM_ENTRIES = [
  {
    name: 'Life OS',
    summary: '健康、财富、家庭与个人事务',
    status: '稳定',
    progress: 78,
    icon: HeartPulse,
    metrics: ['睡眠 示例', '步数 示例', '消费 示例', '待办 示例'],
  },
  {
    name: 'Work OS',
    summary: '项目、客户、任务与商业机会',
    status: '需聚焦',
    progress: 64,
    icon: BriefcaseBusiness,
    metrics: ['重点项目 示例', '今日任务 示例', '客户跟进 示例', '进度 示例'],
    links: [
      { label: '市场工作', href: 'https://m0-marketingcloud.pages.dev/' },
      { label: '广和事业', href: 'https://guanghe-zhongan-healthcare.pages.dev/meeting' },
      { label: '其他业务', href: '#' },
    ],
  },
  {
    name: 'Media OS',
    summary: '选题、生产、发布计划与数据复盘',
    status: '增长',
    progress: 88,
    icon: Radio,
    metrics: ['今日选题 示例', '待发布 示例', '增长 示例', '复盘 示例'],
  },
  {
    name: 'Knowledge OS',
    summary: '学习计划、阅读记录、知识库与笔记',
    status: '积累中',
    progress: 72,
    icon: BookOpen,
    metrics: ['今日学习 示例', '阅读 示例', '新增笔记 示例', '主题 示例'],
  },
  {
    name: 'AGI OS',
    summary: 'AI 实验、工具清单与商业探索',
    status: '实验中',
    progress: 81,
    icon: Sparkles,
    metrics: ['当前实验 示例', '待验证 示例', '工具调用 示例', '下一步 示例'],
  },
];

const DATA_CARDS = [
  {
    title: '健康',
    value: '78',
    unit: '/100',
    detail: '睡眠低于目标，运动计划可执行',
    delta: '-4',
    icon: Activity,
  },
  {
    title: '财富',
    value: '示例',
    unit: '消费',
    detail: '预算与支出状态预留为真实 API 字段',
    delta: '演示',
    icon: DollarSign,
  },
  {
    title: '工作',
    value: '示例',
    unit: '今日任务',
    detail: '任务数量与优先级预留为真实 API 字段',
    delta: '演示',
    icon: CheckSquare,
  },
  {
    title: '内容',
    value: '示例',
    unit: '本周增长',
    detail: '内容复盘与增长指标预留为真实 API 字段',
    delta: '演示',
    icon: FileText,
  },
  {
    title: '学习',
    value: '5',
    unit: '新增笔记',
    detail: '学习主题与笔记数预留为真实 API 字段',
    delta: '演示',
    icon: GraduationCap,
  },
];

const QUICK_COMMANDS = ['帮我规划今天', '总结本周重点', '分析任务优先级', '生成明日行动清单'];

const SAMPLE_ACTIONS = [
  '锁定 90 分钟深度工作块',
  '23:30 前结束屏幕任务',
  '记录一次 Dashboard 使用反馈',
];

function parseRoute(pathname) {
  if (pathname === ROUTES.DASHBOARD) return { route: ROUTES.DASHBOARD };
  if (pathname === ROUTES.TASKS) return { route: ROUTES.TASKS };
  if (pathname === ROUTES.GOALS) return { route: ROUTES.GOALS };
  if (pathname === ROUTES.PROJECTS) return { route: ROUTES.PROJECTS };
  if (pathname === ROUTES.ISSUES) return { route: ROUTES.ISSUES };
  if (pathname === ROUTES.SUGGESTIONS) return { route: ROUTES.SUGGESTIONS };
  if (pathname === ROUTES.REVIEWS) return { route: ROUTES.REVIEWS };
  if (pathname.startsWith(ROUTES.REVIEW_DETAIL_PREFIX)) {
    const reviewId = pathname.slice(ROUTES.REVIEW_DETAIL_PREFIX.length);
    if (reviewId) return { route: ROUTES.REVIEW_DETAIL_PREFIX, reviewId };
  }
  if (pathname.startsWith(ROUTES.PROJECT_DETAIL_PREFIX)) {
    const projectId = pathname.slice(ROUTES.PROJECT_DETAIL_PREFIX.length);
    if (projectId) return { route: ROUTES.PROJECT_DETAIL_PREFIX, projectId };
  }
  return { route: ROUTES.DASHBOARD };
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function isActive(currentPath, route) {
  if (route === ROUTES.DASHBOARD) return currentPath === ROUTES.DASHBOARD;
  if (route === ROUTES.PROJECTS) return currentPath === ROUTES.PROJECTS || currentPath.startsWith(ROUTES.PROJECT_DETAIL_PREFIX);
  if (route === ROUTES.REVIEWS) return currentPath === ROUTES.REVIEWS || currentPath.startsWith(ROUTES.REVIEW_DETAIL_PREFIX);
  return currentPath === route;
}

function RealtimeBridge() {
  const toast = useToast();
  useRealtime(15_000);

  const handleEvent = useCallback(
    (eventKey) => (payload) => {
      const refreshKey = REFRESH_EVENTS[eventKey];
      if (refreshKey) {
        window.dispatchEvent(
          new CustomEvent(refreshKey, { detail: payload?.data || {} }),
        );
        if (eventKey !== 'dashboard.updated') {
          window.dispatchEvent(new CustomEvent('nova:refresh-dashboard', { detail: payload?.data || {} }));
        }
      }

      const mapping = REALTIME_EVENT_TOAST[eventKey] || {};
      const message = payload?.message || mapping?.success || mapping?.info;
      if (message) {
        const isPoll = payload?.data?.source === 'polling';
        if (isPoll && eventKey === 'dashboard.updated') return;
        toast.success(message);
      }
    },
    [toast],
  );

  useRealtimeOn('dashboard.updated', handleEvent('dashboard.updated'));
  useRealtimeOn('task.completed', handleEvent('task.completed'));
  useRealtimeOn('suggestion.generated', handleEvent('suggestion.generated'));
  useRealtimeOn('review.generated', handleEvent('review.generated'));

  return null;
}

function Sidebar({ currentPath, onNavigate, sidebarOpen, onCloseSidebar }) {
  const sections = {};
  NAV_ITEMS.forEach((item) => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  return (
    <>
      {sidebarOpen && (
        <div className="sidebarOverlay visible" onClick={onCloseSidebar} />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebarBrand">
          <div className="brandMark">
            <LayoutDashboard size={18} />
          </div>
          <div className="brandText">
            <p>NOVA OS</p>
            <span>Personal Command</span>
          </div>
        </div>

        <nav className="sidebarNav">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <div className="navSectionLabel">{section}</div>
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(currentPath, item.route);
                return (
                  <button
                    key={item.route}
                    className={`navItem ${active ? 'active' : ''}`}
                    onClick={() => {
                      onNavigate(item.route);
                      onCloseSidebar();
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function CommandPalette({ open, onClose, onAction }) {
  const [query, setQuery] = useState('');
  const inputRef = useCallback((node) => {
    if (node) node.focus();
  }, []);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  if (!open) return null;

  const filteredActions = QUICK_ACTIONS.filter((a) =>
    query ? a.label.toLowerCase().includes(query.toLowerCase()) : true,
  );

  return (
    <>
      <div className="commandPaletteOverlay" onClick={onClose} />
      <div className="commandPalette" role="dialog" aria-modal="true">
        <div className="commandPaletteInput">
          <Search size={18} />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索功能或快捷操作..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filteredActions.length > 0) {
                onAction?.(filteredActions[0].id);
                onClose();
              }
            }}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="commandPaletteList">
          {filteredActions.length > 0 ? (
            <div className="commandPaletteSection">
              <div className="commandPaletteSectionLabel">快捷操作</div>
              {filteredActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    className="commandPaletteItem"
                    onClick={() => {
                      onAction?.(action.id);
                      onClose();
                    }}
                  >
                    <Icon size={18} />
                    <span className="itemLabel">{action.label}</span>
                    <span className="itemHint">Ctrl+{action.hint}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="commandPaletteEmpty">未找到匹配的操作</div>
          )}
        </div>
      </div>
    </>
  );
}

const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter(
  (item) =>
    item.route === ROUTES.DASHBOARD ||
    item.route === ROUTES.GOALS ||
    item.route === ROUTES.TASKS ||
    item.route === ROUTES.REVIEWS,
);

function BottomNav({ currentPath, onNavigate }) {
  return (
    <nav className="bottomNav" aria-label="移动端导航">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(currentPath, item.route);
        return (
          <button
            key={item.route}
            className={`bottomNavItem ${active ? 'active' : ''}`}
            onClick={() => onNavigate(item.route)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function DashboardHome({ onDateUpdate }) {
  const [activeCommand, setActiveCommand] = useState(QUICK_COMMANDS[0]);
  const [commandText, setCommandText] = useState('');
  const [doneActions, setDoneActions] = useState(() => new Set([SAMPLE_ACTIONS[2]]));

  const toggleSampleAction = (action) => {
    setDoneActions((current) => {
      const next = new Set(current);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      return next;
    });
  };

  const openSystem = (entry) => {
    const primaryLink = entry.links?.[0]?.href;
    if (primaryLink && primaryLink !== '#') {
      window.open(primaryLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="dashboardHome">
      <CommandHub onDateUpdate={onDateUpdate} />

      <section className="systemsSection" aria-labelledby="systems-title">
        <div className="sectionTitle">
          <div>
            <span className="sectionEyebrow">SYSTEMS</span>
            <h2 id="systems-title">五大系统入口</h2>
          </div>
          <span>5 个系统在线</span>
        </div>

        <div className="systemsGrid">
          {SYSTEM_ENTRIES.map((entry) => {
            const Icon = entry.icon;
            const clickable = Boolean(entry.links?.length);

            return (
              <article
                key={entry.name}
                className={`systemCard ${clickable ? 'isClickable' : ''}`}
                onClick={() => clickable && openSystem(entry)}
              >
                <div className="systemTop">
                  <div className="systemIcon">
                    <Icon size={20} />
                  </div>
                  <span>{entry.status}</span>
                </div>
                <h3>{entry.name}</h3>
                <p>{entry.summary}</p>
                <div className="progress" aria-label={`${entry.name} 进度 ${entry.progress}%`}>
                  <span style={{ width: `${entry.progress}%` }} />
                </div>
                <div className="metricGrid">
                  {entry.metrics.map((metric) => (
                    <span key={metric}>{metric}</span>
                  ))}
                </div>
                {entry.links ? (
                  <div className="systemLinks" onClick={(event) => event.stopPropagation()}>
                    {entry.links.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target={link.href === '#' ? undefined : '_blank'}
                        rel={link.href === '#' ? undefined : 'noreferrer'}
                        aria-disabled={link.href === '#'}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                ) : null}
                <button className="ghostButton" type="button">
                  进入系统 <ArrowRight size={16} />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dataSection" aria-labelledby="data-title">
        <div className="sectionTitle">
          <div>
            <span className="sectionEyebrow">DATA</span>
            <h2 id="data-title">核心数据卡片</h2>
          </div>
          <span>示例字段已保留，后续可直接接入 API</span>
        </div>

        <div className="dataGrid">
          {DATA_CARDS.map((card) => {
            const Icon = card.icon;

            return (
              <article className="dataCard" key={card.title}>
                <div className="dataIcon">
                  <Icon size={18} />
                </div>
                <div>
                  <p>{card.title}</p>
                  <strong>
                    {card.value}
                    <span>{card.unit}</span>
                  </strong>
                  <small>{card.detail}</small>
                </div>
                <em>{card.delta}</em>
              </article>
            );
          })}
        </div>
      </section>

      <section className="commandCenter" aria-labelledby="command-title">
        <div className="commandHeader">
          <div>
            <span className="sectionEyebrow">AI COMMAND CENTER</span>
            <h2 id="command-title">AI 指令区</h2>
          </div>
          <Command size={20} />
        </div>

        <div className="commandInput">
          <input
            value={commandText}
            onChange={(event) => setCommandText(event.target.value)}
            placeholder="输入一个指令，例如：帮我压缩今天任务"
          />
          <button type="button">运行</button>
        </div>

        <div className="quickCommands">
          {QUICK_COMMANDS.map((command) => (
            <button
              key={command}
              className={activeCommand === command ? 'active' : ''}
              type="button"
              onClick={() => {
                setActiveCommand(command);
                setCommandText(command);
              }}
            >
              {command}
            </button>
          ))}
        </div>

        <div className="aiOutput">
          <span className="outputBadge">
            <Sparkles size={16} />
            NOVA 模拟输出
          </span>
          <p>
            演示建议：把 3 件待办先完成关键交付，再处理即时管理，最后安排一个低门槛复盘行动。
          </p>
          <div className="taskChips">
            {SAMPLE_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                className={doneActions.has(action) ? 'done' : ''}
                onClick={() => toggleSampleAction(action)}
              >
                <CheckCircle2 size={15} />
                {action}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="roadmap" aria-labelledby="roadmap-title">
        <div>
          <span className="sectionEyebrow">DATA EVOLUTION</span>
          <h2 id="roadmap-title">API 接入预留</h2>
        </div>
        <div className="roadmapTrack">
          <span className="current">Local JSON</span>
          <span>REST API</span>
          <span>Database</span>
          <span>AI Agent</span>
          <span>Automation Engine</span>
        </div>
      </section>
    </div>
  );
}

function EnhancedToastPortal({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className="toastPortal" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`suggestionToast toast-${t.type}`}
          onClick={() => onDismiss(t.id)}
          role={t.type === 'error' ? 'alert' : 'status'}
        >
          <span className="toastIcon">{icons[t.type]}</span>
          <span className="toastMessage">{t.message}</span>
          <button
            className="toastCloseBtn"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(t.id);
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('nova-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [query, setQuery] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [routeInfo, setRouteInfo] = useState(() => parseRoute(window.location.pathname));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [entered, setEntered] = useState(() => {
    return window.localStorage.getItem('nova-entered') === 'true';
  });

  const currentPath = routeInfo.route;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('nova-theme', theme);
  }, [theme]);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    setRouteInfo(parseRoute(path));
    setQuery('');
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRouteInfo(parseRoute(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handlePaletteAction = useCallback((actionId) => {
    const routes = {
      goal: ROUTES.GOALS,
      project: ROUTES.PROJECTS,
      task: ROUTES.TASKS,
      issue: ROUTES.ISSUES,
    };
    const target = routes[actionId];
    if (target) handleNavigate(target);
  }, [handleNavigate]);

  const renderPage = () => {
    switch (routeInfo.route) {
      case ROUTES.DASHBOARD:
        return <DashboardHome onDateUpdate={setLastUpdatedAt} />;
      case ROUTES.TASKS:
        return <TasksPage />;
      case ROUTES.GOALS:
        return <GoalsPage />;
      case ROUTES.PROJECTS:
        return <ProjectsPage onNavigateToProject={(id) => handleNavigate(`${ROUTES.PROJECT_DETAIL_PREFIX}${id}`)} />;
      case ROUTES.ISSUES:
        return <IssuesPage />;
      case ROUTES.SUGGESTIONS:
        return <SuggestionsPage />;
      case ROUTES.REVIEWS:
        return <ReviewsPage onNavigateToReview={(id) => handleNavigate(`${ROUTES.REVIEW_DETAIL_PREFIX}${id}`)} />;
      case ROUTES.REVIEW_DETAIL_PREFIX:
        return (
          <ReviewDetailPage
            reviewId={routeInfo.reviewId}
            onBack={() => handleNavigate(ROUTES.REVIEWS)}
          />
        );
      case ROUTES.PROJECT_DETAIL_PREFIX:
        return (
          <ProjectDetailPage
            projectId={routeInfo.projectId}
            onBack={() => handleNavigate(ROUTES.PROJECTS)}
            onNavigateToTask={(taskId) => handleNavigate(ROUTES.TASKS)}
          />
        );
      default:
        return <DashboardHome onDateUpdate={setLastUpdatedAt} />;
    }
  };

  // Login / Welcome gate
  if (!entered) {
    return (
      <ToastProvider>
        <LoginPage
          onEnter={() => {
            window.localStorage.setItem('nova-entered', 'true');
            setEntered(true);
          }}
        />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <RealtimeBridge />
      <div className="appLayout">
        <Sidebar
          currentPath={currentPath}
          onNavigate={handleNavigate}
          sidebarOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
        />

        <div className="mainArea">
          <header className="topbar">
            <button
              className="mobileMenuBtn"
              onClick={() => setSidebarOpen(true)}
              aria-label="打开菜单"
            >
              <PanelLeft size={20} />
            </button>

            <div className="globalSearch">
              <Search size={16} />
              <input
                aria-label="全局搜索"
                placeholder="搜索系统、任务、数据卡片..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setPaletteOpen(true)}
              />
              <kbd style={{ fontSize: 10, color: 'var(--text-faint)' }}>Ctrl+K</kbd>
              {query && (
                <button
                  type="button"
                  className="clearSearch"
                  aria-label="清除搜索"
                  onClick={() => setQuery('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="topActions">
              <div className="datePill">
                <CalendarDays size={16} />
                {lastUpdatedAt ? formatDate(lastUpdatedAt) : '---'}
              </div>
              <button
                className="iconButton"
                aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                title="切换主题"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </header>

          <div className="pageContent">
            {renderPage()}
          </div>

          <BottomNav currentPath={currentPath} onNavigate={handleNavigate} />
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAction={handlePaletteAction}
      />

      <button
        className="fabLauncher"
        onClick={() => setPaletteOpen(true)}
        aria-label="快捷创建"
        title="快捷创建 (Ctrl+K)"
      >
        <Plus size={24} />
      </button>
    </ToastProvider>
  );
}
