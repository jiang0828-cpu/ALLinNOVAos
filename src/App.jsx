import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Command,
  Database,
  Dumbbell,
  FileText,
  Home,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Moon,
  Search,
  Sparkles,
  Sun,
  Target,
  Workflow,
  X,
} from "lucide-react";
import dashboard from "./data/dashboard.json";

const systemIcons = {
  "Life OS": Dumbbell,
  "Work OS": Workflow,
  "Media OS": FileText,
  "Knowledge OS": BrainCircuit,
  "AGI OS": Sparkles,
};

const cardIcons = {
  健康: Activity,
  财富: CircleDollarSign,
  工作: ListChecks,
  内容: FileText,
  学习: BrainCircuit,
  其他: Home,
};

const workSections = [
  {
    title: "市场工作",
    description: "营销云、市场项目、内容与活动工作台",
    href: "https://m0-marketingcloud.pages.dev/",
  },
  {
    title: "广和事业",
    description: "广和中安健康业务会议与协同入口",
    href: "https://guanghe-zhongan-healthcare.pages.dev/meeting",
  },
  {
    title: "其他业务",
    description: "预留业务入口，后续接入新的项目系统",
    href: "",
  },
];

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function matches(query, ...fields) {
  if (!query) return true;
  return fields.join(" ").toLowerCase().includes(query);
}

function Progress({ value }) {
  return (
    <div className="progress" aria-label={`进度 ${value}%`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function Header({ query, onQueryChange, theme, onToggleTheme }) {
  function scrollToCommandCenter() {
    document
      .getElementById("commandCenter")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            onClick={() => onQueryChange("")}
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
          aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
          title="切换主题"
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}

function LifeScore({ onSelectCategory }) {
  return (
    <section className="scorePanel">
      <div className="sectionEyebrow">STATE / TARGET</div>
      <div className="scoreGrid">
        <div className="scoreDial">
          <svg viewBox="0 0 120 120" role="img" aria-label={`Life Score ${dashboard.lifeScore}`}>
            <circle cx="60" cy="60" r="50" className="dialTrack" />
            <circle
              cx="60"
              cy="60"
              r="50"
              className="dialValue"
              pathLength="100"
              strokeDasharray={`${dashboard.lifeScore} 100`}
            />
          </svg>
          <div className="scoreValue">
            <strong>{dashboard.lifeScore}</strong>
            <span>目标达成评分</span>
          </div>
        </div>
        <div className="breakdown">
          {dashboard.statusBreakdown.map((item) => (
            <button
              key={item.label}
              className="breakdownItem"
              onClick={() => onSelectCategory(item)}
            >
              <div className="breakdownHeaderLeft">
                <span>{item.label}</span>
                <Progress value={item.value} />
              </div>
              <div className="breakdownHeaderRight">
                <strong>{item.value}</strong>
                <ChevronDown size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function TodayFocus({ items }) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">TODAY</span>
          <h2>今日重点</h2>
        </div>
        <Target size={20} />
      </div>
      {items.length === 0 ? (
        <p className="emptyState">没有匹配的重点任务。</p>
      ) : (
        <div className="focusList">
          {items.map((item) => (
            <article key={item.title} className="focusItem">
              <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.system} · {item.eta}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Alerts() {
  return (
    <section className="panel alertPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">RISK</span>
          <h2>风险提醒</h2>
        </div>
        <AlertTriangle size={20} />
      </div>
      {dashboard.alerts.map((alert) => (
        <article key={alert.title} className={`alertItem ${alert.level}`}>
          <h3>{alert.title}</h3>
          <p>{alert.reason}</p>
          <strong>{alert.action}</strong>
        </article>
      ))}
    </section>
  );
}

function AiSuggestion({ added, onConvert }) {
  return (
    <section className="panel insightPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">AI SUGGESTION</span>
          <h2>下一步建议</h2>
        </div>
        <Lightbulb size={20} />
      </div>
      <p>{dashboard.aiInsight}</p>
      <button className="primaryButton" onClick={onConvert} disabled={added}>
        {added ? "已加入今日重点" : "转为行动"}
        {added ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
      </button>
    </section>
  );
}

function SystemGrid({ systems, onOpenSystem }) {
  return (
    <section className="systemsSection">
      <div className="sectionTitle">
        <div>
          <span className="sectionEyebrow">SYSTEMS</span>
          <h2>五大系统入口</h2>
        </div>
        <span>{dashboard.systems.length} 个系统在线</span>
      </div>
      {systems.length === 0 ? (
        <p className="emptyState">没有匹配的系统。</p>
      ) : (
        <div className="systemsGrid">
          {systems.map((system) => {
            const Icon = systemIcons[system.name] ?? Database;
            return (
              <article
                className={`systemCard ${system.name === "Work OS" ? "isClickable" : ""}`}
                key={system.name}
                onClick={() => {
                  if (system.name === "Work OS") onOpenSystem(system);
                }}
                role={system.name === "Work OS" ? "button" : undefined}
                tabIndex={system.name === "Work OS" ? 0 : undefined}
                onKeyDown={(event) => {
                  if (system.name !== "Work OS") return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenSystem(system);
                  }
                }}
              >
                <div className="systemTop">
                  <div className="systemIcon">
                    <Icon size={20} />
                  </div>
                  <span>{system.status}</span>
                </div>
                <h3>{system.name}</h3>
                <p>{system.summary}</p>
                <Progress value={system.progress} />
                <div className="metricGrid">
                  {system.metrics.map((metric) => (
                    <span key={metric}>{metric}</span>
                  ))}
                </div>
                <button
                  className="ghostButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenSystem(system);
                  }}
                >
                  进入系统
                  <ArrowRight size={15} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DataCards({ cards }) {
  return (
    <section className="dataSection">
      <div className="sectionTitle">
        <div>
          <span className="sectionEyebrow">DATA</span>
          <h2>核心数据卡片</h2>
        </div>
      </div>
      {cards.length === 0 ? (
        <p className="emptyState">没有匹配的数据卡片。</p>
      ) : (
        <div className="dataGrid">
          {cards.map((card) => {
            const Icon = cardIcons[card.title] ?? Database;
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
      )}
    </section>
  );
}

function AICommand() {
  const [selected, setSelected] = useState(dashboard.commands[0]);
  const [draft, setDraft] = useState("");
  const [tasks, setTasks] = useState([
    { label: "锁定 90 分钟深度工作块", done: false },
    { label: "23:30 前结束屏幕任务", done: false },
    { label: "记录一次 Dashboard 使用反馈", done: false },
  ]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSelected({
      label: draft.trim(),
      output: `已收到「${draft.trim()}」。MVP 阶段先返回模拟建议：把它拆成一个 30 分钟可执行动作，并在完成后记录结果。`,
    });
    setDraft("");
  }

  function toggleTask(label) {
    setTasks((prev) =>
      prev.map((task) => (task.label === label ? { ...task, done: !task.done } : task)),
    );
  }

  return (
    <section className="commandCenter" id="commandCenter">
      <div className="commandHeader">
        <div>
          <span className="sectionEyebrow">AI COMMAND CENTER</span>
          <h2>模拟 AI 指令区</h2>
        </div>
        <Command size={22} />
      </div>

      <form className="commandInput" onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="输入一个指令，例如：帮我压缩今天任务"
          aria-label="AI 指令输入"
        />
        <button type="submit">运行</button>
      </form>

      <div className="quickCommands">
        {dashboard.commands.map((command) => (
          <button
            key={command.label}
            className={selected.label === command.label ? "active" : ""}
            onClick={() => setSelected(command)}
          >
            {command.label}
          </button>
        ))}
      </div>

      <div className="aiOutput">
        <div className="outputBadge">
          <Sparkles size={16} />
          NOVA 模拟输出
        </div>
        <p>{selected.output}</p>
        <div className="taskChips">
          {tasks.map((task) => (
            <button
              key={task.label}
              className={task.done ? "done" : ""}
              aria-pressed={task.done}
              onClick={() => toggleTask(task.label)}
            >
              <CheckCircle2 size={15} />
              {task.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <section className="roadmap">
      <div>
        <span className="sectionEyebrow">DATA EVOLUTION</span>
        <h2>API 接入预留</h2>
      </div>
      <div className="roadmapTrack">
        {dashboard.roadmap.map((step, index) => (
          <span key={step} className={index === 0 ? "current" : ""}>
            {step}
          </span>
        ))}
      </div>
    </section>
  );
}

function calculateProgress(target, achieved) {
  const t = parseFloat(target);
  const a = parseFloat(achieved);
  if (isNaN(t) || isNaN(a) || t <= 0) return null;
  return Math.min(100, Math.round((a / t) * 100));
}

function CategoryModal({ category, onClose }) {
  const closeButtonRef = useRef(null);
  const Icon = cardIcons[category?.label] ?? Database;
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (category?.subItems) {
      setItems(category.subItems.map((s) => ({ ...s })));
    }
  }, [category]);

  useEffect(() => {
    if (!category) return undefined;
    closeButtonRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [category, onClose]);

  if (!category) return null;

  function updateItem(index, field, value) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  const overallProgress = calculateProgress(category.target, category.achieved);

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="modalCard categoryModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="categoryModalTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="systemIcon">
            <Icon size={20} />
          </div>
          <div>
            <span className="sectionEyebrow">STATE / TARGET</span>
            <h2 id="categoryModalTitle">{category.label}</h2>
          </div>
          <button ref={closeButtonRef} className="iconButton" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <h3 className="subItemsTitle">子项详情</h3>
        {items.length > 0 ? (
          <div className="subItemsList">
            {items.map((sub, index) => {
              const progress = calculateProgress(sub.target, sub.achieved);
              return (
                <div key={sub.label} className="subItemCard">
                  <div className="subItemCardHeader">
                    <strong>{sub.label}</strong>
                    {progress !== null && <span className="progressBadge">{progress}%</span>}
                  </div>
                  <div className="subItemInputs">
                    <div className="inputGroup">
                      <label>目标</label>
                      <input
                        type="text"
                        value={sub.target}
                        onChange={(e) => updateItem(index, "target", e.target.value)}
                        placeholder="输入目标值"
                      />
                    </div>
                    <div className="inputGroup">
                      <label>达成</label>
                      <input
                        type="text"
                        value={sub.achieved}
                        onChange={(e) => updateItem(index, "achieved", e.target.value)}
                        placeholder="输入达成值"
                      />
                    </div>
                  </div>
                  {progress !== null && <Progress value={progress} />}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="emptyState">暂无子项数据</p>
        )}
      </div>
    </div>
  );
}

function SystemModal({ system, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!system) return undefined;
    closeButtonRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [system, onClose]);

  if (!system) return null;
  const Icon = systemIcons[system.name] ?? Database;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className={`modalCard ${system.name === "Work OS" ? "workModal" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="systemModalTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="systemIcon">
            <Icon size={20} />
          </div>
          <div>
            <span className="sectionEyebrow">{system.status}</span>
            <h2 id="systemModalTitle">{system.name}</h2>
          </div>
          <button ref={closeButtonRef} className="iconButton" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="modalSummary">{system.summary}</p>
        <Progress value={system.progress} />
        <div className="metricGrid modalMetrics">
          {system.metrics.map((metric) => (
            <span key={metric}>{metric}</span>
          ))}
        </div>
        {system.name === "Work OS" && (
          <div className="workSectionGrid" aria-label="Work OS 子板块">
            {workSections.map((section) =>
              section.href ? (
                <a
                  className="workSectionCard"
                  href={section.href}
                  target="_blank"
                  rel="noreferrer"
                  key={section.title}
                >
                  <strong>{section.title}</strong>
                  <span>{section.description}</span>
                  <em>
                    打开
                    <ArrowRight size={14} />
                  </em>
                </a>
              ) : (
                <div className="workSectionCard disabled" key={section.title}>
                  <strong>{section.title}</strong>
                  <span>{section.description}</span>
                  <em>预留</em>
                </div>
              ),
            )}
          </div>
        )}
        <p className="modalNote">
          二级系统页面尚未接入，当前展示的是该系统的概览数据。后续将替换为真实模块入口。
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem("nova-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [query, setQuery] = useState("");
  const [focusItems, setFocusItems] = useState(dashboard.todayFocus);
  const [insightAdded, setInsightAdded] = useState(false);
  const [activeSystem, setActiveSystem] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("nova-theme", theme);
  }, [theme]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSystems = useMemo(
    () =>
      dashboard.systems.filter((system) =>
        matches(normalizedQuery, system.name, system.summary, system.status, ...system.metrics),
      ),
    [normalizedQuery],
  );

  const filteredFocus = useMemo(
    () => focusItems.filter((item) => matches(normalizedQuery, item.title, item.system)),
    [focusItems, normalizedQuery],
  );

  const filteredDataCards = useMemo(
    () => dashboard.dataCards.filter((card) => matches(normalizedQuery, card.title, card.detail)),
    [normalizedQuery],
  );

  function handleConvertInsight() {
    if (insightAdded) return;
    setFocusItems((prev) => [
      { title: dashboard.aiInsight, system: "AGI OS", priority: "P1", eta: "AI 建议" },
      ...prev,
    ]);
    setInsightAdded(true);
  }

  return (
    <main className="appShell">
      <Header
        query={query}
        onQueryChange={setQuery}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
      />

      <section className="heroGrid">
        <LifeScore onSelectCategory={setActiveCategory} />
        <TodayFocus items={filteredFocus} />
        <Alerts />
        <AiSuggestion added={insightAdded} onConvert={handleConvertInsight} />
      </section>

      <SystemGrid systems={filteredSystems} onOpenSystem={setActiveSystem} />
      <DataCards cards={filteredDataCards} />
      <AICommand />
      <Roadmap />

      <SystemModal system={activeSystem} onClose={() => setActiveSystem(null)} />
      <CategoryModal category={activeCategory} onClose={() => setActiveCategory(null)} />
    </main>
  );
}
