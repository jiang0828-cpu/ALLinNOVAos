# NOVA OS — 评分规则 (Score Rules)

> **用途 (Purpose)：**
> 定义 NOVA OS 中所有评分维度、计算公式、阈值与颜色映射。覆盖 Goal 达成度、Task 完成率、Issue 健康度、Review 质量与综合 Life Score。评分作为 Dashboard 读模型的一部分，可由 `work_items` 重建，不作为唯一事实来源。

---

## 1. 概述 (Overview)

NOVA OS 的评分体系贯穿 PDCAr 全周期，评分结果写入 `dashboard_snapshots`（读模型，可重建）：

| PDCAr 阶段 | 评分维度 (Dimension) | 衡量对象 (Target) |
|------------|---------------------|-------------------|
| P — plan | 目标达成评分 (Goal Achievement Score) | Goal |
| D — do | 任务完成评分 (Task Completion Score) | Task |
| C — check | 问题健康评分 (Issue Health Score) | Issue / Metric |
| r — review | 复盘质量评分 (Review Quality Score) | Review |
| 全周期 | 综合 Life Score (Composite Life Score) | 全部对象 |

> **数据库规则：** 评分计算必须幂等，不能使用累计方式更新进度。Dashboard Snapshot 可重建。

---

## 2. 评分维度详细定义 (Dimension Definitions)

### 2.1 目标达成评分 (Goal Achievement Score)

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 计算公式 (Formula) | `actualValue / targetValue × 100` |
| 范围 (Range) | 0 - 100 |
| 数据来源 (Source) | `goal_detail.targetValue` / `goal_detail.actualValue` |
| 阶段 (Stage) | P — plan |

### 2.2 任务完成评分 (Task Completion Score)

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 计算公式 (Formula) | `doneCount / totalCount × 100` |
| 范围 (Range) | 0 - 100 |
| 数据来源 (Source) | `work_items` 中 `type = TASK` 且 `status = DONE` 的比例 |
| 阶段 (Stage) | D — do |

### 2.3 问题健康评分 (Issue Health Score)

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 计算公式 (Formula) | `1 - (openHighIssueCount / totalIssueCount) × 100` |
| 范围 (Range) | 0 - 100 |
| 数据来源 (Source) | `issue_detail.level` + `work_items.status` |
| 阶段 (Stage) | C — check |
| 说明 (Note) | metric 维度作为 issue 的检查输入 |

### 2.4 复盘质量评分 (Review Quality Score)

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 计算公式 (Formula) | 基于 Insight / Decision 产出数量与质量 |
| 范围 (Range) | 0 - 100 |
| 数据来源 (Source) | `review_detail.score` |
| 阶段 (Stage) | r — review |

### 2.5 综合 Life Score (Composite Life Score)

| 属性 (Attribute) | 内容 (Content) |
|------------------|----------------|
| 计算公式 (Formula) | 加权平均（见 3.2） |
| 范围 (Range) | 0 - 100 |
| 数据来源 (Source) | 全部对象聚合 |
| 阶段 (Stage) | 全周期 |
| 存储 (Storage) | `dashboard_snapshots.payload`（读模型） |

---

## 3. 评分计算 (Score Calculation)

### 3.1 分项指标 (Breakdown Dimensions)

Life Score 由五个分项指标加权构成：

| 分项 (Dimension) | 中文 (Chinese) | 权重 (Weight) |
|------------------|----------------|---------------|
| Health | 健康 | 20% |
| Wealth | 财富 | 20% |
| Work | 工作 | 20% |
| Content | 内容 | 20% |
| Learning | 学习 | 20% |

### 3.2 综合评分公式 (Composite Formula)

```
Life Score = Σ(dimensionScore × weight)
```

示例：
```
健康 78 × 0.20 = 15.6
财富 84 × 0.20 = 16.8
工作 72 × 0.20 = 14.4
内容 88 × 0.20 = 17.6
学习 76 × 0.20 = 15.2
────────────────────
Life Score = 79.6 ≈ 80
```

---

## 4. 颜色阈值 (Color Thresholds)

### 4.1 Life Score 颜色映射

| 分数区间 (Range) | 颜色 (Color) | Token | 色值 (Value) | 语义 (Meaning) |
|------------------|--------------|-------|--------------|----------------|
| ≥ 80 | 深绿 (Dark Green) | `--accent` | `#178a6f` | 优秀 (Excellent) |
| 60 - 79 | 金色 (Gold) | `--accent-gold` | `#d59a2f` | 注意 (Watch) |
| < 60 | 红色 (Red) | `--danger` | `#bb4d35` | 危险 (Danger) |

### 4.2 优先级颜色映射 (Priority Color Mapping)

| 优先级 (Priority) | 颜色 (Color) | Token | 语义 (Meaning) |
|-------------------|--------------|-------|----------------|
| `P0` | 深绿 (Dark Green) | `--brand` | 关键 (Critical) |
| `P1` | 柔绿 (Soft Green) | `--brand-soft` | 重要 (Important) |
| `P2` | 金色 (Gold) | `--gold-bg` | 一般 (Normal) |

### 4.3 问题级别颜色映射 (Issue Level Color Mapping)

| 级别 (Level) | 颜色 (Color) | Token | 语义 (Meaning) |
|--------------|--------------|-------|----------------|
| `HIGH` | 红色 (Red) | `--danger` | 高风险 |
| `MEDIUM` | 金色 (Gold) | `--accent-gold` | 中风险 |
| `LOW` | 绿色 (Green) | `--accent` | 低风险 |

---

## 5. 阈值汇总 (Threshold Summary)

| 指标 (Metric) | 优秀 (Excellent) | 注意 (Watch) | 危险 (Danger) |
|---------------|------------------|--------------|---------------|
| Life Score | ≥ 80 | 60 - 79 | < 60 |
| Goal 达成度 | ≥ 80 | 60 - 79 | < 60 |
| Task 完成率 | ≥ 80 | 60 - 79 | < 60 |
| Issue 健康度 | ≥ 80 | 60 - 79 | < 60 |
| Review 质量 | ≥ 80 | 60 - 79 | < 60 |
| Project 进度 | ≥ 75 | 50 - 74 | < 50 |

---

## 6. 评分实现约束 (Implementation Constraints)

依据数据库规则，评分实现需遵循：

| 规则 ID | 约束 (Constraint) |
|---------|--------------------|
| SC-001 | 异步计算必须幂等，不能累计更新进度 |
| SC-002 | Dashboard Snapshot 可重建，不作为唯一事实来源 |
| SC-003 | 评分数据来源于 `work_items` + detail 表 |
| SC-004 | 跨表写入必须使用 transaction |
| SC-005 | **AI 不能直接修改评分规则**（AI 权限规则 3） |

### 伪代码 (Pseudo Code)

```typescript
// 获取分数颜色 (Get Score Color)
function getScoreColor(score: number): string {
  if (score >= 80) return '#178a6f';   // 深绿 Dark Green
  if (score >= 60) return '#d59a2f';   // 金色 Gold
  return '#bb4d35';                    // 红色 Red
}

// 计算 Life Score (幂等计算，非累计)
function calculateLifeScore(breakdown: BreakdownItem[]): number {
  const weights: Record<string, number> = {
    '健康': 0.2, '财富': 0.2, '工作': 0.2, '内容': 0.2, '学习': 0.2
  };
  return Math.round(
    breakdown.reduce((sum, item) => sum + item.value * weights[item.label], 0)
  );
}
```

---

## 7. 评分演进 (Score Evolution)

| 阶段 (Phase) | 评分方式 (Method) | 说明 |
|--------------|-------------------|------|
| Phase 1 | 全量计算 (Full Compute) | 基于 work_items 实时计算 |
| Phase 2 | Snapshot 缓存 (Snapshot Cache) | 定时重建 dashboard_snapshots |
| Phase 3 | 历史追踪 (Historical) | 支持趋势对比 |
| Phase 4 | AI 辅助评估 (AI Assisted) | AI 建议（不可改规则） |
| Phase 5 | 自动化评分 (Automated) | BullMQ 幂等实时评分 |
