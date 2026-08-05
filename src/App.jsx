import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Command,
  Database,
  Dumbbell,
  FileText,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Search,
  Settings2,
  Sparkles,
  Target,
  Workflow,
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
};

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Progress({ value }) {
  return (
    <div className="progress" aria-label={`进度 ${value}%`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function Header() {
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
        <input aria-label="全局搜索" placeholder="搜索系统、任务、笔记" />
      </div>

      <div className="topActions">
        <div className="datePill">
          <CalendarDays size={16} />
          {formatDate(dashboard.updatedAt)}
        </div>
        <button className="iconButton" aria-label="AI 指令入口" title="AI 指令入口">
          <Command size={18} />
        </button>
        <button className="iconButton" aria-label="设置" title="设置">
          <Settings2 size={18} />
        </button>
      </div>
    </header>
  );
}

function LifeScore() {
  return (
    <section className="scorePanel">
      <div className="sectionEyebrow">CORE STATE</div>
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
            <span>{dashboard.lifeScoreTrend} 本周</span>
          </div>
        </div>
        <div className="breakdown">
          {dashboard.statusBreakdown.map((item) => (
            <div key={item.label} className="breakdownItem">
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <Progress value={item.value} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TodayFocus() {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <span className="sectionEyebrow">TODAY</span>
          <h2>今日重点</h2>
        </div>
        <Target size={20} />
      </div>
      <div className="focusList">
        {dashboard.todayFocus.map((item) => (
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

function AiSuggestion() {
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
      <button className="primaryButton">
        转为行动
        <ArrowRight size={16} />
      </button>
    </section>
  );
}

function SystemGrid() {
  return (
    <section className="systemsSection">
      <div className="sectionTitle">
        <div>
          <span className="sectionEyebrow">SYSTEMS</span>
          <h2>五大系统入口</h2>
        </div>
        <span>{dashboard.systems.length} 个系统在线</span>
      </div>
      <div className="systemsGrid">
        {dashboard.systems.map((system) => {
          const Icon = systemIcons[system.name] ?? Database;
          return (
            <article className="systemCard" key={system.name}>
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
              <button className="ghostButton">
                进入系统
                <ArrowRight size={15} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DataCards() {
  return (
    <section className="dataSection">
      <div className="sectionTitle">
        <div>
          <span className="sectionEyebrow">DATA</span>
          <h2>核心数据卡片</h2>
        </div>
      </div>
      <div className="dataGrid">
        {dashboard.dataCards.map((card) => {
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
    </section>
  );
}

function AICommand() {
  const [selected, setSelected] = useState(dashboard.commands[0]);
  const [draft, setDraft] = useState("");
  const generatedTasks = useMemo(
    () => [
      "锁定 90 分钟深度工作块",
      "23:30 前结束屏幕任务",
      "记录一次 Dashboard 使用反馈",
    ],
    [],
  );

  function handleSubmit(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSelected({
      label: draft.trim(),
      output: `已收到「${draft.trim()}」。MVP 阶段先返回模拟建议：把它拆成一个 30 分钟可执行动作，并在完成后记录结果。`,
    });
    setDraft("");
  }

  return (
    <section className="commandCenter">
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
          {generatedTasks.map((task) => (
            <button key={task}>
              <CheckCircle2 size={15} />
              {task}
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

export default function App() {
  return (
    <main className="appShell">
      <Header />

      <section className="heroGrid">
        <LifeScore />
        <TodayFocus />
        <Alerts />
        <AiSuggestion />
      </section>

      <SystemGrid />
      <DataCards />
      <AICommand />
      <Roadmap />
    </main>
  );
}
