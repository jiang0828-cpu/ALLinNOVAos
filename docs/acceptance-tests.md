# NOVA OS — 验收测试 (Acceptance Tests)

> **用途 (Purpose)：**
> 定义 NOVA OS 的验收标准与测试用例，覆盖 PDCAr 循环、核心业务链路、数据库规则、状态机、评分规则与 AI 权限边界。所有 P0 用例必须通过后方可合并至 `main` 分支。

---

## 1. 概述 (Overview)

### 1.1 测试覆盖矩阵 (Coverage Matrix)

| 维度 (Dimension) | 用例数 (Count) | 优先级 (Priority) |
|------------------|----------------|-------------------|
| PDCAr 循环 (PDCAr Cycle) | 5 | P0 |
| 业务链路 (Business Chain) | 10 | P0 |
| 数据库规则 (Database Rules) | 12 | P0 |
| 状态机 (State Machine) | 8 | P0 |
| 评分规则 (Score Rules) | 6 | P1 |
| AI 权限 (AI Permission) | 5 | P0 |

### 1.2 通过标准 (Pass Criteria)

| 级别 (Level) | 标准 (Criteria) |
|--------------|-----------------|
| Blocker (阻塞) | 全部 P0 用例通过 |
| Important (重要) | 全部 P1 用例通过 |
| Nice-to-have (可选) | P2 用例通过 |

---

## 2. PDCAr 循环验收 (PDCAr Cycle Acceptance)

| 用例 ID (Case ID) | 测试场景 (Scenario) | 预期结果 (Expected) |
|-------------------|---------------------|---------------------|
| AT-PDCA-001 | P — plan 阶段产出 idea/goal/project/task | 对象创建成功，type 正确 |
| AT-PDCA-002 | D — do 阶段采集 metric 数据 | issue_detail.metricActualValue 写入 |
| AT-PDCA-003 | C — check 阶段识别 issue | issue 状态为 `OPEN` |
| AT-PDCA-004 | A — act 阶段生成 suggestion + decision | 对象创建并关联 issue |
| AT-PDCA-005 | r — review 阶段产出 insight | review 状态为 `PUBLISHED`，insight 关联 review |

---

## 3. 业务链路验收 (Business Chain Acceptance)

### 3.1 正向链路 (Forward Chain)

| 用例 ID (Case ID) | 测试场景 (Scenario) | 预期结果 (Expected) |
|-------------------|---------------------|---------------------|
| AT-CHAIN-001 | Idea → Goal 转化 | idea 状态 `CONVERTED`，goal 创建 |
| AT-CHAIN-002 | Goal → Project 拆解 | project 关联 goalId |
| AT-CHAIN-003 | Project → Task 拆解 | task 关联 projectId（parent_id） |
| AT-CHAIN-004 | Task → Issue 识别 | issue 关联 taskId |
| AT-CHAIN-005 | Issue → Suggestion 生成 | suggestion 关联 issueId |

### 3.2 反向链路 (Reverse Chain)

| 用例 ID (Case ID) | 测试场景 (Scenario) | 预期结果 (Expected) |
|-------------------|---------------------|---------------------|
| AT-CHAIN-006 | Suggestion → Task 转换 | isConverted = true，convertedTaskId 写入 |
| AT-CHAIN-007 | Suggestion/Decision → Review 触发 | review 创建 |
| AT-CHAIN-008 | Review → Insight 产出 | insight 关联 reviewId |
| AT-CHAIN-009 | Review → Decision 产出 | decision 关联 reviewId |
| AT-CHAIN-010 | Decision → Next Cycle Plan | 新 Goal/Project 创建（回到 plan） |

---

## 4. 数据库规则验收 (Database Rules Acceptance)

| 用例 ID (Case ID) | 规则 (Rule) | 测试场景 (Scenario) | 预期结果 (Expected) |
|-------------------|-------------|---------------------|---------------------|
| AT-DB-001 | 规则 1 | Dashboard 作为读模型 | 数据来源 work_items，非 snapshot |
| AT-DB-002 | 规则 2 | 核心对象使用 work_items 主表 | 9 类对象均写入 work_items |
| AT-DB-003 | 规则 3 | 各对象使用 detail 表 | 特有字段在对应 detail 表 |
| AT-DB-004 | 规则 4 | 数据必须属于 workspace | workspace_id 必填 |
| AT-DB-005 | 规则 5 | 禁止跨 workspace 关联 | 跨 workspace 查询被拒绝 |
| AT-DB-006 | 规则 6 | UUID 外键关联 | 禁止用 title 关联 |
| AT-DB-007 | 规则 7 | 核心对象软删除 | deletedAt 设置，记录保留 |
| AT-DB-008 | 规则 8 | Prisma Migration | Schema 改动有 migration 文件 |
| AT-DB-009 | 规则 9 | 跨表写入使用 transaction | 跨表操作原子性保证 |
| AT-DB-010 | 规则 10 | 异步计算幂等 | 重复执行结果一致，非累计 |
| AT-DB-011 | 规则 11 | Dashboard Snapshot 可重建 | 删除后可从 work_items 重建 |
| AT-DB-012 | 规则 12 | 重要操作写入 activity_events | CREATE/UPDATE/DELETE/CONVERT/PUBLISH 记录 |

---

## 5. 状态机验收 (State Machine Acceptance)

| 用例 ID (Case ID) | 实体 (Entity) | 测试场景 (Scenario) | 预期结果 (Expected) |
|-------------------|---------------|---------------------|---------------------|
| AT-SM-001 | Idea | COLLECTED → CONVERTED | 转化为 Goal 成功 |
| AT-SM-002 | Task | TODO → IN_PROGRESS → DONE | 状态转换成功 |
| AT-SM-003 | Task | 非法转换 TODO → DONE | 转换被拒绝 |
| AT-SM-004 | Goal | ACTIVE → COMPLETED | actualValue ≥ targetValue |
| AT-SM-005 | Issue | OPEN → RESOLVED | 关联 Suggestion 转 Task 完成 |
| AT-SM-006 | Suggestion | PENDING → ADOPTED | isConverted = true |
| AT-SM-007 | Review | DRAFT → PUBLISHED | 产出 Insight |
| AT-SM-008 | 通用 | 状态变更写入 activity_events | activity_events 有记录 |

---

## 6. 评分规则验收 (Score Rules Acceptance)

| 用例 ID (Case ID) | 测试场景 (Scenario) | 输入 (Input) | 预期结果 (Expected) |
|-------------------|---------------------|--------------|---------------------|
| AT-SCORE-001 | 高分绿色 | score = 82 | 颜色 `#178a6f` |
| AT-SCORE-002 | 中分金色 | score = 70 | 颜色 `#d59a2f` |
| AT-SCORE-003 | 低分红色 | score = 55 | 颜色 `#bb4d35` |
| AT-SCORE-004 | 综合分计算 | 五项均为 80 | Life Score = 80 |
| AT-SCORE-005 | 幂等计算 | 重复执行评分 | 结果一致，非累计 |
| AT-SCORE-006 | Snapshot 重建 | 删除 snapshot | 可从 work_items 重建 |

---

## 7. AI 权限验收 (AI Permission Acceptance)

| 用例 ID (Case ID) | 规则 (Rule) | 测试场景 (Scenario) | 预期结果 (Expected) |
|-------------------|-------------|---------------------|---------------------|
| AT-AI-001 | 规则 1 | AI 生成 suggestion/review draft/task draft | 草稿创建成功 |
| AT-AI-002 | 规则 2 | AI 尝试删除数据 | 操作被拒绝 |
| AT-AI-003 | 规则 3 | AI 修改目标值/评分规则/历史记录 | 操作被拒绝 |
| AT-AI-004 | 规则 4 | AI 创建真实任务 | 需用户确认后才生效 |
| AT-AI-005 | 规则 5 | 发送健康/财务敏感数据到外部 AI | 默认拦截 |

---

## 8. 命名规范验收 (Naming Convention Acceptance)

| 用例 ID (Case ID) | 测试场景 (Scenario) | 预期结果 (Expected) |
|-------------------|---------------------|---------------------|
| AT-NAMING-001 | 字段名为 camelCase | `goalId` 而非 `goal_id`（API 层） |
| AT-NAMING-002 | 表名为 snake_case | `work_items`、`activity_events` |
| AT-NAMING-003 | 列名为 snake_case | `goal_id`、`created_at` |
| AT-NAMING-004 | 枚举值为 UPPER_SNAKE_CASE | `TODO`、`IN_PROGRESS` |

---

## 9. 回归测试清单 (Regression Checklist)

每次代码变更后必须回归以下核心场景：

- [ ] PDCAr 五阶段完整循环
- [ ] Idea → Next Cycle Plan 全链路
- [ ] work_items 主表 + 9 类 detail 表
- [ ] workspace 隔离，禁止跨 workspace
- [ ] UUID 外键，软删除
- [ ] Prisma Migration + transaction
- [ ] 异步计算幂等
- [ ] Dashboard Snapshot 可重建
- [ ] activity_events 审计记录
- [ ] AI 权限边界（不可删除/改规则/需确认）
- [ ] 评分颜色阈值正确
- [ ] 构建成功无错误

---

## 10. 验收通过标准 (Acceptance Criteria)

### 10.1 强制通过 (Blocker)
- 全部 P0 用例通过（PDCAr / 业务链路 / 数据库规则 / 状态机 / AI 权限）
- 构建成功，无控制台 Error
- Prisma Migration 通过

### 10.2 建议通过 (Important)
- 全部 P1 用例通过（评分规则 / 命名规范）
- Jest + Supertest 测试覆盖率 > 80%

### 10.3 可选通过 (Nice-to-have)
- 性能指标全部达标
- Dashboard Snapshot 重建性能 < 2s
