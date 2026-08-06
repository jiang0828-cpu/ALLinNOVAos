# NOVA OS — 产品架构模型 (Product Model)

> **用途 (Purpose)：**
> 定义 NOVA OS 的产品定位、技术架构、核心业务链路与功能模块。说明各模块如何围绕 PDCAr 循环组织，业务实体如何从 Idea 流转到 Next Cycle Plan，以及 work_items 统一主表 + workspace 隔离的数据架构。本文档是产品层面的「蓝图」。

---

## 1. 产品定位 (Product Positioning)

NOVA OS 是基于 **PDCAr**（Plan-Do-Check-Act-review）方法论的**个人指挥系统 (Personal Command System)**。

| 维度 (Dimension) | 描述 (Description) |
|------------------|--------------------|
| 一句话定位 (One-liner) | 以 PDCAr 循环驱动的个人指挥台 |
| 目标用户 (Target User) | 自我管理型知识工作者 |
| 核心价值 (Core Value) | Idea → Insight 全链路可视、可追踪、可复盘 |
| 差异化 (Differentiation) | 不是任务清单工具，而是闭环指挥系统 |

---

## 2. 技术架构 (Tech Architecture)

### 2.1 技术栈 (Tech Stack)

| 层级 (Layer) | 选型 (Choice) |
|--------------|---------------|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Cache & Queue | Redis + BullMQ |
| API | REST API |
| Testing | Jest + Supertest |
| ID | UUID |
| Timestamp | UTC TIMESTAMPTZ |

### 2.2 数据架构 (Data Architecture)

```
┌─────────────────────────────────────────────────────┐
│                  Workspace (工作空间)                │
│  ┌───────────────────────────────────────────────┐  │
│  │           work_items (统一主表)                │  │
│  │  id / workspaceId / type / status /           │  │
│  │  title / createdAt / updatedAt / deletedAt    │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │ 1:1                           │
│        ┌─────────────┼─────────────┐                │
│        ▼             ▼             ▼                │
│   goal_detail   task_detail   review_detail  ...    │
│   project_detail  idea_detail  suggestion_detail    │
│   issue_detail    insight_detail  decision_detail   │
│                                                      │
│   activity_events (审计日志)                         │
│   dashboard_snapshots (读模型, 可重建)               │
└─────────────────────────────────────────────────────┘
```

**核心规则 (Core Rules)：**
- Dashboard 是读模型 (Read Model)，不是事实数据源
- 所有核心业务对象使用 `work_items` 统一主表
- 各对象使用各自 detail 表存储特有字段
- 所有业务数据必须属于 workspace，禁止跨 workspace 关联
- UUID 外键关联，禁止用 title 关联
- 核心对象只允许软删除（`deletedAt`），不允许物理删除
- Dashboard Snapshot 可重建，不能成为唯一事实来源
- 所有重要操作写入 `activity_events`

---

## 3. 核心业务链路 (Core Business Chain)

```
Idea → Goal → Project → Task → Metric(检查维度) → Issue
  → Suggestion / Decision → Review → Insight → Next Cycle Plan
```

### 3.1 链路节点定义 (Node Definitions)

| 节点 (Node) | 中文 (Chinese) | PDCAr 阶段 (Stage) | 说明 (Description) |
|-------------|----------------|--------------------|--------------------|
| Idea | 想法 | Plan | 灵感与初始想法，可转化为 Goal |
| Goal | 目标 | Plan | 顶层目标，定义方向与衡量标准 |
| Project | 项目 | Plan | 目标拆解为可执行项目 |
| Task | 任务 | Do | 项目拆解为具体任务并执行 |
| Metric | 指标 | Check | 衡量进展的量化维度（非独立对象） |
| Issue | 问题 | Check | 执行中发现的偏差或阻碍 |
| Suggestion | 建议 | Act | 基于问题生成的改进建议 |
| Decision | 决策 | Act | 基于建议做出的方向决策 |
| Review | 复盘 | Review | 周期性回顾与总结 |
| Insight | 洞察 | Review | 复盘提炼的经验与规律 |
| Next Cycle Plan | 下一周期计划 | Plan（下一轮） | 决策驱动的新一轮 PDCAr |

### 3.2 链路流转图 (Chain Flow Diagram)

```
┌─────────────────────────────────────────────────────────┐
│                    PDCAr 循环 (Cycle)                     │
│                                                           │
│   ┌─────┐    ┌─────────┐    ┌──────┐    ┌──────────┐    │
│   │Plan │───►│   Do    │───►│Check │───►│   Act    │    │
│   │ 计划 │    │  执行   │    │ 检查 │    │ 行动/调整│    │
│   └──┬──┘    └────┬────┘    └──┬───┘    └─────┬────┘    │
│      │            │            │              │          │
│  Idea/Goal     Task        Metric/Issue   Suggestion     │
│  /Project                              /Decision         │
│                                                          │
│                          ┌───────────┐                   │
│                          │  Review   │                   │
│                          │   复盘    │                   │
│                          └─────┬─────┘                   │
│                                │                         │
│                          Insight                         │
│                                │                         │
│                       Next Cycle Plan                    │
│                          (回到 Plan)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 4. PDCAr 循环映射 (PDCAr Cycle Mapping)

| PDCAr 阶段 (Stage) | 对象类型 (Object Types) | 输入 (Input) | 输出 (Output) |
|--------------------|-------------------------|--------------|---------------|
| **P** — Plan 计划 | goal / project / idea | Insight / Decision | Goal, Project, Task |
| **D** — Do 执行 | task | Task | Metric 数据 |
| **C** — Check 检查 | issue / metric | Metric 数据 | Issue |
| **A** — Act 行动 | suggestion / decision | Issue | Suggestion, Decision |
| **r** — Review 复盘 | review / insight | Suggestion/Decision 结果 | Insight, Next Cycle Plan |

---

## 5. 功能模块 (Function Modules)

| 模块 (Module) | 对应 PDCAr | 核心对象 (Entities) | 说明 |
|---------------|-----------|---------------------|------|
| 想法池 (Idea Pool) | P | Idea | 灵感收集与转化 |
| 目标管理 (Goal Management) | P | Goal, Project | 目标与项目规划 |
| 任务执行 (Task Execution) | D | Task | 任务执行与进度追踪 |
| 问题检查 (Issue Check) | C | Issue, Metric | 偏差检测与问题记录 |
| 建议决策 (Suggestion & Decision) | A | Suggestion, Decision | 改进建议与方向决策 |
| 复盘洞察 (Review Insight) | r | Review, Insight | 周期复盘与经验沉淀 |
| 指挥台 (Command Dashboard) | 全周期 | 全部对象（读模型） | 全局视图与综合评分 |

### 5.1 指挥台模块 (Command Dashboard)

指挥台是 NOVA OS 的核心入口，为**读模型 (Read Model)**，聚合 PDCAr 全周期数据：

| 区域 (Zone) | 内容 (Content) |
|-------------|----------------|
| STATE / TARGET | 目标达成度 (Goal Achievement) + Life Score |
| 今日重点 (Today Focus) | 当前 Task 列表 |
| 信息资讯 (Feeds) | NEWS / IDEAS / PLANS 三模块 |
| AI 建议 (AI Suggestion) | Suggestion 列表（用户确认后转 Task） |

> Dashboard Snapshot 可由 `work_items` 重建，不作为唯一事实来源。

---

## 6. AI 能力边界 (AI Capability Boundary)

| 能力 (Capability) | 允许 (Allowed) |
|-------------------|----------------|
| 生成建议 (Generate Suggestion) | ✅ |
| 生成复盘草稿 (Generate Review Draft) | ✅ |
| 生成任务草稿 (Generate Task Draft) | ✅ |
| 删除数据 (Delete Data) | ❌ |
| 修改目标值 (Modify Target Value) | ❌ |
| 修改评分规则 (Modify Score Rules) | ❌ |
| 修改历史记录 (Modify History) | ❌ |
| 创建真实任务 (Create Real Task) | ⚠️ 需用户确认 |
| 发送敏感数据到外部 (Send Sensitive Data) | ❌ 默认禁止 |

---

## 7. 演进路线 (Evolution Roadmap)

| 阶段 (Phase) | 目标 (Goal) | 关键交付 (Deliverable) |
|--------------|-------------|------------------------|
| Phase 1 | 核心链路落地 | work_items 主表 + 9 类 detail 表 + REST API |
| Phase 2 | Dashboard 读模型 | Snapshot 重建 + 聚合查询 |
| Phase 3 | AI 辅助 | Suggestion/Review/Task 草稿生成 |
| Phase 4 | 异步计算 | BullMQ 幂等进度更新 |
| Phase 5 | 自动化 | 定时 Review 触发与 Decision 落地 |
