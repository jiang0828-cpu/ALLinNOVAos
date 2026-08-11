type StoreRecord = Record<string, any>;

const STORE_KEY = 'nova-os-local-store-v1';
const BACKUP_KEY = 'nova-os-local-backups-v1';
const SYNC_QUEUE_KEY = 'nova-os-sync-queue-v1';
const WORKSPACE_ID = 'ws_default';

interface LocalStore {
  projects: StoreRecord[];
  tasks: StoreRecord[];
  issues: StoreRecord[];
  suggestions: StoreRecord[];
  reviews: StoreRecord[];
  goals: StoreRecord[];
  updatedAt: string;
}

export interface LocalSyncOperation {
  id: string;
  path: string;
  method: string;
  body?: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
}

function now() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function defaultStore(): LocalStore {
  const updatedAt = now();
  return {
    projects: [
      createProjectRecord({
        title: 'NOVA OS 线上运行完善',
        priority: 'P1',
        domainId: 'work',
        progress: 70,
      }),
    ],
    tasks: [
      createTaskRecord({
        title: '检查全局指挥台快速启动',
        priority: 'P1',
        domainId: 'work',
        estimatedMinutes: 25,
      }),
    ],
    issues: [
      createIssueRecord({
        title: '线上无后端时启用浏览器本地备份',
        level: 'LOW',
        description: '用于保证 Vercel 线上访问时仍可进行任务管理。',
      }),
    ],
    suggestions: [
      createSuggestionRecord({
        title: '下一步接入真实数据库与 Redis 后台服务',
        description: '当前本地数据通路已可用，建议继续完善线上持久化服务。',
        priority: 'P1',
        sourceType: 'ISSUE',
        sourceRefId: 'local_bootstrap',
        reason: '系统检测到线上后端可能不可用，需要保证任务管理数据长期稳定保存。',
        evidence: {
          mode: 'local-fallback',
          backup: 'browser-local-storage',
        },
      }),
    ],
    reviews: [
      createReviewRecord({
        title: 'NOVA OS 今日复盘草稿',
        summary: '已启用指挥台快速启动、自动同步与本地备份。',
      }),
    ],
    goals: [
      createGoalRecord({
        title: 'NOVA OS 目标体系轻量化',
        priority: 'P1',
        domainId: 'work',
        cycleId: 'monthly:2026-08',
        progress: 45,
        targetDate: '2026-08-31',
      }),
    ],
    updatedAt,
  };
}

function loadStore(): LocalStore {
  if (typeof window === 'undefined') return defaultStore();

  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) {
    const seeded = defaultStore();
    saveStore(seeded, false);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw);
    const fallback = defaultStore();
    return {
      projects: parsed.projects || [],
      tasks: parsed.tasks || [],
      issues: parsed.issues || [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : fallback.suggestions,
      reviews: parsed.reviews || [],
      goals: parsed.goals || [],
      updatedAt: parsed.updatedAt || now(),
    };
  } catch {
    const seeded = defaultStore();
    saveStore(seeded, false);
    return seeded;
  }
}

function saveStore(store: LocalStore, backup = true) {
  if (typeof window === 'undefined') return;
  const next = { ...store, updatedAt: now() };
  window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
  if (backup) writeBackup(next);
  window.dispatchEvent(new CustomEvent('nova:local-store-updated', { detail: next }));
}

function writeBackup(store: LocalStore) {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(BACKUP_KEY);
  const backups = raw ? JSON.parse(raw) : [];
  backups.unshift({
    id: uid('backup'),
    createdAt: now(),
    store,
  });
  window.localStorage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0, 20)));
}

function readSyncQueue(): LocalSyncOperation[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSyncQueue(queue: LocalSyncOperation[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue.slice(0, 200)));
  window.dispatchEvent(new CustomEvent('nova:sync-queue-updated', { detail: queue }));
}

export function queueLocalSyncOperation(path: string, options: RequestInit = {}) {
  if (typeof window === 'undefined') return;

  const method = (options.method || 'GET').toUpperCase();
  if (method === 'GET') return;

  const body = typeof options.body === 'string' ? options.body : options.body ? JSON.stringify(options.body) : undefined;
  const signature = `${method}:${path}:${body || ''}`;
  const queue = readSyncQueue();
  const existing = queue.find((item) => `${item.method}:${item.path}:${item.body || ''}` === signature);
  const changedAt = now();

  if (existing) {
    existing.updatedAt = changedAt;
    return writeSyncQueue(queue);
  }

  queue.push({
    id: uid('sync'),
    path,
    method,
    body,
    createdAt: changedAt,
    updatedAt: changedAt,
    attempts: 0,
  });
  writeSyncQueue(queue);
}

export function queueLocalStoreSnapshotForSync() {
  if (typeof window === 'undefined') return getLocalSyncMeta();
  const store = loadStore();

  store.goals.filter((item) => !item.deletedAt).forEach((goal) => {
    queueLocalSyncOperation('/v1/goals', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: goal.workspaceId || WORKSPACE_ID,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        priority: goal.priority,
        domainId: goal.domainId,
        cycleId: goal.cycleId,
        plannedStartAt: goal.plannedStartAt,
        plannedEndAt: goal.plannedEndAt,
        progress: goal.goalDetail?.progress,
        targetDate: goal.goalDetail?.targetDate,
        targetValue: goal.goalDetail?.targetValue,
        currentValue: goal.goalDetail?.currentValue,
        unit: goal.goalDetail?.unit,
        weight: goal.goalDetail?.weight,
      }),
    });
  });

  store.projects.filter((item) => !item.deletedAt).forEach((project) => {
    queueLocalSyncOperation('/v1/projects', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: project.workspaceId || WORKSPACE_ID,
        title: project.title,
        description: project.description,
        status: project.status,
        priority: project.priority,
        domainId: project.domainId,
        cycleId: project.cycleId,
        plannedEndAt: project.plannedEndAt,
        progress: project.projectDetail?.progress,
        healthStatus: project.projectDetail?.healthStatus,
        metadata: project.metadata,
      }),
    });
  });

  store.tasks.filter((item) => !item.deletedAt).forEach((task) => {
    queueLocalSyncOperation('/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: task.workspaceId || WORKSPACE_ID,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        domainId: task.domainId,
        cycleId: task.cycleId,
        projectId: task.projectId,
        goalId: task.goalId,
        dueAt: task.dueAt || task.taskDetail?.dueAt,
        estimatedMinutes: task.taskDetail?.estimatedMinutes,
        actualMinutes: task.taskDetail?.actualMinutes,
      }),
    });
  });

  store.issues.filter((item) => !item.deletedAt).forEach((issue) => {
    queueLocalSyncOperation('/issues', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: issue.workspaceId || WORKSPACE_ID,
        title: issue.title,
        description: issue.description || issue.issueDetail?.description,
        domainId: issue.domainId,
        level: issue.issueDetail?.level || issue.level,
        targetValue: issue.issueDetail?.targetValue,
        actualValue: issue.issueDetail?.actualValue,
      }),
    });
  });

  return getLocalSyncMeta();
}

export function getLocalSyncMeta() {
  const queue = readSyncQueue();
  return {
    pendingCount: queue.length,
    oldestAt: queue[0]?.createdAt || null,
    lastError: queue.find((item) => item.lastError)?.lastError || null,
  };
}

export function getPendingSyncOperations() {
  return readSyncQueue();
}

export function markSyncOperationDone(id: string) {
  writeSyncQueue(readSyncQueue().filter((item) => item.id !== id));
}

export function markSyncOperationFailed(id: string, error: string) {
  const queue = readSyncQueue();
  const operation = queue.find((item) => item.id === id);
  if (!operation) return;
  operation.attempts += 1;
  operation.updatedAt = now();
  operation.lastError = error;
  writeSyncQueue(queue);
}

function listResponse(data: StoreRecord[], page = 1, limit = 50, statusParam?: string | null) {
  const statuses = statusParam ? statusParam.split(',').filter(Boolean) : [];
  const active = data.filter((item) => !item.deletedAt);
  const filtered =
    statuses.length === 0
      ? active
      : active.filter((item) =>
          statuses.includes(item.status) ||
          statuses.includes(item.issueDetail?.status) ||
          statuses.includes(item.suggestionDetail?.status)
        );
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
  };
}

function createProjectRecord(payload: StoreRecord) {
  const createdAt = now();
  const goalId = payload.metadata?.goalId || payload.goalId || payload.parentId;
  const goalTitle = payload.metadata?.goalTitle || payload.goalTitle;
  return {
    id: uid('project'),
    workspaceId: payload.workspaceId || WORKSPACE_ID,
    domainId: payload.domainId || 'work',
    cycleId: payload.cycleId || null,
    title: payload.title || '新项目',
    description: payload.description || '',
    status: payload.status || 'ACTIVE',
    priority: payload.priority || 'P1',
    metadata: payload.metadata || (goalId ? { goalId, goalTitle } : undefined),
    createdBy: 'local-user',
    ownerId: 'local-user',
    sourceType: 'LOCAL_BACKUP',
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    projectDetail: {
      id: uid('project_detail'),
      progress: Number(payload.progress ?? 0),
      healthStatus: payload.healthStatus || 'ON_TRACK',
    },
    parent: goalId ? { id: goalId, title: goalTitle || '关联目标', itemType: 'GOAL' } : undefined,
    tasks: [],
    issues: [],
  };
}

function createTaskRecord(payload: StoreRecord) {
  const createdAt = now();
  return {
    id: uid('task'),
    workspaceId: payload.workspaceId || WORKSPACE_ID,
    title: payload.title || '新任务',
    description: payload.description || '',
    status: payload.status || 'TODO',
    priority: payload.priority || 'P1',
    cycleId: payload.cycleId || null,
    domainId: payload.domainId || 'work',
    projectId: payload.projectId,
    goalId: payload.goalId,
    createdBy: 'local-user',
    ownerId: 'local-user',
    sourceType: 'LOCAL_BACKUP',
    dueAt: payload.dueAt,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    taskDetail: {
      id: uid('task_detail'),
      dueAt: payload.dueAt,
      estimatedMinutes: Number(payload.estimatedMinutes ?? 30),
      actualMinutes: payload.actualMinutes,
    },
  };
}

function createGoalRecord(payload: StoreRecord) {
  const createdAt = now();
  return {
    id: uid('goal'),
    workspaceId: payload.workspaceId || WORKSPACE_ID,
    domainId: payload.domainId || 'work',
    cycleId: payload.cycleId || null,
    title: payload.title || '新目标',
    description: payload.description || '',
    status: payload.status || 'ACTIVE',
    priority: payload.priority || 'P1',
    createdBy: 'local-user',
    ownerId: 'local-user',
    sourceType: 'LOCAL_BACKUP',
    plannedStartAt: payload.plannedStartAt || null,
    plannedEndAt: payload.plannedEndAt || payload.targetDate || null,
    completedAt: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    goalDetail: {
      id: uid('goal_detail'),
      targetValue: payload.targetValue,
      currentValue: payload.currentValue,
      unit: payload.unit,
      progress: Number(payload.progress ?? 0),
      weight: payload.weight,
      targetDate: payload.targetDate || payload.plannedEndAt || null,
    },
  };
}

function createIssueRecord(payload: StoreRecord) {
  const createdAt = now();
  const level = payload.level || 'MEDIUM';
  return {
    id: uid('issue'),
    workspaceId: payload.workspaceId || WORKSPACE_ID,
    domainId: payload.domainId || 'work',
    itemType: 'ISSUE',
    pdcaStage: 'ACT',
    title: payload.title || '新问题提示',
    description: payload.description || '',
    status: 'OPEN',
    priority: level === 'HIGH' ? 'P0' : level === 'MEDIUM' ? 'P1' : 'P2',
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    issueDetail: {
      id: uid('issue_detail'),
      workItemId: '',
      level,
      description: payload.description || '',
      status: 'OPEN',
      detectedAt: createdAt,
    },
  };
}

function createSuggestionRecord(payload: StoreRecord) {
  const createdAt = now();
  const detailId = uid('suggestion_detail');
  const record = {
    id: uid('suggestion'),
    workspaceId: payload.workspaceId || WORKSPACE_ID,
    domainId: payload.domainId || 'work',
    itemType: 'SUGGESTION',
    pdcaStage: 'ACT',
    title: payload.title || '新的行动建议',
    description: payload.description || '',
    status: 'PENDING',
    priority: payload.priority || 'P1',
    createdBy: 'local-user',
    ownerId: 'local-user',
    sourceType: 'LOCAL_BACKUP',
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    suggestionDetail: {
      id: detailId,
      workItemId: '',
      suggestionType: payload.suggestionType || 'RISK_MITIGATION',
      confidence: Number(payload.confidence ?? 0.86),
      impactScore: Number(payload.impactScore ?? 78),
      urgencyScore: Number(payload.urgencyScore ?? 72),
      evidence: payload.evidence || null,
      dedupKey: payload.dedupKey || detailId,
      expiresAt: payload.expiresAt || null,
      acceptedAt: null,
      dismissedAt: null,
      deferredAt: null,
      expiredAt: null,
      sourceType: payload.sourceType || 'ISSUE',
      sourceRefId: payload.sourceRefId || payload.issueId || 'local',
      issueId: payload.issueId || null,
      reason: payload.reason || payload.description || '系统根据当前问题和任务状态生成，等待确认后转为真实任务。',
      priority: payload.priority || 'P1',
      source: payload.source || 'LOCAL_BACKUP',
      isConverted: false,
      convertedTaskId: null,
      status: payload.status || 'PENDING',
    },
  };
  record.suggestionDetail.workItemId = record.id;
  return record;
}

function createReviewRecord(payload: StoreRecord) {
  const createdAt = now();
  const cycleMeta = getReviewCycleMeta(payload.cycleId);
  return {
    id: uid('review'),
    workspaceId: payload.workspaceId || WORKSPACE_ID,
    domainId: payload.domainId || 'work',
    itemType: 'REVIEW',
    pdcaStage: 'REVIEW',
    title: payload.title || '快速复盘草稿',
    description: payload.description || '',
    status: 'DRAFT',
    priority: 'P1',
    createdBy: 'local-user',
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    reviewDetail: {
      id: uid('review_detail'),
      workItemId: '',
      reviewType: payload.reviewType || cycleMeta.reviewType,
      cycleType: payload.cycleType || cycleMeta.cycleType,
      period: payload.period || cycleMeta.period,
      summary: payload.summary || '由全局指挥台快速生成，等待补充复盘内容。',
      achievements: [],
      challenges: [],
      rootCauses: [],
      lessonsLearned: [],
      nextCycleFocus: ['确认下一步行动', '同步任务列表', '记录关键问题'],
      reviewedAt: createdAt,
      isDraft: true,
      status: 'DRAFT',
    },
  };
}

function getReviewCycleMeta(cycleId?: string) {
  const raw = String(cycleId || '').toLowerCase();
  const today = new Date();
  if (raw.includes('year')) {
    return { reviewType: 'YEARLY', cycleType: 'YEARLY', period: String(today.getFullYear()) };
  }
  if (raw.includes('quarter') || raw.includes('_q')) {
    const quarter = Math.floor(today.getMonth() / 3) + 1;
    return { reviewType: 'QUARTERLY', cycleType: 'QUARTERLY', period: `${today.getFullYear()} Q${quarter}` };
  }
  if (raw.includes('month')) {
    return {
      reviewType: 'MONTHLY',
      cycleType: 'MONTHLY',
      period: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    };
  }
  return {
    reviewType: 'WEEKLY',
    cycleType: 'WEEKLY',
    period: `${today.getFullYear()} W${getIsoWeek(today)}`,
  };
}

function getIsoWeek(date: Date) {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil(((value.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getTaskDueDate(task: StoreRecord): string | undefined {
  return (
    task.dueAt ||
    task.taskDetail?.dueAt ||
    task.plannedEndAt ||
    task.taskDetail?.scheduledEndAt
  );
}

function isSameLocalDate(value: string | undefined, reference = new Date()): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function clampScore(value: unknown): number {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return 0;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function averageScore(items: StoreRecord[], getValue: (item: StoreRecord) => unknown): number {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + clampScore(getValue(item)), 0);
  return Math.round(total / items.length);
}

function getGoalProgress(goal: StoreRecord): number {
  if (goal.status === 'DONE') return 100;
  return clampScore(goal.goalDetail?.progress ?? goal.progress ?? 0);
}

function normalizeDomainId(domainId: unknown): string {
  const raw = String(domainId || '').toLowerCase();
  return raw.startsWith('domain_') ? raw.replace(/^domain_/, '') : raw;
}

function dashboardOverview(store: LocalStore) {
  const openTasks = store.tasks.filter((task) => !task.deletedAt && task.status !== 'DONE' && task.status !== 'CANCELLED');
  const todayTasks = openTasks.filter((task) => {
    const cycleId = String(task.cycleId || '').toLowerCase();
    const isDailyCycle = cycleId.includes('day') || cycleId.includes('daily');
    return isDailyCycle || isSameLocalDate(getTaskDueDate(task));
  });
  const activeProjects = store.projects.filter((project) => !project.deletedAt);
  const openIssues = store.issues.filter((issue) => !issue.deletedAt && issue.status === 'OPEN');
  const pendingSuggestions = store.suggestions.filter((suggestion) => {
    const status = suggestion.suggestionDetail?.status || suggestion.status;
    return !suggestion.deletedAt && (status === 'PENDING' || status === 'DEFERRED');
  });
  const goalItems = store.goals.filter((goal) => !goal.deletedAt && goal.status !== 'CANCELLED');
  const domainScoreConfig = [
    { domainId: 'domain_health', domainName: 'health' },
    { domainId: 'domain_wealth', domainName: 'wealth' },
    { domainId: 'domain_work', domainName: 'work' },
    { domainId: 'domain_content', domainName: 'content' },
    { domainId: 'domain_learning', domainName: 'learning' },
  ];
  const latestReview = store.reviews.filter((review) => !review.deletedAt)[0];

  return {
    overallScore: averageScore(goalItems, getGoalProgress),
    domainScores: domainScoreConfig.map((domain) => ({
      ...domain,
      score: averageScore(
        goalItems.filter((goal) => normalizeDomainId(goal.domainId) === domain.domainName),
        getGoalProgress
      ),
    })),
    todayFocus: todayTasks.slice(0, 4).map((task) => ({
      id: task.id,
      title: task.title,
      itemType: 'TASK',
      status: task.status,
      priority: task.priority || 'P1',
    })),
    activeProjects: activeProjects.slice(0, 4).map((project) => ({
      id: project.id,
      title: project.title,
      progress: project.projectDetail?.progress ?? 0,
      healthStatus: project.projectDetail?.healthStatus ?? 'ON_TRACK',
    })),
    openIssues: openIssues.slice(0, 4).map((issue) => ({
      id: issue.id,
      title: issue.title,
      level: issue.issueDetail?.level || 'MEDIUM',
      status: issue.status,
    })),
    pendingSuggestions: pendingSuggestions.slice(0, 4).map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      status: suggestion.suggestionDetail?.status || suggestion.status,
      impactScore: suggestion.suggestionDetail?.impactScore ?? 78,
    })),
    latestReview: latestReview
      ? {
          id: latestReview.id,
          title: latestReview.title,
          reviewType: latestReview.reviewDetail?.reviewType || 'DAILY',
          status: latestReview.reviewDetail?.status || latestReview.status,
          reviewedAt: latestReview.reviewDetail?.reviewedAt || latestReview.updatedAt,
        }
      : null,
    activeInsights: [
      {
        id: 'insight_backup',
        statement: `本地备份已启用，最近同步 ${new Date(store.updatedAt).toLocaleString('zh-CN')}`,
        insightType: 'SYSTEM',
        confidence: 0.92,
        impactScore: 80,
      },
    ],
    lastUpdatedAt: store.updatedAt,
  };
}

export function getLocalDashboardOverview() {
  return dashboardOverview(loadStore());
}

export function getLocalBackupMeta() {
  const store = loadStore();
  const backupRaw = typeof window === 'undefined' ? null : window.localStorage.getItem(BACKUP_KEY);
  const backups = backupRaw ? JSON.parse(backupRaw) : [];
  return {
    updatedAt: store.updatedAt,
    backupCount: backups.length,
  };
}

export function createLocalBackup() {
  const store = loadStore();
  writeBackup(store);
  return getLocalBackupMeta();
}

function upsertRecord(list: StoreRecord[], record: StoreRecord) {
  if (!record?.id) return;
  const index = list.findIndex((entry) => entry.id === record.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...record, updatedAt: record.updatedAt || now() };
    return;
  }
  list.unshift(record);
}

export function mirrorSuccessfulRequest(path: string, options: RequestInit = {}, data: unknown) {
  if (typeof window === 'undefined') return;
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'GET') return;

  const url = new URL(path, 'http://local');
  const store = loadStore();
  const collections: Record<string, keyof LocalStore> = {
    '/v1/projects': 'projects',
    '/v1/tasks': 'tasks',
    '/v1/goals': 'goals',
    '/issues': 'issues',
    '/suggestions': 'suggestions',
    '/reviews': 'reviews',
  };

  const collectionKey = collections[url.pathname];
  if (collectionKey && method === 'POST') {
    upsertRecord(store[collectionKey] as StoreRecord[], data as StoreRecord);
    saveStore(store);
    return;
  }

  if (url.pathname === '/reviews/generate-draft' && method === 'POST') {
    upsertRecord(store.reviews, data as StoreRecord);
    saveStore(store);
    return;
  }

  const reviewCompleteMirrorMatch = url.pathname.match(/^\/reviews\/([^/]+)\/complete$/);
  if (reviewCompleteMirrorMatch && method === 'PATCH') {
    const review = store.reviews.find((entry) => entry.id === reviewCompleteMirrorMatch[1] && !entry.deletedAt);
    if (review) {
      const changedAt = now();
      review.status = 'COMPLETED';
      review.updatedAt = changedAt;
      review.reviewDetail = {
        ...review.reviewDetail,
        ...(data && typeof data === 'object' ? (data as StoreRecord) : {}),
        status: 'COMPLETED',
        isDraft: false,
        reviewedAt: (data as StoreRecord)?.reviewedAt || changedAt,
      };
    }
    saveStore(store);
    return;
  }

  const itemMatch = url.pathname.match(/^\/(v1\/projects|v1\/tasks|v1\/goals|issues|suggestions|reviews)\/([^/]+)$/);
  if (itemMatch) {
    const [, collectionPath, id] = itemMatch;
    const map: Record<string, keyof LocalStore> = {
      'v1/projects': 'projects',
      'v1/tasks': 'tasks',
      'v1/goals': 'goals',
      issues: 'issues',
      suggestions: 'suggestions',
      reviews: 'reviews',
    };
    const list = store[map[collectionPath]] as StoreRecord[];
    const item = list.find((entry) => entry.id === id);
    if (method === 'DELETE') {
      if (item) {
        item.deletedAt = now();
        item.updatedAt = item.deletedAt;
      }
    } else if (item) {
      if (collectionPath === 'issues') {
        const payload = data as StoreRecord;
        const body = options.body ? JSON.parse(String(options.body)) : {};
        const status = payload?.issueDetail?.status || payload?.status || body?.issueDetail?.status || body?.status;
        Object.assign(item, payload, { updatedAt: now() });
        if (status) {
          item.status = status;
          item.issueDetail = {
            ...item.issueDetail,
            ...(payload?.issueDetail || {}),
            status,
          };
        }
      } else if (collectionPath === 'v1/projects') {
        const payload = data as StoreRecord;
        const body = options.body ? JSON.parse(String(options.body)) : {};
        Object.assign(item, payload, body, { updatedAt: now() });
        item.projectDetail = {
          ...item.projectDetail,
          ...(payload?.projectDetail || {}),
          progress: body.progress ?? payload?.projectDetail?.progress ?? item.projectDetail?.progress ?? 0,
          healthStatus: body.healthStatus ?? payload?.projectDetail?.healthStatus ?? item.projectDetail?.healthStatus,
          budget: body.budget ?? payload?.projectDetail?.budget ?? item.projectDetail?.budget,
          actualCost: body.actualCost ?? payload?.projectDetail?.actualCost ?? item.projectDetail?.actualCost,
        };
        const goalId = body.metadata?.goalId || payload?.metadata?.goalId;
        const goalTitle = body.metadata?.goalTitle || payload?.metadata?.goalTitle;
        item.parent = goalId ? { id: goalId, title: goalTitle || '关联目标', itemType: 'GOAL' } : item.parent;
      } else if (collectionPath === 'v1/goals') {
        const payload = data as StoreRecord;
        const body = options.body ? JSON.parse(String(options.body)) : {};
        Object.assign(item, payload, body, { updatedAt: now() });
        item.goalDetail = {
          ...item.goalDetail,
          ...(payload?.goalDetail || {}),
          progress: body.progress ?? payload?.goalDetail?.progress ?? item.goalDetail?.progress ?? 0,
          targetDate: body.targetDate ?? payload?.goalDetail?.targetDate ?? item.goalDetail?.targetDate,
          targetValue: body.targetValue ?? payload?.goalDetail?.targetValue ?? item.goalDetail?.targetValue,
          currentValue: body.currentValue ?? payload?.goalDetail?.currentValue ?? item.goalDetail?.currentValue,
          unit: body.unit ?? payload?.goalDetail?.unit ?? item.goalDetail?.unit,
          weight: body.weight ?? payload?.goalDetail?.weight ?? item.goalDetail?.weight,
        };
      } else {
        Object.assign(item, data as StoreRecord, { updatedAt: now() });
      }
    } else {
      upsertRecord(list, data as StoreRecord);
    }
    saveStore(store);
    return;
  }

  const taskActionMatch = url.pathname.match(/^\/v1\/tasks\/([^/]+)\/(start|complete|cancel)$/);
  if (taskActionMatch) {
    upsertRecord(store.tasks, data as StoreRecord);
    saveStore(store);
    return;
  }

  const suggestionActionMatch = url.pathname.match(/^\/suggestions\/([^/]+)\/(accept|dismiss|defer|create-adjustment-task)$/);
  if (suggestionActionMatch) {
    const [, suggestionId, action] = suggestionActionMatch;
    const suggestion = store.suggestions.find((entry) => entry.id === suggestionId);
    const payload = data as StoreRecord;
    if (action === 'create-adjustment-task') {
      upsertRecord(store.tasks, payload);
      if (suggestion) {
        suggestion.status = 'ACCEPTED';
        suggestion.updatedAt = now();
        suggestion.suggestionDetail = {
          ...suggestion.suggestionDetail,
          status: 'ACCEPTED',
          isConverted: true,
          convertedTaskId: payload.id,
          acceptedAt: suggestion.suggestionDetail?.acceptedAt || now(),
        };
      }
    } else if (payload?.suggestion) {
      upsertRecord(store.suggestions, payload.suggestion);
    } else if (suggestion) {
      const statusMap: Record<string, string> = {
        accept: 'ACCEPTED',
        dismiss: 'DISMISSED',
        defer: 'DEFERRED',
      };
      const changedAt = now();
      suggestion.status = statusMap[action] || suggestion.status;
      suggestion.updatedAt = changedAt;
      suggestion.suggestionDetail = {
        ...suggestion.suggestionDetail,
        status: suggestion.status,
        acceptedAt: action === 'accept' ? changedAt : suggestion.suggestionDetail?.acceptedAt,
        dismissedAt: action === 'dismiss' ? changedAt : suggestion.suggestionDetail?.dismissedAt,
        deferredAt: action === 'defer' ? changedAt : suggestion.suggestionDetail?.deferredAt,
      };
    }
    saveStore(store);
  }
}

export function handleLocalRequest<T>(path: string, options: RequestInit = {}): T | undefined {
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(path, 'http://local');
  const store = loadStore();
  const body = options.body ? JSON.parse(String(options.body)) : {};
  const page = Number(url.searchParams.get('page') || 1);
  const limit = Number(url.searchParams.get('limit') || 50);

  if (url.pathname === '/dashboard/overview' && method === 'GET') {
    return dashboardOverview(store) as T;
  }

  const collections: Record<string, keyof LocalStore> = {
    '/v1/projects': 'projects',
    '/v1/tasks': 'tasks',
    '/v1/goals': 'goals',
    '/issues': 'issues',
    '/suggestions': 'suggestions',
    '/reviews': 'reviews',
  };

  const collectionKey = collections[url.pathname];
  if (collectionKey && method === 'GET') {
    return listResponse(
      store[collectionKey] as StoreRecord[],
      page,
      limit,
      url.searchParams.get('status')
    ) as T;
  }

  if (url.pathname === '/v1/projects' && method === 'POST') {
    const record = createProjectRecord(body);
    store.projects.unshift(record);
    saveStore(store);
    return record as T;
  }

  if (url.pathname === '/v1/tasks' && method === 'POST') {
    const record = createTaskRecord(body);
    store.tasks.unshift(record);
    saveStore(store);
    return record as T;
  }

  if (url.pathname === '/v1/goals' && method === 'POST') {
    const record = createGoalRecord(body);
    store.goals.unshift(record);
    saveStore(store);
    return record as T;
  }

  if (url.pathname === '/issues' && method === 'POST') {
    const record = createIssueRecord(body);
    record.issueDetail.workItemId = record.id;
    store.issues.unshift(record);
    store.suggestions.unshift(
      createSuggestionRecord({
        title: `处理问题：${record.title}`,
        description: record.description || record.issueDetail?.description,
        priority: record.priority,
        sourceType: 'ISSUE',
        sourceRefId: record.id,
        issueId: record.id,
        reason: record.description || '新记录的问题需要确认责任动作并跟进。',
        evidence: {
          level: record.issueDetail?.level,
          status: record.status,
        },
      })
    );
    saveStore(store);
    return record as T;
  }

  const suggestionAcceptMatch = url.pathname.match(/^\/suggestions\/([^/]+)\/accept$/);
  if (suggestionAcceptMatch && method === 'PATCH') {
    const suggestion = store.suggestions.find((entry) => entry.id === suggestionAcceptMatch[1] && !entry.deletedAt);
    if (!suggestion) return undefined;
    const changedAt = now();
    suggestion.status = 'ACCEPTED';
    suggestion.updatedAt = changedAt;
    suggestion.suggestionDetail = {
      ...suggestion.suggestionDetail,
      status: 'ACCEPTED',
      acceptedAt: changedAt,
    };
    saveStore(store);
    return { suggestion, decision: { id: uid('decision'), status: 'ACCEPTED' } } as T;
  }

  const suggestionTaskMatch = url.pathname.match(/^\/suggestions\/([^/]+)\/create-adjustment-task$/);
  if (suggestionTaskMatch && method === 'POST') {
    const suggestion = store.suggestions.find((entry) => entry.id === suggestionTaskMatch[1] && !entry.deletedAt);
    if (!suggestion) return undefined;
    const task = createTaskRecord({
      title: body.title || suggestion.title,
      description: body.description || suggestion.description || suggestion.suggestionDetail?.reason,
      priority: body.priority || suggestion.priority || suggestion.suggestionDetail?.priority || 'P1',
      domainId: body.domainId || suggestion.domainId || 'work',
      estimatedMinutes: body.estimatedMinutes || 45,
    });
    store.tasks.unshift(task);
    const changedAt = now();
    suggestion.status = 'ACCEPTED';
    suggestion.updatedAt = changedAt;
    suggestion.suggestionDetail = {
      ...suggestion.suggestionDetail,
      status: 'ACCEPTED',
      isConverted: true,
      convertedTaskId: task.id,
      acceptedAt: suggestion.suggestionDetail?.acceptedAt || changedAt,
    };
    saveStore(store);
    return task as T;
  }

  const suggestionStateMatch = url.pathname.match(/^\/suggestions\/([^/]+)\/(dismiss|defer)$/);
  if (suggestionStateMatch && method === 'PATCH') {
    const [, id, action] = suggestionStateMatch;
    const suggestion = store.suggestions.find((entry) => entry.id === id && !entry.deletedAt);
    if (!suggestion) return undefined;
    const nextStatus = action === 'dismiss' ? 'DISMISSED' : 'DEFERRED';
    const changedAt = now();
    suggestion.status = nextStatus;
    suggestion.updatedAt = changedAt;
    suggestion.suggestionDetail = {
      ...suggestion.suggestionDetail,
      status: nextStatus,
      dismissedAt: action === 'dismiss' ? changedAt : suggestion.suggestionDetail?.dismissedAt,
      deferredAt: action === 'defer' ? changedAt : suggestion.suggestionDetail?.deferredAt,
    };
    saveStore(store);
    return suggestion as T;
  }

  if (url.pathname === '/reviews/generate-draft' && method === 'POST') {
    const record = createReviewRecord({
      title: '快速复盘草稿',
      summary: '由全局指挥台快速生成，等待补充复盘内容。',
      cycleId: body.cycleId,
    });
    record.reviewDetail.workItemId = record.id;
    store.reviews.unshift(record);
    saveStore(store);
    return record as T;
  }

  const reviewCompleteMatch = url.pathname.match(/^\/reviews\/([^/]+)\/complete$/);
  if (reviewCompleteMatch && method === 'PATCH') {
    const review = store.reviews.find((entry) => entry.id === reviewCompleteMatch[1] && !entry.deletedAt);
    if (!review) return undefined;
    const changedAt = now();
    review.status = 'COMPLETED';
    review.updatedAt = changedAt;
    review.reviewDetail = {
      ...review.reviewDetail,
      status: 'COMPLETED',
      isDraft: false,
      reviewedBy: body.reviewedBy || review.reviewDetail?.reviewedBy,
      reviewedAt: changedAt,
    };
    saveStore(store);
    return review.reviewDetail as T;
  }

  const itemMatch = url.pathname.match(/^\/(v1\/projects|v1\/tasks|v1\/goals|issues|suggestions|reviews)\/([^/]+)$/);
  if (itemMatch) {
    const [, collectionPath, id] = itemMatch;
    const map: Record<string, keyof LocalStore> = {
      'v1/projects': 'projects',
      'v1/tasks': 'tasks',
      'v1/goals': 'goals',
      issues: 'issues',
      suggestions: 'suggestions',
      reviews: 'reviews',
    };
    const key = map[collectionPath];
    const list = store[key] as StoreRecord[];
    const item = list.find((entry) => entry.id === id && !entry.deletedAt);
    if (!item) return undefined;

    if (method === 'GET') return item as T;
    if (method === 'PATCH') {
      if (collectionPath === 'reviews') {
        item.reviewDetail = {
          ...item.reviewDetail,
          ...body,
        };
        if (body.title) item.title = body.title;
        if (body.description) item.description = body.description;
        item.updatedAt = now();
      } else if (collectionPath === 'issues') {
        Object.assign(item, body, { updatedAt: now() });
        item.status = body.status || item.status;
        item.issueDetail = {
          ...item.issueDetail,
          ...(body.issueDetail || {}),
          status: body.issueDetail?.status || body.status || item.issueDetail?.status,
        };
      } else if (collectionPath === 'suggestions') {
        Object.assign(item, body, { updatedAt: now() });
        item.status = body.status || body.suggestionDetail?.status || item.status;
        item.suggestionDetail = {
          ...item.suggestionDetail,
          ...(body.suggestionDetail || {}),
          status: body.suggestionDetail?.status || body.status || item.suggestionDetail?.status,
          priority: body.priority || body.suggestionDetail?.priority || item.suggestionDetail?.priority,
          reason: body.suggestionDetail?.reason ?? item.suggestionDetail?.reason,
          evidence: body.suggestionDetail?.evidence ?? item.suggestionDetail?.evidence,
        };
      } else if (collectionPath === 'v1/projects') {
        Object.assign(item, body, { updatedAt: now() });
        item.projectDetail = {
          ...item.projectDetail,
          progress: body.progress ?? item.projectDetail?.progress ?? 0,
          healthStatus: body.healthStatus ?? item.projectDetail?.healthStatus,
          budget: body.budget ?? item.projectDetail?.budget,
          actualCost: body.actualCost ?? item.projectDetail?.actualCost,
        };
        const goalId = body.metadata?.goalId;
        const goalTitle = body.metadata?.goalTitle;
        item.parent = goalId ? { id: goalId, title: goalTitle || '关联目标', itemType: 'GOAL' } : item.parent;
      } else if (collectionPath === 'v1/goals') {
        Object.assign(item, body, { updatedAt: now() });
        item.goalDetail = {
          ...item.goalDetail,
          progress: body.progress ?? item.goalDetail?.progress ?? 0,
          targetDate: body.targetDate ?? item.goalDetail?.targetDate,
          targetValue: body.targetValue ?? item.goalDetail?.targetValue,
          currentValue: body.currentValue ?? item.goalDetail?.currentValue,
          unit: body.unit ?? item.goalDetail?.unit,
          weight: body.weight ?? item.goalDetail?.weight,
        };
      } else {
        Object.assign(item, body, { updatedAt: now() });
      }
      saveStore(store);
      return item as T;
    }
    if (method === 'DELETE') {
      item.deletedAt = now();
      item.updatedAt = item.deletedAt;
      saveStore(store);
      return item as T;
    }
  }

  const taskActionMatch = url.pathname.match(/^\/v1\/tasks\/([^/]+)\/(start|complete|cancel)$/);
  if (taskActionMatch && method === 'POST') {
    const [, id, action] = taskActionMatch;
    const task = store.tasks.find((entry) => entry.id === id && !entry.deletedAt);
    if (!task) return undefined;
    if (action === 'start') {
      task.status = 'IN_PROGRESS';
      task.plannedStartAt = task.plannedStartAt || now();
      task.taskDetail = {
        ...task.taskDetail,
        scheduledStartAt: task.taskDetail?.scheduledStartAt || task.plannedStartAt,
      };
    }
    if (action === 'complete') {
      const completedAt = now();
      const startedAt = task.plannedStartAt || task.taskDetail?.scheduledStartAt;
      const calculatedMinutes =
        startedAt
          ? Math.max(1, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000))
          : undefined;
      task.status = 'DONE';
      task.completedAt = completedAt;
      task.taskDetail = {
        ...task.taskDetail,
        completionNote: body.completionNote,
        actualMinutes: body.actualMinutes ?? calculatedMinutes ?? task.taskDetail?.actualMinutes,
      };
    }
    if (action === 'cancel') task.status = 'CANCELLED';
    task.updatedAt = now();
    saveStore(store);
    return task as T;
  }

  return undefined;
}
