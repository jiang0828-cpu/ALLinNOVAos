# NOVA OS — AI Development Rules (AI 辅助开发规则)

> **用途 (Purpose)：**
> 定义 NOVA OS 项目的技术栈、PDCAr 阶段映射、核心对象类型、数据库规则与 AI 权限规则。是所有 AI 辅助开发行为的「最高约束」，技术选型、数据建模、权限边界均以此为准。

---

## 1. 技术栈 (Tech Stack)

| 层级 (Layer) | 选型 (Choice) | 说明 (Description) |
|--------------|---------------|---------------------|
| Backend (后端) | NestJS + TypeScript | REST API 服务 |
| Frontend (前端) | Next.js + TypeScript | SSR/SSG 前端应用 |
| Database (数据库) | PostgreSQL 16 | 主数据存储 |
| ORM | Prisma | 类型安全 ORM + Migration |
| Cache & Queue (缓存与队列) | Redis + BullMQ | 缓存与异步任务队列 |
| API Style (API 风格) | REST API | 统一 RESTful 接口 |
| Testing (测试) | Jest + Supertest | 单元测试 + 接口测试 |
| ID | UUID | 全局唯一标识 |
| Timestamp (时间戳) | UTC TIMESTAMPTZ | 统一 UTC 时间存储 |

---

## 2. PDCAr 阶段 (PDCAr Stages)

| 代号 (Code) | 英文 (English) | 中文 (Chinese) |
|-------------|----------------|----------------|
| P | plan | 计划 |
| D | do | 执行 |
| C | check | 检查 |
| A | act | 行动/调整 |
| r | review | 复盘 |

---

## 3. 核心对象类型 (Core Object Types)

| 对象 (Object) | 中文 (Chinese) | 表名 (Table, snake_case) |
|---------------|----------------|--------------------------|
| goal | 目标 | `goal` |
| project | 项目 | `project` |
| task | 任务 | `task` |
| idea | 想法 | `idea` |
| issue | 问题 | `issue` |
| suggestion | 建议 | `suggestion` |
| review | 复盘 | `review` |
| insight | 洞察 | `insight` |
| decision | 决策 | `decision` |

---

## 4. PDCAr 映射 (PDCAr Mapping)

| PDCAr 阶段 (Stage) | 对象类型 (Object Types) |
|--------------------|-------------------------|
| plan (计划) | goal / project / idea |
| do (执行) | task |
| check (检查) | issue / metric |
| act (行动/调整) | suggestion / decision |
| review (复盘) | review / insight |

---

## 5. 数据库规则 (Database Rules)

1. **Dashboard 是读模型，不是事实数据源。**
   Dashboard is a read model, not the source of truth.

2. **所有核心业务对象使用 `work_items` 统一主表。**
   All core business objects share a unified `work_items` master table.

3. **任务、目标、项目、建议、复盘使用各自 detail 表。**
   Task, goal, project, suggestion, review each use their own detail table.

4. **所有业务数据必须属于 workspace。**
   All business data must belong to a workspace.

5. **不允许跨 workspace 查询或建立关联。**
   Cross-workspace queries or associations are not allowed.

6. **使用 UUID 进行外键关联，不允许用 title 关联。**
   Use UUID for foreign key associations; title-based association is prohibited.

7. **核心对象只允许软删除，不允许物理删除。**
   Core objects support soft delete only; physical delete is prohibited.

8. **每一次 Schema 改动必须创建 Prisma Migration。**
   Every schema change must create a Prisma Migration.

9. **每一次跨表写入必须使用 transaction。**
   Every cross-table write must use a transaction.

10. **异步计算必须幂等，不能使用累计方式更新进度。**
    Async computation must be idempotent; progress must not be updated cumulatively.

11. **Dashboard Snapshot 可以重建，不能成为唯一事实来源。**
    Dashboard Snapshot is rebuildable and must not be the single source of truth.

12. **所有重要操作写入 `activity_events`。**
    All important operations must be written to `activity_events`.

---

## 6. AI 权限规则 (AI Permission Rules)

1. **AI 可以生成建议、复盘草稿和任务草稿。**
   AI may generate suggestions, review drafts, and task drafts.

2. **AI 不能直接删除数据。**
   AI must not delete data directly.

3. **AI 不能直接修改目标值、评分规则和历史记录。**
   AI must not modify target values, scoring rules, or historical records directly.

4. **AI 创建真实任务前必须由用户确认。**
   AI must obtain user confirmation before creating real tasks.

5. **默认不将原始健康、财务敏感数据发送到外部 AI。**
   Raw health and financial sensitive data must not be sent to external AI by default.

---

## 7. 命名规范补充 (Naming Conventions)

| 对象 (Object) | 规范 (Convention) | 示例 (Example) |
|---------------|-------------------|----------------|
| 字段名 (Field Name) | camelCase | `goalId`、`taskStatus` |
| 数据库表名 (Table Name) | snake_case | `work_items`、`activity_events` |
| 数据库列名 (Column Name) | snake_case | `goal_id`、`created_at` |
| 枚举值 (Enum Value) | UPPER_SNAKE_CASE | `TODO`、`IN_PROGRESS` |
| 组件名 (Component) | PascalCase | `GoalCard`、`TaskList` |
