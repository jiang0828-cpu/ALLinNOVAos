# NOVA OS — 数据字典 (Data Dictionary)

> **用途 (Purpose)：**
> 定义 NOVA OS 全部业务实体的字段、类型、约束与枚举值。基于 `work_items` 统一主表 + 各对象 detail 表架构，所有数据归属 workspace。字段命名采用 camelCase，数据库表名/列名采用 snake_case。本文档是数据层的「契约」。

---

## 1. 命名规范 (Naming Conventions)

| 对象 (Object) | 规范 (Convention) | 示例 (Example) |
|---------------|-------------------|----------------|
| 字段名 (Field Name, API/前端) | camelCase | `goalId`、`taskStatus` |
| 数据库表名 (Table Name) | snake_case | `work_items`、`activity_events` |
| 数据库列名 (Column Name) | snake_case | `goal_id`、`created_at` |
| 枚举值 (Enum Value) | UPPER_SNAKE_CASE | `TODO`、`IN_PROGRESS` |
| 布尔字段 (Boolean Field) | is/has 前缀 | `isCompleted`、`hasIssue` |
| 主键 (Primary Key) | UUID | `id` |
| 时间戳 (Timestamp) | UTC TIMESTAMPTZ | `created_at`、`updated_at` |

---

## 2. 核心对象类型 (Core Object Types)

| 对象 (Object) | 中文 (Chinese) | detail 表 (Table) | PDCAr 阶段 |
|---------------|----------------|-------------------|------------|
| goal | 目标 | `goal_detail` | plan |
| project | 项目 | `project_detail` | plan |
| task | 任务 | `task_detail` | do |
| idea | 想法 | `idea_detail` | plan |
| issue | 问题 | `issue_detail` | check |
| suggestion | 建议 | `suggestion_detail` | act |
| review | 复盘 | `review_detail` | review |
| insight | 洞察 | `insight_detail` | review |
| decision | 决策 | `decision_detail` | act |

> `metric` 作为 check 阶段的检查维度，依附于 issue 或 task，不作为独立核心对象类型。

---

## 3. 统一主表 work_items (Unified Master Table)

所有核心业务对象共享 `work_items` 主表，存储公共字段。

| 列名 (Column) | 类型 (Type) | 必填 (Required) | 说明 (Description) |
|---------------|-------------|-----------------|---------------------|
| `id` | UUID | ✅ | 主键 (Primary Key) |
| `workspace_id` | UUID | ✅ | 所属工作空间 (Workspace) |
| `type` | enum | ✅ | 对象类型：`GOAL` / `PROJECT` / `TASK` / `IDEA` / `ISSUE` / `SUGGESTION` / `REVIEW` / `INSIGHT` / `DECISION` |
| `title` | string | ✅ | 标题（展示用，不可作外键） |
| `status` | enum | ✅ | 通用状态（见各对象状态机） |
| `parent_id` | UUID | ❌ | 父对象 ID（用于 Goal→Project→Task 层级） |
| `created_at` | TIMESTAMPTZ | ✅ | 创建时间 (UTC) |
| `updated_at` | TIMESTAMPTZ | ✅ | 更新时间 (UTC) |
| `deleted_at` | TIMESTAMPTZ | ❌ | 软删除时间（null 表示未删除） |

**约束 (Constraints)：**
- `workspace_id` 必填，所有查询必须带 workspace 过滤
- 禁止跨 `workspace_id` 建立关联
- 外键关联一律使用 UUID，禁止用 `title` 关联
- 核心对象只允许软删除（设置 `deleted_at`），不允许物理删除

---

## 4. Detail 表字段定义 (Detail Table Fields)

### 4.1 goal_detail — 目标详情

| 字段 (Field, camelCase) | 列名 (Column, snake_case) | 类型 (Type) | 说明 (Description) |
|-------------------------|---------------------------|-------------|---------------------|
| `targetValue` | `target_value` | number | 目标值 |
| `actualValue` | `actual_value` | number | 实际值 |
| `priority` | `priority` | enum | `P0` / `P1` / `P2` |
| `startDate` | `start_date` | TIMESTAMPTZ | 开始日期 |
| `dueDate` | `due_date` | TIMESTAMPTZ | 截止日期 |

### 4.2 project_detail — 项目详情

| 字段 (Field) | 列名 (Column) | 类型 (Type) | 说明 (Description) |
|--------------|---------------|-------------|---------------------|
| `goalId` | `goal_id` | UUID | 关联目标 ID |
| `summary` | `summary` | string | 项目摘要 |
| `progress` | `progress` | number (0-100) | 进度百分比 |

### 4.3 task_detail — 任务详情

| 字段 (Field) | 列名 (Column) | 类型 (Type) | 说明 (Description) |
|--------------|---------------|-------------|---------------------|
| `projectId` | `project_id` | UUID | 关联项目 ID |
| `priority` | `priority` | enum | `P0` / `P1` / `P2` |
| `eta` | `eta` | string | 预估时间 |
| `assignee` | `assignee` | string | 执行人 |
| `isDraft` | `is_draft` | boolean | 是否 AI 生成草稿（需用户确认） |

### 4.4 idea_detail — 想法详情

| 字段 (Field) | 列名 (Column) | 类型 (Type) | 说明 (Description) |
|--------------|---------------|-------------|---------------------|
| `content` | `content` | string | 想法内容 |
| `tags` | `tags` | string[] | 标签数组 |
| `convertedToGoalId` | `converted_to_goal_id` | UUID | 转化后的目标 ID（null 表示未转化） |

### 4.5 issue_detail — 问题详情

| 字段 (Field) | 列名 (Column) | 类型 (Type) | 说明 (Description) |
|--------------|---------------|-------------|---------------------|
| `taskId` | `task_id` | UUID | 关联任务 ID |
| `metricName` | `metric_name` | string | 关联指标名称（metric 维度） |
| `metricTargetValue` | `metric_target_value` | number | 指标目标值 |
| `metricActualValue` | `metric_actual_value` | number | 指标实际值 |
| `level` | `level` | enum | `HIGH` / `MEDIUM` / `LOW` |
| `description` | `description` | string | 问题描述 |

### 4.6 suggestion_detail — 建议详情

| 字段 (Field) | 列名 (Column) | 类型 (Type) | 说明 (Description) |
|--------------|---------------|-------------|---------------------|
| `issueId` | `issue_id` | UUID | 关联问题 ID |
| `reason` | `reason` | string | 推荐原因 |
| `priority` | `priority` | enum | `P0` / `P1` / `P2` |
| `source` | `source` | string | 来源说明 |
| `isConverted` | `is_converted` | boolean | 是否已转为 Task |
| `convertedTaskId` | `converted_task_id` | UUID | 转换后的任务 ID |

### 4.7 review_detail — 复盘详情

| 字段 (Field) | 列名 (Column) | 类型 (Type) | 说明 (Description) |
|--------------|---------------|-------------|---------------------|
| `cycleType` | `cycle_type` | enum | `DAILY` / `WEEKLY` / `MONTHLY` / `QUARTERLY` |
| `period` | `period` | string | 复盘周期标识（如 `2026-W32`） |
| `summary` | `summary` | string | 复盘总结 |
| `score` | `score` | number (0-100) | 复盘评分 |
| `isDraft` | `is_draft` | boolean | 是否 AI 生成草稿 |

### 4.8 insight_detail — 洞察详情

| 字段 (Field) | 列名 (Column) | 类型 (Type) | 说明 (Description) |
|--------------|---------------|-------------|---------------------|
| `reviewId` | `review_id` | UUID | 关联复盘 ID |
| `content` | `content` | string | 洞察内容 |
| `tags` | `tags` | string[] | 标签数组 |

### 4.9 decision_detail — 决策详情

| 字段 (Field) | 列名 (Column) | 类型 (Type) | 说明 (Description) |
|--------------|---------------|-------------|---------------------|
| `reviewId` | `review_id` | UUID | 关联复盘 ID |
| `content` | `content` | string | 决策内容 |
| `impact` | `impact` | enum | `HIGH` / `MEDIUM` / `LOW` |

---

## 5. 辅助表 (Auxiliary Tables)

### 5.1 workspace — 工作空间

| 列名 (Column) | 类型 (Type) | 说明 (Description) |
|---------------|-------------|---------------------|
| `id` | UUID | 主键 |
| `name` | string | 工作空间名称 |
| `owner_id` | UUID | 所有者 ID |
| `created_at` | TIMESTAMPTZ | 创建时间 |

### 5.2 activity_events — 审计日志

所有重要操作写入此表（数据库规则 12）。

| 列名 (Column) | 类型 (Type) | 说明 (Description) |
|---------------|-------------|---------------------|
| `id` | UUID | 主键 |
| `workspace_id` | UUID | 所属工作空间 |
| `work_item_id` | UUID | 关联对象 ID |
| `action` | enum | 操作类型：`CREATE` / `UPDATE` / `DELETE` / `CONVERT` / `PUBLISH` |
| `actor` | string | 操作者（用户或 `AI`） |
| `metadata` | JSONB | 变更详情 |
| `created_at` | TIMESTAMPTZ | 操作时间 |

### 5.3 dashboard_snapshots — Dashboard 读模型

Dashboard 是读模型，Snapshot 可重建（数据库规则 11）。

| 列名 (Column) | 类型 (Type) | 说明 (Description) |
|---------------|-------------|---------------------|
| `id` | UUID | 主键 |
| `workspace_id` | UUID | 所属工作空间 |
| `payload` | JSONB | 聚合后的 Dashboard 数据 |
| `rebuilded_at` | TIMESTAMPTZ | 最近重建时间 |

---

## 6. 枚举值汇总 (Enum Summary)

### 6.1 work_items.type（对象类型）
`GOAL` / `PROJECT` / `TASK` / `IDEA` / `ISSUE` / `SUGGESTION` / `REVIEW` / `INSIGHT` / `DECISION`

### 6.2 priority（优先级）
`P0`（关键 Critical）/ `P1`（重要 Important）/ `P2`（一般 Normal）

### 6.3 issueLevel（问题级别）
`HIGH` / `MEDIUM` / `LOW`

### 6.4 cycleType（周期类型）
`DAILY` / `WEEKLY` / `MONTHLY` / `QUARTERLY`

### 6.5 activity_events.action（操作类型）
`CREATE` / `UPDATE` / `DELETE` / `CONVERT` / `PUBLISH`

---

## 7. 数据库规则要点 (Database Rules Summary)

1. Dashboard 是读模型，不是事实数据源
2. 所有核心业务对象使用 `work_items` 统一主表
3. 各对象使用各自 detail 表
4. 所有业务数据必须属于 workspace
5. 禁止跨 workspace 查询或建立关联
6. 使用 UUID 外键关联，禁止用 title 关联
7. 核心对象只允许软删除，不允许物理删除
8. 每次 Schema 改动必须创建 Prisma Migration
9. 每次跨表写入必须使用 transaction
10. 异步计算必须幂等，不能累计更新进度
11. Dashboard Snapshot 可重建，不能成为唯一事实来源
12. 所有重要操作写入 `activity_events`
