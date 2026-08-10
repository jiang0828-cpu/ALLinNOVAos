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
  { route: ROUTES.GOALS, icon: Target, label: '目标', section: '管理' },
  { route: ROUTES.PROJECTS, icon: FolderKanban, label: '项目', section: '管理' },
  { route: ROUTES.TASKS, icon: CheckSquare, label: '任务', section: '管理' },
  { route: ROUTES.ISSUES, icon: AlertTriangle, label: '问题', section: '管理' },
  { route: ROUTES.SUGGESTIONS, icon: Lightbulb, label: '建议', section: '洞察' },
  { route: ROUTES.REVIEWS, icon: ClipboardList, label: '复盘', section: '洞察' },
];

const QUICK_ACTIONS = [
  { id: 'goal', label: '创建目标', icon: Target, hint: 'G' },
  { id: 'project', label: '创建项目', icon: FolderKanban, hint: 'P' },
  { id: 'task', label: '创建任务', icon: CheckSquare, hint: 'T' },
  { id: 'issue', label: '记录问题', icon: AlertTriangle, hint: 'I' },
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
        return <CommandHub onDateUpdate={setLastUpdatedAt} />;
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
        return <CommandHub onDateUpdate={setLastUpdatedAt} />;
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