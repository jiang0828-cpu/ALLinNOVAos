const { Pool } = require('pg');
const crypto = require('crypto');

const WORKSPACE_ID = 'ws_default';
const PAGE_LIMIT = 50;

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is not configured');
    error.statusCode = 503;
    throw error;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return pool;
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function ok(res, data, status = 200) {
  res.status(status).json({ code: status, message: 'OK', data });
}

function parseJson(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

function normalizePath(req) {
  const url = new URL(req.url, 'http://nova.local');
  const rewrittenPath = url.searchParams.get('path');
  if (rewrittenPath) {
    return {
      pathname: `/${rewrittenPath}`.replace(/\/+/g, '/'),
      searchParams: url.searchParams,
    };
  }

  const pathname = url.pathname.replace(/^\/api/, '') || '/';
  return { pathname, searchParams: url.searchParams };
}

function toIso(value) {
  if (!value) return value;
  return value instanceof Date ? value.toISOString() : value;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function priority(value, fallback = 'P2') {
  if (['P0', 'P1', 'P2'].includes(value)) return value;
  if (value === 'P3') return 'P2';
  return fallback;
}

function workItemStatusFor(type, status, fallback) {
  if (type === 'ISSUE') {
    if (status === 'OPEN') return 'BLOCKED';
    if (status === 'RESOLVED') return 'DONE';
    if (status === 'IGNORED') return 'ARCHIVED';
  }

  if (type === 'SUGGESTION') {
    if (status === 'PENDING') return 'TODO';
    if (status === 'ACCEPTED') return 'DONE';
    if (status === 'DEFERRED') return 'TODO';
    if (status === 'DISMISSED' || status === 'EXPIRED') return 'ARCHIVED';
  }

  return status || fallback;
}

function listResponse(rows, page, limit, total) {
  return {
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function workItem(row, detailKey) {
  const detail = row.detail || {};
  const item = {
    id: row.id,
    workspaceId: row.workspace_id,
    domainId: row.domain_id,
    cycleId: row.cycle_id,
    itemType: row.itemType,
    pdcaStage: row.pdcaStage,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    ownerId: row.ownerId,
    createdBy: row.createdBy,
    sourceType: row.sourceType,
    externalRef: row.externalRef,
    plannedStartAt: toIso(row.planned_start_at),
    plannedEndAt: toIso(row.planned_end_at),
    completedAt: toIso(row.completed_at),
    metadata: row.metadata || {},
    parentId: row.parent_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: toIso(row.deleted_at),
  };

  if (detailKey === 'goalDetail') {
    item.goalDetail = {
      id: detail.id,
      workItemId: detail.work_item_id,
      targetValue: detail.target_value,
      currentValue: detail.current_value,
      unit: detail.unit,
      progress: Number(detail.progress || 0),
      weight: detail.weight,
      targetDate: toIso(detail.target_date),
    };
  }

  if (detailKey === 'projectDetail') {
    item.projectDetail = {
      id: detail.id,
      workItemId: detail.work_item_id,
      progress: Number(detail.progress || 0),
      healthStatus: detail.health_status || 'ON_TRACK',
      budget: detail.budget,
      actualCost: detail.actual_cost,
    };
  }

  if (detailKey === 'taskDetail') {
    item.projectId = item.metadata?.projectId;
    item.goalId = item.metadata?.goalId;
    item.dueAt = toIso(detail.due_at);
    item.taskDetail = {
      id: detail.id,
      workItemId: detail.work_item_id,
      dueAt: toIso(detail.due_at),
      scheduledStartAt: toIso(detail.scheduled_start_at),
      scheduledEndAt: toIso(detail.scheduled_end_at),
      estimatedMinutes: detail.estimated_minutes,
      actualMinutes: detail.actual_minutes,
      completionNote: detail.completion_note,
    };
  }

  if (detailKey === 'issueDetail') {
    item.issueDetail = {
      id: detail.id,
      workItemId: detail.work_item_id,
      taskId: detail.task_id,
      metricName: detail.metric_name,
      metricTargetValue: detail.metric_target_value,
      metricActualValue: detail.metric_actual_value,
      level: detail.level || 'MEDIUM',
      description: detail.description,
      status: detail.status || 'OPEN',
      expectedValue: detail.expected_value,
      actualValue: detail.actual_value,
      gapValue: detail.gap_value,
      severity: detail.severity,
      detectedAt: toIso(detail.detected_at),
      gapType: detail.gap_type,
    };
  }

  if (detailKey === 'suggestionDetail') {
    item.suggestionDetail = {
      id: detail.id,
      workItemId: detail.work_item_id,
      suggestionType: detail.suggestion_type,
      confidence: detail.confidence,
      impactScore: detail.impactScore,
      urgencyScore: detail.urgencyScore,
      evidence: detail.evidence,
      dedupKey: detail.dedup_key,
      expiresAt: toIso(detail.expires_at),
      acceptedAt: toIso(detail.accepted_at),
      dismissedAt: toIso(detail.dismissed_at),
      deferredAt: toIso(detail.deferred_at),
      expiredAt: toIso(detail.expired_at),
      sourceType: detail.source_type,
      sourceRefId: detail.source_ref_id,
      issueId: detail.issue_id,
      reason: detail.reason,
      priority: detail.priority,
      source: detail.source,
      isConverted: detail.is_converted,
      convertedTaskId: detail.converted_task_id,
      status: detail.status,
    };
  }

  if (detailKey === 'reviewDetail') {
    item.reviewDetail = {
      id: detail.id,
      workItemId: detail.work_item_id,
      reviewType: detail.review_type,
      cycleType: detail.cycle_type,
      period: detail.period,
      summary: detail.summary,
      achievements: detail.achievements,
      challenges: detail.challenges,
      rootCauses: detail.root_causes,
      lessonsLearned: detail.lessons_learned,
      nextCycleFocus: detail.next_cycle_focus,
      scoreBefore: detail.score_before,
      scoreAfter: detail.score_after,
      score: detail.score,
      completionRate: detail.completion_rate,
      reviewedBy: detail.reviewed_by,
      reviewedAt: toIso(detail.reviewed_at),
      isDraft: detail.is_draft,
      status: detail.status,
      aggregatedData: detail.aggregated_data,
    };
  }

  return item;
}

async function ensureWorkspace(client, workspaceId = WORKSPACE_ID) {
  await client.query(
    `insert into workspace (id, name, type, timezone, created_at, updated_at)
     values ($1, 'NOVA OS Workspace', 'PERSONAL', 'Asia/Shanghai', now(), now())
     on conflict (id) do update set updated_at = now()`,
    [workspaceId]
  );

  const domains = [
    ['health', '健康'],
    ['wealth', '财富'],
    ['work', '工作'],
    ['content', '生活'],
    ['learning', '学习'],
    ['agi', 'AGI'],
    ['media', '市场'],
    ['other', '其他'],
  ];

  for (const [domainId, name] of domains) {
    await client.query(
      `insert into domain (id, workspace_id, name, description, created_at, updated_at)
       values ($1, $2, $3, $4, now(), now())
       on conflict (workspace_id, name) do update set updated_at = now()`,
      [domainId, workspaceId, name, `${name}领域`]
    );
  }
}

function inferCycleType(cycleId) {
  const value = String(cycleId || '').toUpperCase();
  if (value.includes('DAILY') || value === 'DAY' || value === '日') return 'DAILY';
  if (value.includes('WEEKLY') || value === 'WEEK' || value === '周') return 'WEEKLY';
  if (value.includes('MONTHLY') || value === 'MONTH' || value === '月') return 'MONTHLY';
  if (value.includes('QUARTERLY') || value === 'QUARTER' || value === '季') return 'QUARTERLY';
  if (value.includes('YEARLY') || value === 'YEAR' || value === '年') return 'YEARLY';
  return 'CUSTOM';
}

async function ensureCycle(client, workspaceId, cycleId, domainId = null) {
  if (!cycleId) return;
  const cycleType = inferCycleType(cycleId);
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (cycleType === 'DAILY') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (cycleType === 'WEEKLY') {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (cycleType === 'MONTHLY') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(start.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (cycleType === 'YEARLY') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  } else {
    end.setDate(end.getDate() + 30);
  }

  await client.query(
    `insert into pdca_cycle
      (id, workspace_id, domain_id, "cycleType", status, name, start_date, end_date, created_at, updated_at)
     values ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, now(), now())
     on conflict (id) do update set updated_at = now()`,
    [cycleId, workspaceId, domainId, cycleType, `${cycleId} 计划`, start.toISOString(), end.toISOString()]
  );
}

async function listItems(client, params, config) {
  const page = Math.max(1, Number(params.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') || PAGE_LIMIT)));
  const offset = (page - 1) * limit;
  const where = ['wi.workspace_id = $1', 'wi."itemType" = $2', 'wi.deleted_at is null'];
  const values = [params.get('workspaceId') || WORKSPACE_ID, config.type];

  const status = params.get('status');
  if (status) {
    const statuses = status.split(',').filter(Boolean);
    if (config.type === 'ISSUE' || config.type === 'SUGGESTION' || config.type === 'REVIEW') {
      values.push(statuses);
      where.push(`${config.detailAlias}.status = any($${values.length})`);
    } else {
      values.push(statuses);
      where.push(`wi.status = any($${values.length})`);
    }
  }

  const domainId = params.get('domainId');
  if (domainId) {
    values.push(domainId);
    where.push(`wi.domain_id = $${values.length}`);
  }

  const cycleId = params.get('cycleId');
  if (cycleId) {
    values.push(cycleId);
    where.push(`wi.cycle_id = $${values.length}`);
  }

  if (config.type === 'TASK' && params.get('projectId')) {
    values.push(params.get('projectId'));
    where.push(`wi.metadata ->> 'projectId' = $${values.length}`);
  }

  values.push(limit, offset);
  const rows = await client.query(
    `select wi.*, to_jsonb(${config.detailAlias}.*) as detail
       from work_items wi
       left join ${config.detailTable} ${config.detailAlias} on ${config.detailAlias}.work_item_id = wi.id
      where ${where.join(' and ')}
      order by wi.updated_at desc
      limit $${values.length - 1} offset $${values.length}`,
    values
  );

  const totalValues = values.slice(0, -2);
  const total = await client.query(
    `select count(*)::int as total from work_items wi
       left join ${config.detailTable} ${config.detailAlias} on ${config.detailAlias}.work_item_id = wi.id
      where ${where.join(' and ')}`,
    totalValues
  );

  return listResponse(rows.rows.map((row) => workItem(row, config.detailKey)), page, limit, total.rows[0].total);
}

async function getItem(client, idValue, config, workspaceId = WORKSPACE_ID) {
  const result = await client.query(
    `select wi.*, to_jsonb(${config.detailAlias}.*) as detail
       from work_items wi
       left join ${config.detailTable} ${config.detailAlias} on ${config.detailAlias}.work_item_id = wi.id
      where wi.id = $1 and wi.workspace_id = $2 and wi."itemType" = $3 and wi.deleted_at is null`,
    [idValue, workspaceId, config.type]
  );
  if (!result.rowCount) return null;
  return workItem(result.rows[0], config.detailKey);
}

async function createWorkItem(client, payload, config) {
  await ensureWorkspace(client, payload.workspaceId || WORKSPACE_ID);
  await ensureCycle(client, payload.workspaceId || WORKSPACE_ID, payload.cycleId, payload.domainId || null);

  if (payload.externalRef) {
    const existing = await client.query(
      `select id from work_items
        where workspace_id = $1 and "itemType" = $2 and "externalRef" = $3 and deleted_at is null
        order by updated_at desc
        limit 1`,
      [payload.workspaceId || WORKSPACE_ID, config.type, payload.externalRef]
    );
    if (existing.rowCount) {
      return patchWorkItem(client, existing.rows[0].id, payload, config);
    }
  }

  if (config.type === 'ISSUE') {
    const duplicate = await client.query(
      `select wi.id
         from work_items wi
         join issue_detail idtl on idtl.work_item_id = wi.id
        where wi.workspace_id = $1
          and wi."itemType" = 'ISSUE'
          and wi.deleted_at is null
          and idtl.status = 'OPEN'
          and wi.title = $2
          and coalesce(wi.description, '') = coalesce($3, '')
          and coalesce(wi.domain_id, '') = coalesce($4, '')
        order by wi.updated_at desc
        limit 1`,
      [payload.workspaceId || WORKSPACE_ID, payload.title, payload.description || null, payload.domainId || null]
    );
    if (duplicate.rowCount) {
      return patchWorkItem(client, duplicate.rows[0].id, payload, config);
    }
  }

  const nowId = id(config.idPrefix);
  const metadata = payload.metadata || {};
  if (payload.projectId) metadata.projectId = payload.projectId;
  if (payload.goalId) metadata.goalId = payload.goalId;

  await client.query(
    `insert into work_items
      (id, workspace_id, domain_id, cycle_id, "itemType", "pdcaStage", title, description, status, priority,
       "createdBy", "sourceType", planned_start_at, planned_end_at, completed_at, metadata, parent_id, "externalRef", created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now(),now())`,
    [
      nowId,
      payload.workspaceId || WORKSPACE_ID,
      payload.domainId || null,
      payload.cycleId || null,
      config.type,
      config.pdcaStage,
      payload.title,
      payload.description || null,
      workItemStatusFor(config.type, payload.status, config.status),
      priority(payload.priority, config.priority),
      payload.createdBy || 'user',
      payload.sourceType || 'MANUAL',
      toDate(payload.plannedStartAt),
      toDate(payload.plannedEndAt),
      toDate(payload.completedAt),
      metadata,
      payload.parentId || metadata.goalId || null,
      payload.externalRef || null,
    ]
  );

  await config.createDetail(client, nowId, payload);
  return getItem(client, nowId, config, payload.workspaceId || WORKSPACE_ID);
}

async function patchWorkItem(client, idValue, payload, config) {
  const existing = await getItem(client, idValue, config, payload.workspaceId || WORKSPACE_ID);
  if (!existing) return null;

  const metadata = { ...(existing.metadata || {}), ...(payload.metadata || {}) };
  if (payload.projectId) metadata.projectId = payload.projectId;
  if (payload.goalId) metadata.goalId = payload.goalId;

  await client.query(
    `update work_items set
      title = coalesce($2, title),
      description = coalesce($3, description),
      status = coalesce($4, status),
      priority = coalesce($5, priority),
      domain_id = coalesce($6, domain_id),
      cycle_id = coalesce($7, cycle_id),
      planned_start_at = coalesce($8, planned_start_at),
      planned_end_at = coalesce($9, planned_end_at),
      completed_at = coalesce($10, completed_at),
      metadata = $11,
      parent_id = coalesce($12, parent_id),
      updated_at = now()
     where id = $1`,
    [
      idValue,
      payload.title ?? null,
      payload.description ?? null,
      payload.status ? workItemStatusFor(config.type, payload.status, null) : null,
      payload.priority ? priority(payload.priority) : null,
      payload.domainId ?? null,
      payload.cycleId ?? null,
      toDate(payload.plannedStartAt),
      toDate(payload.plannedEndAt),
      toDate(payload.completedAt),
      metadata,
      metadata.goalId || payload.parentId || null,
    ]
  );

  await config.patchDetail(client, idValue, payload);
  return getItem(client, idValue, config, payload.workspaceId || WORKSPACE_ID);
}

async function softDelete(client, idValue, config, workspaceId = WORKSPACE_ID) {
  const existing = await getItem(client, idValue, config, workspaceId);
  if (!existing) return null;
  await client.query('update work_items set deleted_at = now(), updated_at = now() where id = $1', [idValue]);
  return { ...existing, deletedAt: new Date().toISOString() };
}

const configs = {
  goals: {
    type: 'GOAL',
    idPrefix: 'goal',
    detailTable: 'goal_detail',
    detailAlias: 'gd',
    detailKey: 'goalDetail',
    pdcaStage: 'PLAN',
    status: 'ACTIVE',
    priority: 'P1',
    async createDetail(client, workItemId, payload) {
      await client.query(
        `insert into goal_detail
         (id, work_item_id, target_value, current_value, unit, progress, weight, target_date)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id('goal_detail'), workItemId, payload.targetValue ?? null, payload.currentValue ?? null, payload.unit ?? null, Number(payload.progress ?? 0), payload.weight ?? null, toDate(payload.targetDate)]
      );
    },
    async patchDetail(client, workItemId, payload) {
      await client.query(
        `update goal_detail set
           target_value = coalesce($2, target_value),
           current_value = coalesce($3, current_value),
           unit = coalesce($4, unit),
           progress = coalesce($5, progress),
           weight = coalesce($6, weight),
           target_date = coalesce($7, target_date)
         where work_item_id = $1`,
        [workItemId, payload.targetValue ?? null, payload.currentValue ?? null, payload.unit ?? null, payload.progress ?? null, payload.weight ?? null, toDate(payload.targetDate)]
      );
    },
  },
  projects: {
    type: 'PROJECT',
    idPrefix: 'project',
    detailTable: 'project_detail',
    detailAlias: 'pd',
    detailKey: 'projectDetail',
    pdcaStage: 'DO',
    status: 'ACTIVE',
    priority: 'P1',
    async createDetail(client, workItemId, payload) {
      await client.query(
        `insert into project_detail (id, work_item_id, progress, health_status, budget, actual_cost)
         values ($1,$2,$3,$4,$5,$6)`,
        [id('project_detail'), workItemId, Number(payload.progress ?? 0), payload.healthStatus || 'ON_TRACK', payload.budget ?? null, payload.actualCost ?? null]
      );
    },
    async patchDetail(client, workItemId, payload) {
      await client.query(
        `update project_detail set
           progress = coalesce($2, progress),
           health_status = coalesce($3, health_status),
           budget = coalesce($4, budget),
           actual_cost = coalesce($5, actual_cost)
         where work_item_id = $1`,
        [workItemId, payload.progress ?? null, payload.healthStatus ?? null, payload.budget ?? null, payload.actualCost ?? null]
      );
    },
  },
  tasks: {
    type: 'TASK',
    idPrefix: 'task',
    detailTable: 'task_detail',
    detailAlias: 'td',
    detailKey: 'taskDetail',
    pdcaStage: 'DO',
    status: 'TODO',
    priority: 'P2',
    async createDetail(client, workItemId, payload) {
      await client.query(
        `insert into task_detail
         (id, work_item_id, due_at, scheduled_start_at, scheduled_end_at, estimated_minutes, actual_minutes, completion_note)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id('task_detail'),
          workItemId,
          toDate(payload.dueAt),
          toDate(payload.plannedStartAt || payload.scheduledStartAt),
          toDate(payload.plannedEndAt || payload.scheduledEndAt),
          payload.estimatedMinutes ?? null,
          payload.actualMinutes ?? null,
          payload.completionNote ?? null,
        ]
      );
    },
    async patchDetail(client, workItemId, payload) {
      await client.query(
        `update task_detail set
           due_at = coalesce($2, due_at),
           scheduled_start_at = coalesce($3, scheduled_start_at),
           scheduled_end_at = coalesce($4, scheduled_end_at),
           estimated_minutes = coalesce($5, estimated_minutes),
           actual_minutes = coalesce($6, actual_minutes),
           completion_note = coalesce($7, completion_note)
         where work_item_id = $1`,
        [
          workItemId,
          toDate(payload.dueAt),
          toDate(payload.plannedStartAt || payload.scheduledStartAt),
          toDate(payload.plannedEndAt || payload.scheduledEndAt),
          payload.estimatedMinutes ?? null,
          payload.actualMinutes ?? null,
          payload.completionNote ?? null,
        ]
      );
    },
  },
  issues: {
    type: 'ISSUE',
    idPrefix: 'issue',
    detailTable: 'issue_detail',
    detailAlias: 'idtl',
    detailKey: 'issueDetail',
    pdcaStage: 'CHECK',
    status: 'BLOCKED',
    priority: 'P1',
    async createDetail(client, workItemId, payload) {
      const expected = payload.expectedValue ?? payload.targetValue ?? payload.issueDetail?.expectedValue ?? payload.issueDetail?.targetValue ?? null;
      const actual = payload.actualValue ?? payload.issueDetail?.actualValue ?? null;
      const gap = expected != null && actual != null ? Number(actual) - Number(expected) : payload.gapValue ?? payload.issueDetail?.gapValue ?? null;
      await client.query(
        `insert into issue_detail
         (id, work_item_id, task_id, metric_name, metric_target_value, metric_actual_value, level, description, status,
          expected_value, actual_value, gap_value, severity, detected_at, gap_type)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),$14)`,
        [
          id('issue_detail'),
          workItemId,
          payload.taskId || payload.issueDetail?.taskId || null,
          payload.metricName || payload.issueDetail?.metricName || null,
          expected,
          actual,
          payload.level || payload.issueDetail?.level || 'MEDIUM',
          payload.description || payload.issueDetail?.description || null,
          payload.status || payload.issueDetail?.status || 'OPEN',
          expected,
          actual,
          gap,
          payload.severity || payload.issueDetail?.severity || 'medium',
          payload.gapType || payload.issueDetail?.gapType || null,
        ]
      );
    },
    async patchDetail(client, workItemId, payload) {
      const detail = payload.issueDetail || {};
      const expected = payload.expectedValue ?? payload.targetValue ?? detail.expectedValue ?? detail.targetValue ?? null;
      const actual = payload.actualValue ?? detail.actualValue ?? null;
      const gap = expected != null && actual != null ? Number(actual) - Number(expected) : payload.gapValue ?? detail.gapValue ?? null;
      await client.query(
        `update issue_detail set
           task_id = coalesce($2, task_id),
           metric_name = coalesce($3, metric_name),
           metric_target_value = coalesce($4, metric_target_value),
           metric_actual_value = coalesce($5, metric_actual_value),
           level = coalesce($6, level),
           description = coalesce($7, description),
           status = coalesce($8, status),
           expected_value = coalesce($9, expected_value),
           actual_value = coalesce($10, actual_value),
           gap_value = coalesce($11, gap_value),
           severity = coalesce($12, severity),
           gap_type = coalesce($13, gap_type)
         where work_item_id = $1`,
        [
          workItemId,
          payload.taskId || detail.taskId || null,
          payload.metricName || detail.metricName || null,
          expected,
          actual,
          payload.level || detail.level || null,
          payload.description || detail.description || null,
          payload.status || detail.status || null,
          expected,
          actual,
          gap,
          payload.severity || detail.severity || null,
          payload.gapType || detail.gapType || null,
        ]
      );
    },
  },
};

async function createSuggestionForIssue(client, issue) {
  const suggestion = await createWorkItem(client, {
    workspaceId: issue.workspaceId,
    title: `处理问题：${issue.title}`,
    description: issue.description || issue.issueDetail?.description || '根据问题记录生成行动建议。',
    priority: issue.priority || 'P1',
    domainId: issue.domainId || 'work',
    metadata: { issueId: issue.id },
    sourceType: 'MANUAL',
  }, {
    type: 'SUGGESTION',
    idPrefix: 'suggestion',
    detailTable: 'suggestion_detail',
    detailAlias: 'sd',
    detailKey: 'suggestionDetail',
    pdcaStage: 'ACT',
    status: 'TODO',
    priority: 'P1',
    async createDetail(innerClient, workItemId, payload) {
      await innerClient.query(
        `insert into suggestion_detail
         (id, work_item_id, suggestion_type, confidence, "impactScore", "urgencyScore", evidence, dedup_key,
          source_type, source_ref_id, issue_id, reason, priority, source, is_converted, status)
         values ($1,$2,'RISK_MITIGATION',0.7,70,70,$3,$4,'ISSUE',$5,$5,$6,$7,'issue',false,'PENDING')`,
        [
          id('suggestion_detail'),
          workItemId,
          { level: issue.issueDetail?.level, status: issue.issueDetail?.status },
          `issue:${issue.id}`,
          issue.id,
          payload.description,
          priority(payload.priority || 'P1'),
        ]
      );
    },
    async patchDetail() {},
  });
  return suggestion;
}

async function handleTaskAction(client, taskId, action, body) {
  const task = await getItem(client, taskId, configs.tasks, body.workspaceId || WORKSPACE_ID);
  if (!task) return null;

  if (action === 'start') {
    await client.query(
      `update work_items set status = 'IN_PROGRESS', planned_start_at = coalesce(planned_start_at, now()), updated_at = now() where id = $1`,
      [taskId]
    );
    await client.query(
      `update task_detail set scheduled_start_at = coalesce(scheduled_start_at, now()) where work_item_id = $1`,
      [taskId]
    );
  }

  if (action === 'complete') {
    await client.query(
      `update work_items set status = 'DONE', completed_at = now(), updated_at = now() where id = $1`,
      [taskId]
    );
    await client.query(
      `update task_detail
          set completion_note = coalesce($2, completion_note),
              actual_minutes = coalesce($3, actual_minutes,
                greatest(1, round(extract(epoch from (now() - coalesce(scheduled_start_at, now()))) / 60)::int))
        where work_item_id = $1`,
      [taskId, body.completionNote || null, body.actualMinutes ?? null]
    );
  }

  if (action === 'cancel') {
    await client.query(`update work_items set status = 'CANCELLED', updated_at = now() where id = $1`, [taskId]);
  }

  return getItem(client, taskId, configs.tasks, body.workspaceId || WORKSPACE_ID);
}

async function listSuggestions(client, params) {
  return listItems(client, params, {
    type: 'SUGGESTION',
    detailTable: 'suggestion_detail',
    detailAlias: 'sd',
    detailKey: 'suggestionDetail',
  });
}

async function listReviews(client, params) {
  return listItems(client, params, {
    type: 'REVIEW',
    detailTable: 'review_detail',
    detailAlias: 'rd',
    detailKey: 'reviewDetail',
  });
}

function reviewPeriod(cycleId) {
  if (cycleId?.includes('WEEKLY')) return { reviewType: 'WEEKLY', cycleType: 'WEEKLY', period: cycleId.replace(/^cycle_/, '') };
  if (cycleId?.includes('QUARTERLY')) return { reviewType: 'QUARTERLY', cycleType: 'QUARTERLY', period: cycleId.replace(/^cycle_/, '') };
  if (cycleId?.includes('YEARLY')) return { reviewType: 'YEARLY', cycleType: 'YEARLY', period: cycleId.replace(/^cycle_/, '') };
  return { reviewType: 'MONTHLY', cycleType: 'MONTHLY', period: cycleId?.replace(/^cycle_/, '') || new Date().toISOString().slice(0, 7) };
}

async function generateReviewDraft(client, body) {
  await ensureWorkspace(client, body.workspaceId || WORKSPACE_ID);
  const detail = reviewPeriod(body.cycleId);
  const reviewId = id('review');
  const summary = '系统已汇总当前目标、项目、任务和问题，请继续补充根因、经验和下一步行动。';
  const dashboard = await dashboardOverview(client);

  await client.query(
    `insert into work_items
      (id, workspace_id, cycle_id, "itemType", "pdcaStage", title, description, status, priority, "createdBy", "sourceType", metadata, created_at, updated_at)
     values ($1,$2,$3,'REVIEW','REVIEW','快速复盘草稿',$4,'COMPLETED','P2',$5,'MANUAL',$6,now(),now())`,
    [reviewId, body.workspaceId || WORKSPACE_ID, body.cycleId || null, summary, body.reviewedBy || 'user', { generatedBy: 'commandhub' }]
  );
  await client.query(
    `insert into review_detail
      (id, work_item_id, review_type, cycle_type, period, summary, achievements, challenges, root_causes, lessons_learned,
       next_cycle_focus, score_after, completion_rate, reviewed_by, reviewed_at, is_draft, status, aggregated_data)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),false,'COMPLETED',$15)`,
    [
      id('review_detail'),
      reviewId,
      detail.reviewType,
      detail.cycleType,
      detail.period,
      summary,
      [],
      dashboard.openIssues?.slice(0, 5) || [],
      [],
      [],
      dashboard.todayFocus?.slice(0, 5).map((task) => task.title) || [],
      dashboard.overallScore,
      dashboard.taskCompletionRate || null,
      body.reviewedBy || 'user',
      dashboard,
    ]
  );
  return getItem(client, reviewId, {
    type: 'REVIEW',
    detailTable: 'review_detail',
    detailAlias: 'rd',
    detailKey: 'reviewDetail',
  }, body.workspaceId || WORKSPACE_ID);
}

async function patchReview(client, reviewId, body) {
  await client.query(
    `update work_items set
      title = coalesce($2, title),
      description = coalesce($3, description),
      updated_at = now()
     where id = $1 and "itemType" = 'REVIEW'`,
    [reviewId, body.title ?? null, body.description ?? body.summary ?? null]
  );
  await client.query(
    `update review_detail set
      summary = coalesce($2, summary),
      achievements = coalesce($3, achievements),
      challenges = coalesce($4, challenges),
      root_causes = coalesce($5, root_causes),
      lessons_learned = coalesce($6, lessons_learned),
      next_cycle_focus = coalesce($7, next_cycle_focus),
      score_before = coalesce($8, score_before),
      score_after = coalesce($9, score_after),
      score = coalesce($10, score)
     where work_item_id = $1`,
    [
      reviewId,
      body.summary ?? null,
      body.achievements ?? null,
      body.challenges ?? null,
      body.rootCauses ?? null,
      body.lessonsLearned ?? null,
      body.nextCycleFocus ?? null,
      body.scoreBefore ?? null,
      body.scoreAfter ?? null,
      body.score ?? null,
    ]
  );
  return getItem(client, reviewId, { type: 'REVIEW', detailTable: 'review_detail', detailAlias: 'rd', detailKey: 'reviewDetail' }, body.workspaceId || WORKSPACE_ID);
}

async function dashboardOverview(client) {
  await ensureWorkspace(client);
  const [
    goals,
    tasks,
    issues,
    projects,
    suggestions,
    review,
    done,
  ] = await Promise.all([
    client.query(
      `select wi.domain_id, gd.progress
         from work_items wi
         join goal_detail gd on gd.work_item_id = wi.id
        where wi.workspace_id = $1 and wi."itemType" = 'GOAL' and wi.deleted_at is null`,
      [WORKSPACE_ID]
    ),
    client.query(
      `select wi.*,
              to_jsonb(td.*) || jsonb_build_object(
                'actual_minutes',
                coalesce(
                  td.actual_minutes,
                  case
                    when wi.completed_at is not null and wi.planned_start_at is not null
                    then greatest(1, round(extract(epoch from (wi.completed_at - wi.planned_start_at)) / 60.0)::int)
                    else null
                  end
                )
              ) as detail
         from work_items wi
         join task_detail td on td.work_item_id = wi.id
         where wi.workspace_id = $1 and wi."itemType" = 'TASK' and wi.deleted_at is null
           and wi.status in ('TODO','IN_PROGRESS','BLOCKED','DONE')
           and (
             wi.cycle_id = 'DAILY'
             or td.due_at::date = current_date
             or wi.completed_at::date = current_date
           )
        order by case wi.priority::text when 'P0' then 0 when 'P1' then 1 when 'P2' then 2 when 'P3' then 3 else 9 end,
                 case when wi.status = 'DONE' then 1 else 0 end,
                 coalesce(td.due_at, wi.completed_at, wi.updated_at) asc
        limit 8`,
      [WORKSPACE_ID]
    ),
    client.query(
      `select wi.*, to_jsonb(idtl.*) as detail
         from work_items wi
         join issue_detail idtl on idtl.work_item_id = wi.id
        where wi.workspace_id = $1 and wi."itemType" = 'ISSUE' and wi.deleted_at is null and idtl.status = 'OPEN'
        order by wi.updated_at desc
        limit 6`,
      [WORKSPACE_ID]
    ),
    client.query(
      `select wi.*, to_jsonb(pd.*) as detail
         from work_items wi
         join project_detail pd on pd.work_item_id = wi.id
        where wi.workspace_id = $1 and wi."itemType" = 'PROJECT' and wi.deleted_at is null
        order by wi.updated_at desc
        limit 6`,
      [WORKSPACE_ID]
    ),
    client.query(
      `select wi.*, to_jsonb(sd.*) as detail
         from work_items wi
         join suggestion_detail sd on sd.work_item_id = wi.id
        where wi.workspace_id = $1 and wi."itemType" = 'SUGGESTION' and wi.deleted_at is null and sd.status = 'PENDING'
        order by wi.updated_at desc
        limit 3`,
      [WORKSPACE_ID]
    ),
    client.query(
      `select wi.*, to_jsonb(rd.*) as detail
         from work_items wi
         join review_detail rd on rd.work_item_id = wi.id
        where wi.workspace_id = $1 and wi."itemType" = 'REVIEW' and wi.deleted_at is null
        order by wi.updated_at desc
        limit 1`,
      [WORKSPACE_ID]
    ),
    client.query(
      `select count(*) filter (where wi.status = 'DONE')::int as done_count, count(*)::int as total
         from work_items wi
         join task_detail td on td.work_item_id = wi.id
        where wi.workspace_id = $1 and wi."itemType" = 'TASK' and wi.deleted_at is null`,
      [WORKSPACE_ID]
    ),
  ]);
  const domainMap = new Map();
  for (const row of goals.rows) {
    const key = row.domain_id || 'other';
    const current = domainMap.get(key) || [];
    current.push(Number(row.progress || 0));
    domainMap.set(key, current);
  }
  const domainScores = ['health', 'wealth', 'work', 'content', 'learning'].map((domainId) => {
    const values = domainMap.get(domainId) || [];
    return {
      domainId,
      score: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
    };
  });
  const overallScore = domainScores.some((item) => item.score > 0)
    ? Math.round(domainScores.reduce((sum, item) => sum + item.score, 0) / domainScores.filter((item) => item.score > 0).length)
    : 0;

  const taskCompletionRate = done.rows[0].total ? Math.round((done.rows[0].done_count / done.rows[0].total) * 100) : 0;

  return {
    overallScore,
    targetScore: overallScore,
    domainScores,
    todayFocus: tasks.rows.map((row) => workItem(row, 'taskDetail')),
    activeProjects: projects.rows.map((row) => workItem(row, 'projectDetail')),
    openIssues: issues.rows.map((row) => workItem(row, 'issueDetail')),
    pendingSuggestions: suggestions.rows.map((row) => workItem(row, 'suggestionDetail')),
    latestReview: review.rowCount ? workItem(review.rows[0], 'reviewDetail') : null,
    activeInsights: [],
    taskCompletionRate,
    lastUpdatedAt: new Date().toISOString(),
  };
}

async function route(req, res, client) {
  const { pathname, searchParams } = normalizePath(req);
  const method = req.method.toUpperCase();
  const body = parseJson(req);

  if (pathname === '/health' && method === 'GET') {
    await ensureWorkspace(client);
    const tables = await client.query("select count(*)::int as total from information_schema.tables where table_schema = 'public'");
    return ok(res, {
      status: 'ok',
      database: { status: 'connected', provider: 'supabase-postgres', tables: tables.rows[0].total },
      timestamp: new Date().toISOString(),
    });
  }

  if (pathname === '/dashboard/overview' && method === 'GET') {
    return ok(res, await dashboardOverview(client));
  }

  const resourceMap = {
    '/v1/goals': configs.goals,
    '/v1/projects': configs.projects,
    '/v1/tasks': configs.tasks,
    '/issues': configs.issues,
  };

  for (const [basePath, config] of Object.entries(resourceMap)) {
    if (pathname === basePath && method === 'GET') return ok(res, await listItems(client, searchParams, config));
    if (pathname === basePath && method === 'POST') {
      const item = await createWorkItem(client, body, config);
      if (config.type === 'ISSUE') await createSuggestionForIssue(client, item);
      return ok(res, item, 201);
    }

    const itemMatch = pathname.match(new RegExp(`^${basePath.replace(/\//g, '\\/')}\\/([^/]+)$`));
    if (itemMatch) {
      const itemId = itemMatch[1];
      if (method === 'GET') {
        const item = await getItem(client, itemId, config, searchParams.get('workspaceId') || WORKSPACE_ID);
        if (!item) return ok(res, null, 404);
        return ok(res, item);
      }
      if (method === 'PATCH') return ok(res, await patchWorkItem(client, itemId, body, config));
      if (method === 'DELETE') return ok(res, await softDelete(client, itemId, config, searchParams.get('workspaceId') || WORKSPACE_ID));
    }
  }

  const taskAction = pathname.match(/^\/v1\/tasks\/([^/]+)\/(start|complete|cancel)$/);
  if (taskAction && method === 'POST') {
    return ok(res, await handleTaskAction(client, taskAction[1], taskAction[2], body));
  }

  if (pathname === '/suggestions' && method === 'GET') return ok(res, await listSuggestions(client, searchParams));
  const suggestionItem = pathname.match(/^\/suggestions\/([^/]+)$/);
  if (suggestionItem && method === 'DELETE') {
    return ok(res, await softDelete(client, suggestionItem[1], {
      type: 'SUGGESTION',
      detailTable: 'suggestion_detail',
      detailAlias: 'sd',
      detailKey: 'suggestionDetail',
    }, searchParams.get('workspaceId') || WORKSPACE_ID));
  }
  if (suggestionItem && method === 'PATCH') {
    await patchWorkItem(client, suggestionItem[1], body, {
      type: 'SUGGESTION',
      detailTable: 'suggestion_detail',
      detailAlias: 'sd',
      detailKey: 'suggestionDetail',
      patchDetail: async (innerClient, workItemId, payload) => {
        const detail = payload.suggestionDetail || {};
        await innerClient.query(
          `update suggestion_detail set
            reason = coalesce($2, reason),
            evidence = coalesce($3, evidence),
            priority = coalesce($4, priority),
            status = coalesce($5, status)
           where work_item_id = $1`,
          [workItemId, detail.reason ?? payload.description ?? null, detail.evidence ?? null, priority(detail.priority || payload.priority || null, null), detail.status || payload.status || null]
        );
      },
    });
    return ok(res, await getItem(client, suggestionItem[1], { type: 'SUGGESTION', detailTable: 'suggestion_detail', detailAlias: 'sd', detailKey: 'suggestionDetail' }));
  }

  const suggestionAction = pathname.match(/^\/suggestions\/([^/]+)\/(accept|dismiss|defer|create-adjustment-task)$/);
  if (suggestionAction && ['PATCH', 'POST'].includes(method)) {
    const suggestion = await getItem(client, suggestionAction[1], { type: 'SUGGESTION', detailTable: 'suggestion_detail', detailAlias: 'sd', detailKey: 'suggestionDetail' });
    if (!suggestion) return ok(res, null, 404);
    const action = suggestionAction[2];
    if (action === 'create-adjustment-task') {
      const task = await createWorkItem(client, {
        workspaceId: WORKSPACE_ID,
        title: suggestion.title,
        description: suggestion.description || suggestion.suggestionDetail?.reason,
        priority: suggestion.priority || 'P1',
        domainId: suggestion.domainId || 'work',
        estimatedMinutes: 45,
      }, configs.tasks);
      await client.query(
        `update suggestion_detail set status = 'ACCEPTED', is_converted = true, converted_task_id = $2, accepted_at = coalesce(accepted_at, now()) where work_item_id = $1`,
        [suggestion.id, task.id]
      );
      return ok(res, task);
    }
    const statusMap = { accept: 'ACCEPTED', dismiss: 'DISMISSED', defer: 'DEFERRED' };
    const timeField = { accept: 'accepted_at', dismiss: 'dismissed_at', defer: 'deferred_at' }[action];
    await client.query(`update suggestion_detail set status = $2, ${timeField} = now() where work_item_id = $1`, [suggestion.id, statusMap[action]]);
    const updated = await getItem(client, suggestion.id, { type: 'SUGGESTION', detailTable: 'suggestion_detail', detailAlias: 'sd', detailKey: 'suggestionDetail' });
    return ok(res, action === 'accept' ? { suggestion: updated, decision: { id: id('decision'), status: 'ACCEPTED' } } : updated);
  }

  if (pathname === '/reviews' && method === 'GET') return ok(res, await listReviews(client, searchParams));
  if (pathname === '/reviews/generate-draft' && method === 'POST') return ok(res, await generateReviewDraft(client, body), 201);
  const reviewComplete = pathname.match(/^\/reviews\/([^/]+)\/complete$/);
  if (reviewComplete && method === 'PATCH') {
    await client.query(
      `update work_items set status = 'COMPLETED', updated_at = now() where id = $1 and "itemType" = 'REVIEW'`,
      [reviewComplete[1]]
    );
    await client.query(
      `update review_detail set is_draft = false, status = 'COMPLETED', reviewed_by = coalesce($2, reviewed_by), reviewed_at = now() where work_item_id = $1`,
      [reviewComplete[1], body.reviewedBy || null]
    );
    const item = await getItem(client, reviewComplete[1], { type: 'REVIEW', detailTable: 'review_detail', detailAlias: 'rd', detailKey: 'reviewDetail' });
    return ok(res, item?.reviewDetail || item);
  }
  const reviewItem = pathname.match(/^\/reviews\/([^/]+)$/);
  if (reviewItem) {
    if (method === 'GET') {
      const item = await getItem(client, reviewItem[1], { type: 'REVIEW', detailTable: 'review_detail', detailAlias: 'rd', detailKey: 'reviewDetail' });
      if (!item) return ok(res, null, 404);
      return ok(res, item);
    }
    if (method === 'DELETE') return ok(res, await softDelete(client, reviewItem[1], { type: 'REVIEW', detailTable: 'review_detail', detailAlias: 'rd', detailKey: 'reviewDetail' }, searchParams.get('workspaceId') || WORKSPACE_ID));
    if (method === 'PATCH') return ok(res, await patchReview(client, reviewItem[1], body));
  }

  ok(res, { path: pathname, method }, 404);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  let client;
  try {
    client = await getPool().connect();
    await route(req, res, client);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      code: status,
      message: error.message || 'Internal Server Error',
      data: null,
    });
  } finally {
    if (client) client.release();
  }
};
