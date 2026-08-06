# NOVA OS — 状态机定义 (State Machines)

> **用途 (Purpose)：**
> 定义 NOVA OS 核心业务对象的状态机，包括状态定义、转换规则与触发条件。覆盖 Idea、Goal、Task、Issue、Suggestion、Review 等对象，以及 PDCAr 整体循环阶段流转。所有状态变更需写入 `activity_events`。

---

## 1. 概述 (Overview)

NOVA OS 的状态机分为两类：
- **实体状态机 (Entity State Machine)**：单个业务对象的生命周期
- **循环状态机 (Cycle State Machine)**：PDCAr 整体循环的阶段流转

> 所有状态存储于 `work_items.status` 字段，状态变更写入 `activity_events`。

---

## 2. Idea 想法状态机

### 2.1 状态定义 (States)

| 状态 (State) | 中文 (Chinese) | 说明 (Description) |
|--------------|----------------|--------------------|
| `COLLECTED` | 已收集 | 想法已记录，待评估 |
| `CONVERTED` | 已转化 | 已转化为 Goal |
| `ARCHIVED` | 已归档 | 评估后不转化，归档存储 |

### 2.2 转换规则 (Transitions)

| 源状态 (From) | 目标状态 (To) | 触发条件 (Trigger) |
|---------------|---------------|---------------------|
| `COLLECTED` | `CONVERTED` | 用户确认转化为 Goal |
| `COLLECTED` | `ARCHIVED` | 评估后放弃 |
| `ARCHIVED` | `COLLECTED` | 重新激活 |

---

## 3. Goal 目标状态机

### 3.1 状态定义 (States)

| 状态 (State) | 中文 (Chinese) | 说明 (Description) |
|--------------|----------------|--------------------|
| `PLANNING` | 规划中 | 正在定义目标 |
| `ACTIVE` | 进行中 | 目标执行中 |
| `COMPLETED` | 已完成 | 目标达成 |
| `ARCHIVED` | 已归档 | 软删除归档 |

### 3.2 转换规则 (Transitions)

| 源状态 (From) | 目标状态 (To) | 触发条件 (Trigger) |
|---------------|---------------|---------------------|
| `PLANNING` | `ACTIVE` | 目标发布 |
| `ACTIVE` | `COMPLETED` | 目标达成（actualValue ≥ targetValue） |
| `ACTIVE` | `ARCHIVED` | 目标取消（软删除） |
| `COMPLETED` | `ARCHIVED` | 归档存储 |
| `ARCHIVED` | `PLANNING` | 重新规划 |

---

## 4. Task 任务状态机

### 4.1 状态定义 (States)

| 状态 (State) | 中文 (Chinese) | 说明 (Description) |
|--------------|----------------|--------------------|
| `TODO` | 待办 | 已创建，未开始 |
| `IN_PROGRESS` | 进行中 | 正在执行 |
| `DONE` | 已完成 | 执行完成 |
| `BLOCKED` | 阻塞 | 因依赖或问题暂停 |

### 4.2 转换规则 (Transitions)

```
┌────────┐  开始执行   ┌──────────────┐
│  TODO   │ ─────────► │ IN_PROGRESS  │
└────────┘            └──────┬───────┘
     ▲                       │
     │  取消执行              │ 完成
     │                       ▼
     │                 ┌──────────┐
     │                 │   DONE   │
     │                 └──────────┘
     │                       ▲
     │                       │ 解决阻塞
     │                       │
     │            ┌──────────┴────────┐
     │            ▼                   │
     │       ┌──────────┐             │
     └──────│ BLOCKED   │─────────────┘
            └──────────┘
```

| 源状态 (From) | 目标状态 (To) | 触发条件 (Trigger) |
|---------------|---------------|---------------------|
| `TODO` | `IN_PROGRESS` | 用户开始执行 |
| `IN_PROGRESS` | `DONE` | 任务完成 |
| `IN_PROGRESS` | `BLOCKED` | 遇到阻碍 |
| `IN_PROGRESS` | `TODO` | 取消执行 |
| `BLOCKED` | `IN_PROGRESS` | 阻碍解决 |
| `BLOCKED` | `TODO` | 退回待办 |

> **AI 草稿规则：** AI 生成的任务草稿（`isDraft = true`）必须经用户确认后才能从 `TODO` 进入 `IN_PROGRESS`。

---

## 5. Issue 问题状态机

### 5.1 状态定义 (States)

| 状态 (State) | 中文 (Chinese) | 说明 (Description) |
|--------------|----------------|--------------------|
| `OPEN` | 待处理 | 问题已记录，未处理 |
| `RESOLVED` | 已解决 | 问题已通过 Suggestion/Decision 解决 |
| `IGNORED` | 已忽略 | 评估后决定不处理 |

### 5.2 转换规则 (Transitions)

| 源状态 (From) | 目标状态 (To) | 触发条件 (Trigger) |
|---------------|---------------|---------------------|
| `OPEN` | `RESOLVED` | 关联 Suggestion 转为 Task 并完成 |
| `OPEN` | `IGNORED` | 评估后决定忽略 |
| `IGNORED` | `OPEN` | 重新激活 |

---

## 6. Suggestion 建议状态机

### 6.1 状态定义 (States)

| 状态 (State) | 中文 (Chinese) | 说明 (Description) |
|--------------|----------------|--------------------|
| `PENDING` | 待采纳 | 建议已生成，未处理 |
| `ADOPTED` | 已采纳 | 已转为 Task（`isConverted = true`） |
| `REJECTED` | 已拒绝 | 评估后不采纳 |

### 6.2 转换规则 (Transitions)

| 源状态 (From) | 目标状态 (To) | 触发条件 (Trigger) |
|---------------|---------------|---------------------|
| `PENDING` | `ADOPTED` | 用户确认转为 Task |
| `PENDING` | `REJECTED` | 用户拒绝建议 |
| `REJECTED` | `PENDING` | 重新考虑 |

> **AI 权限：** AI 可生成 Suggestion 草稿，但转为真实 Task 必须由用户确认。

---

## 7. Review 复盘状态机

### 7.1 状态定义 (States)

| 状态 (State) | 中文 (Chinese) | 说明 (Description) |
|--------------|----------------|--------------------|
| `DRAFT` | 草稿 | 复盘进行中（可能由 AI 生成草稿） |
| `PUBLISHED` | 已发布 | 复盘完成，产出 Insight |
| `ARCHIVED` | 已归档 | 历史复盘归档 |

### 7.2 转换规则 (Transitions)

| 源状态 (From) | 目标状态 (To) | 触发条件 (Trigger) |
|---------------|---------------|---------------------|
| `DRAFT` | `PUBLISHED` | 完成 Insight 输出 |
| `PUBLISHED` | `ARCHIVED` | 周期结束归档 |

---

## 8. PDCAr 循环状态机 (PDCAr Cycle State Machine)

### 8.1 阶段定义 (Stages)

| 阶段 (Stage) | 中文 (Chinese) | 活跃对象 (Active Objects) |
|--------------|----------------|---------------------------|
| `PLAN` | 计划 | idea, goal, project, task |
| `DO` | 执行 | task, metric |
| `CHECK` | 检查 | issue, metric |
| `ACT` | 行动/调整 | suggestion, decision |
| `REVIEW` | 复盘 | review, insight |

### 8.2 阶段流转 (Stage Transitions)

```
┌──────┐  任务就绪  ┌────┐  指标采集  ┌───────┐  发现问题  ┌─────┐
│ PLAN │ ────────► │ DO │ ────────► │ CHECK │ ────────► │ ACT │
└──────┘           └────┘           └───────┘           └──┬──┘
   ▲                                                     │
   │                                                     │ 调整完成
   │                                                     ▼
   │           产出 Next Cycle Plan              ┌─────────┐
   │◄────────────────────────────────────────────│ REVIEW  │
                                                └─────────┘
```

| 源阶段 (From) | 目标阶段 (To) | 触发条件 (Trigger) |
|---------------|---------------|---------------------|
| `PLAN` | `DO` | Task 创建完成 |
| `DO` | `CHECK` | Metric 数据采集 |
| `CHECK` | `ACT` | Issue 识别 |
| `ACT` | `REVIEW` | Suggestion/Decision 处理完成 |
| `REVIEW` | `PLAN` | 产出 Next Cycle Plan |

---

## 9. 全局状态约束 (Global Constraints)

| 规则 ID (Rule ID) | 约束 (Constraint) |
|--------------------|--------------------|
| SM-001 | Task 只能属于一个 Project（通过 `parent_id`） |
| SM-002 | Suggestion 必须关联一个 Issue |
| SM-003 | Suggestion 转为 Task 后 `isConverted = true` |
| SM-004 | Review 必须指定 `cycleType` |
| SM-005 | Insight / Decision 必须关联一个 Review |
| SM-006 | Goal 状态为 `COMPLETED` 时不可创建新 Task |
| SM-007 | 所有状态变更写入 `activity_events` |
| SM-008 | 跨表状态变更必须使用 transaction |
| SM-009 | AI 生成的 Task/Review 草稿需用户确认才能流转 |
| SM-010 | 所有查询必须带 `workspace_id` 过滤，禁止跨 workspace |
