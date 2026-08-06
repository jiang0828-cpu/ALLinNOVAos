# NOVA OS — PDCAr 方法论模型 (PDCAr Model)

> **用途 (Purpose)：**
> 定义 NOVA OS 的核心方法论 **PDCAr**（Plan-Do-Check-Act-review）。说明每个阶段的输入、输出、活动与产出物，以及核心对象类型如何映射到各阶段。本文档是 NOVA OS 业务设计的「方法论基石」。

---

## 1. PDCAr 模型定义 (Model Definition)

PDCAr 是戴明环 (Deming Cycle) PDCA 的增强版本，新增 **r — Review 复盘** 阶段，形成闭环驱动。

| 代号 (Code) | 英文 (English) | 中文 (Chinese) | 核心问题 (Key Question) |
|-------------|----------------|----------------|------------------------|
| **P** | plan | 计划 | 要做什么？目标是什么？ |
| **D** | do | 执行 | 怎么做？执行情况如何？ |
| **C** | check | 检查 | 做得怎么样？有无偏差？ |
| **A** | act | 行动/调整 | 如何改进？决策什么？ |
| **r** | review | 复盘 | 学到什么？下一步方向？ |

> **注意：** 小写 `r` 表示 Review 是 PDCA 的「反思层」，强调其作为闭环驱动器的特殊地位。

---

## 2. 循环图 (Cycle Diagram)

```
                  ┌───────────────────────┐
                  │                       │
                  ▼                       │
            ┌──────────┐                  │
            │   P      │                  │
            │  plan    │                  │
            │  计划    │                  │
            └────┬─────┘                  │
                 │                        │
                 ▼                        │
            ┌──────────┐            ┌──────────┐
            │   D      │            │   r      │
            │  do      │            │  review  │
            │  执行    │            │  复盘    │
            └────┬─────┘            └────▲─────┘
                 │                       │
                 ▼                       │
            ┌──────────┐            ┌──────────┐
            │   C      │            │   A      │
            │  check   │───────────►│  act     │
            │  检查    │            │ 行动/调整│
            └──────────┘            └────┬─────┘
                                         │
                                         └───────────►
                                          (回到 r)
```

---

## 3. 核心对象类型映射 (Core Object Type Mapping)

| PDCAr 阶段 (Stage) | 对象类型 (Object Types) | 中文 (Chinese) |
|--------------------|-------------------------|----------------|
| **P** — plan 计划 | goal / project / idea | 目标 / 项目 / 想法 |
| **D** — do 执行 | task | 任务 |
| **C** — check 检查 | issue / metric | 问题 / 指标 |
| **A** — act 行动 | suggestion / decision | 建议 / 决策 |
| **r** — review 复盘 | review / insight | 复盘 / 洞察 |

> **说明：** `metric` 作为 check 阶段的检查维度，不作为独立核心对象类型，依附于 issue 或 task。

---

## 4. 阶段详细定义 (Stage Definitions)

### 4.1 P — plan 计划

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 输入 (Input) | 上一周期的 Insight / Decision |
| 活动 (Activities) | 想法收集、目标设定、项目拆解、任务分配 |
| 对象类型 (Objects) | idea, goal, project, task |
| 输出 (Output) | 已规划的 Goal / Project / Task |
| 产出物 (Deliverable) | 周期计划 |

### 4.2 D — do 执行

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 输入 (Input) | Task 列表 |
| 活动 (Activities) | 任务执行、进度记录、指标采集 |
| 对象类型 (Objects) | task |
| 输出 (Output) | Task 状态变更、Metric 数据 |
| 产出物 (Deliverable) | 执行记录与指标数据 |

### 4.3 C — check 检查

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 输入 (Input) | Metric 数据 |
| 活动 (Activities) | 指标对比、偏差分析、问题识别 |
| 对象类型 (Objects) | issue, metric |
| 输出 (Output) | Issue 列表 |
| 产出物 (Deliverable) | 检查报告与问题清单 |

### 4.4 A — act 行动/调整

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 输入 (Input) | Issue 列表 |
| 活动 (Activities) | 根因分析、建议生成、决策制定 |
| 对象类型 (Objects) | suggestion, decision |
| 输出 (Output) | Suggestion, Decision |
| 产出物 (Deliverable) | 改进建议与方向决策 |

### 4.5 r — review 复盘

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 输入 (Input) | Suggestion / Decision 执行结果 |
| 活动 (Activities) | 周期回顾、经验提炼、方向确认 |
| 对象类型 (Objects) | review, insight |
| 输出 (Output) | Insight, Next Cycle Plan |
| 产出物 (Deliverable) | 复盘报告与下一周期计划 |

---

## 5. 业务链路映射 (Business Chain Mapping)

PDCAr 各阶段对应的核心业务实体流转：

```
P (plan)    ──►  Idea → Goal → Project → Task
                     │
D (do)      ──►  Task 执行 + Metric 采集
                     │
C (check)   ──►  Metric → Issue
                     │
A (act)     ──►  Issue → Suggestion / Decision
                     │
r (review)  ──►  Review → Insight → Next Cycle Plan
                     │
                     └──► (回到 P，开启下一轮)
```

---

## 6. 与传统 PDCA 的差异 (Differences from Traditional PDCA)

| 维度 (Dimension) | PDCA | PDCAr |
|------------------|------|-------|
| 阶段数 | 4 | 5 |
| 复盘 | 隐含在 Act 中 | 独立为 r 阶段 |
| 闭环驱动 | Act → Plan（隐式） | Review → Plan（显式） |
| 知识沉淀 | 无独立机制 | Insight 显式产出 |
| 决策机制 | 无独立对象 | Decision 显式产出 |
| 适用场景 | 流程改进 | 个人/团队持续成长 |

### 核心增强 (Key Enhancement)
PDCAr 将「复盘」从 Act 中独立出来，强调：
1. **反思作为独立环节**：避免被行动淹没
2. **知识显式沉淀**：Insight 成为可复用资产
3. **决策显式记录**：Decision 驱动 Next Cycle Plan
4. **闭环显式驱动**：Review 明确指向下一轮 Plan

---

## 7. 周期粒度 (Cycle Granularity)

NOVA OS 支持多粒度的 PDCAr 循环：

| 周期类型 (Cycle Type) | 时间跨度 (Span) | 典型场景 (Scenario) |
|----------------------|-----------------|---------------------|
| Daily (日循环) | 1 天 | 每日任务执行与小结 |
| Weekly (周循环) | 1 周 | 周度目标检查与调整 |
| Monthly (月循环) | 1 月 | 月度复盘与方向决策 |
| Quarterly (季循环) | 1 季度 | 季度战略复盘 |

> 周期类型存储于 `review.cycleType` 字段（见 data-dictionary.md）。

---

## 8. 产出物清单 (Deliverable Checklist)

每个完整 PDCAr 循环应产出：

- [ ] **P** — plan: 周期计划（Idea + Goal + Project + Task）
- [ ] **D** — do: 执行记录（Task 状态 + Metric 数据）
- [ ] **C** — check: 检查报告（Issue 列表）
- [ ] **A** — act: 改进方案（Suggestion + Decision）
- [ ] **r** — review: 复盘报告（Insight + Next Cycle Plan）
