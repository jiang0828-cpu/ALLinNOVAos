import { Component, useEffect, useState, useCallback } from 'react';
import {
  Command,
  LayoutDashboard,
  Search,
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
  Database,
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
  { route: '/#commandhub', icon: LayoutDashboard, label: '全局指挥台', section: '概览' },
  { route: '/#systems-os', icon: BriefcaseBusiness, label: '五大系统OS', section: '概览' },
  { route: '/#data-management', icon: Database, label: '要素管理', section: '概览' },
  { route: '/#ai-command', icon: Command, label: 'AI指令区', section: '概览' },
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
    metrics: ['睡眠', '步数', '消费', '待办'],
  },
  {
    name: 'Work OS',
    summary: '项目、客户、任务与商业机会',
    status: '需聚焦',
    progress: 64,
    icon: BriefcaseBusiness,
    metrics: ['重点项目', '今日任务', '客户跟进', '进度'],
    links: [
      { label: '市场工作', href: 'https://m0-marketingcloud.pages.dev/' },
      { label: '自媒体运营', href: '#' },
      { label: '广和事业', href: 'https://guanghe-zhongan-healthcare.pages.dev/meeting' },
      { label: '其他业务', href: '#' },
    ],
  },
  {
    name: 'Marketing OS',
    summary: '选题、生产、发布计划与数据复盘',
    status: '增长',
    progress: 88,
    icon: Radio,
    metrics: ['今日选题', '待发布', '增长', '复盘'],
  },
  {
    name: 'Knowledge OS',
    summary: '学习计划、阅读记录、知识库与笔记',
    status: '积累中',
    progress: 72,
    icon: BookOpen,
    metrics: ['今日学习', '阅读', '新增笔记', '主题'],
  },
  {
    name: 'AGI OS',
    summary: 'AI 实验、工具清单与商业探索',
    status: '实验中',
    progress: 81,
    icon: Sparkles,
    metrics: ['当前实验', '待验证', '工具调用', '下一步'],
  },
];

const QUICK_COMMANDS = ['帮我规划今天', '总结本周重点', '分析任务优先级', '生成明日行动清单'];

const SAMPLE_ACTIONS = [
  '锁定 90 分钟深度工作块',
  '23:30 前结束屏幕任务',
  '记录一次 Dashboard 使用反馈',
];

function parseRoute(pathname) {
  const [pathOnly, hashPart = ''] = pathname.split('#');
  const hash = hashPart ? `#${hashPart}` : '';
  if (pathOnly === ROUTES.DASHBOARD) return { route: ROUTES.DASHBOARD, hash };
  if (pathOnly === ROUTES.TASKS) return { route: ROUTES.TASKS, hash };
  if (pathOnly === ROUTES.GOALS) return { route: ROUTES.GOALS, hash };
  if (pathOnly === ROUTES.PROJECTS) return { route: ROUTES.PROJECTS, hash };
  if (pathOnly === ROUTES.ISSUES) return { route: ROUTES.ISSUES, hash };
  if (pathOnly === ROUTES.SUGGESTIONS) return { route: ROUTES.SUGGESTIONS, hash };
  if (pathOnly === ROUTES.REVIEWS) return { route: ROUTES.REVIEWS, hash };
  if (pathOnly.startsWith(ROUTES.REVIEW_DETAIL_PREFIX)) {
    const reviewId = pathOnly.slice(ROUTES.REVIEW_DETAIL_PREFIX.length);
    if (reviewId) return { route: ROUTES.REVIEW_DETAIL_PREFIX, reviewId, hash };
  }
  if (pathOnly.startsWith(ROUTES.PROJECT_DETAIL_PREFIX)) {
    const projectId = pathOnly.slice(ROUTES.PROJECT_DETAIL_PREFIX.length);
    if (projectId) return { route: ROUTES.PROJECT_DETAIL_PREFIX, projectId, hash };
  }
  return { route: ROUTES.DASHBOARD, hash };
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

function isActive(currentPath, route, currentHash = '') {
  if (route.startsWith('/#')) {
    const targetHash = route.slice(1);
    return currentPath === ROUTES.DASHBOARD && (currentHash || '#commandhub') === targetHash;
  }
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

function Sidebar({ currentPath, currentHash, onNavigate, sidebarOpen, onCloseSidebar }) {
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
                const active = isActive(currentPath, item.route, currentHash);
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

const QUICK_ACTION_ROUTES = {
  goal: ROUTES.GOALS,
  project: ROUTES.PROJECTS,
  task: ROUTES.TASKS,
  issue: ROUTES.ISSUES,
};

const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter(
  (item) =>
    item.route === '/#commandhub' ||
    item.route === ROUTES.GOALS ||
    item.route === ROUTES.TASKS ||
    item.route === ROUTES.REVIEWS,
);

function BottomNav({ currentPath, currentHash, onNavigate }) {
  return (
    <nav className="bottomNav" aria-label="移动端导航">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(currentPath, item.route, currentHash);
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

function DashboardHome({ onDateUpdate, onNavigate, theme, onThemeToggle }) {
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

  return (
    <div className="dashboardHome">
      <div id="commandhub" className="dashboardAnchor">
          <CommandHub
            onDateUpdate={onDateUpdate}
            theme={theme}
            onThemeToggle={onThemeToggle}
          onOpenGoals={() => onNavigate?.(ROUTES.GOALS)}
          onOpenTasks={() => onNavigate?.(ROUTES.TASKS)}
          onOpenIssues={() => onNavigate?.(ROUTES.ISSUES)}
          onOpenSuggestions={() => onNavigate?.(ROUTES.SUGGESTIONS)}
          onCreateReview={() => onNavigate?.(ROUTES.REVIEWS)}
          onOpenReview={(id) => onNavigate?.(`${ROUTES.REVIEW_DETAIL_PREFIX}${id}`)}
          onOpenReviews={() => onNavigate?.(ROUTES.REVIEWS)}
        />
      </div>

      <section id="systems-os" className="systemsSection dashboardAnchor" aria-labelledby="systems-title">
        <div className="sectionTitle">
          <div>
            <span className="sectionEyebrow">SYSTEMS</span>
            <h2 id="systems-title">五大系统OS</h2>
          </div>
          <span>5 个系统在线</span>
        </div>

        <div className="systemsGrid">
          {SYSTEM_ENTRIES.map((entry) => {
            const Icon = entry.icon;

            return (
              <article
                key={entry.name}
                className="systemCard"
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
                {entry.links ? (
                  <div className="systemLinks systemLinksAsMetrics" onClick={(event) => event.stopPropagation()}>
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
                ) : (
                  <div className="metricGrid">
                    {entry.metrics.map((metric) => (
                      <span key={metric}>{metric}</span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section id="data-management" className="roadmap dashboardAnchor" aria-labelledby="roadmap-title">
        <div>
          <span className="sectionEyebrow">ELEMENT MANAGEMENT</span>
          <h2 id="roadmap-title">要素管理</h2>
        </div>
        <div className="roadmapTrack">
          <span className="current">信息要素/流</span>
          <span>物质要素/流</span>
          <span>能量要素/流</span>
          <a
            href="https://ncnpindf9n8d.feishu.cn/drive/home/"
            target="_blank"
            rel="noreferrer"
          >
            文档管理
          </a>
          <span>其他要素</span>
        </div>
      </section>

      <section id="ai-command" className="commandCenter dashboardAnchor" aria-labelledby="command-title">
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
            演示建议：先完成关键交付，再处理即时管理，最后安排一次轻量复盘。
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
    </div>
  );
}

function EnhancedToastPortal({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  const icons = {
    success: 'OK',
    error: '!',
    info: 'i',
    warning: '!',
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

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary] Render failed:', error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="appErrorFallback">
          <div>
            <span className="sectionEyebrow">NOVA OS</span>
            <h1>页面加载异常</h1>
            <p>{this.state.error?.message || '当前页面渲染失败，请刷新或返回首页。'}</p>
            <div className="appErrorActions">
              <button type="button" className="primaryButton" onClick={() => window.location.reload()}>
                重新加载
              </button>
              <button type="button" className="secondaryButton" onClick={() => window.location.assign('/')}>
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('nova-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [routeInfo, setRouteInfo] = useState(() => parseRoute(`${window.location.pathname}${window.location.hash}`));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [entered, setEntered] = useState(() => {
    return window.localStorage.getItem('nova-entered') !== 'false';
  });

  const currentPath = routeInfo.route;
  const currentHash = routeInfo.hash || '';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('nova-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('nova-entered', 'true');
  }, []);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    setRouteInfo(parseRoute(path));
    const hash = path.includes('#') ? `#${path.split('#')[1]}` : '';
    if (hash) {
      window.setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const openQuickAction = useCallback((actionId) => {
    const target = QUICK_ACTION_ROUTES[actionId];
    if (!target) return;

    window.sessionStorage.setItem('nova-pending-quick-action', actionId);
    handleNavigate(target);
    setPaletteOpen(false);

    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('nova:quick-create', { detail: { actionId } }),
      );
    }, 120);
  }, [handleNavigate]);

  useEffect(() => {
    const handlePopState = () => {
      setRouteInfo(parseRoute(`${window.location.pathname}${window.location.hash}`));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      const key = e.key.toLowerCase();
      const withCommand = e.ctrlKey || e.metaKey;

      if (withCommand && key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (withCommand && ['g', 'p', 't', 'i'].includes(key)) {
        e.preventDefault();
        const actionByKey = {
          g: 'goal',
          p: 'project',
          t: 'task',
          i: 'issue',
        };
        openQuickAction(actionByKey[key]);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openQuickAction]);

  const handlePaletteAction = useCallback((actionId) => {
    openQuickAction(actionId);
  }, [openQuickAction]);

  const renderPage = () => {
    switch (routeInfo.route) {
      case ROUTES.DASHBOARD:
        return <DashboardHome
            onNavigate={handleNavigate}
            theme={theme}
            onThemeToggle={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          />;
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
        return <DashboardHome
            onNavigate={handleNavigate}
            theme={theme}
            onThemeToggle={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          />;
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
          currentHash={currentHash}
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

          </header>

          <div className="pageContent">
            <AppErrorBoundary resetKey={`${currentPath}${currentHash}`}>
              {renderPage()}
            </AppErrorBoundary>
          </div>

          <BottomNav currentPath={currentPath} currentHash={currentHash} onNavigate={handleNavigate} />
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
