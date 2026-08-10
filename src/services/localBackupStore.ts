type StoreRecord = Record<string, any>;

const STORE_KEY = 'nova-os-local-store-v1';
const BACKUP_KEY = 'nova-os-local-backups-v1';
const WORKSPACE_ID = 'ws_default';

interface LocalStore {
  projects: StoreRecord[];
  tasks: StoreRecord[];
  issues: StoreRecord[];
  reviews: StoreRecord[];
  goals: StoreRecord[];
  updatedAt: string;
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
    reviews: [
      createReviewRecord({
        title: 'NOVA OS 今日复盘草稿',
        summary: '已启用指挥台快速启动、自动同步与本地备份。',
      }),
    ],
    goals: [],
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
    return {
      projects: parsed.projects || [],
      tasks: parsed.tasks || [],
      issues: parsed.issues || [],
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

function listResponse(data: StoreRecord[], page = 1, limit = 50) {
  const active = data.filter((item) => !item.deletedAt);
  const start = (page - 1) * limit;
  return {
    data: active.slice(start, start + limit),
    total: active.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(active.length / limit)),
  };
}

function createProjectRecord(payload: StoreRecord) {
  const createdAt = now();
  return {
    id: uid('project'),
    workspaceId: payload.workspaceId || WORKSPACE_ID,
    domainId: payload.domainId || 'work',
    title: payload.title || '新项目',
    description: payload.description || '',
    status: payload.status || 'ACTIVE',
    priority: payload.priority || 'P1',
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
    domainId: payload.domainId || 'work',
    projectId: payload.projectId,
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

function createReviewRecord(payload: StoreRecord) {
  const createdAt = now();
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
      reviewType: payload.reviewType || 'DAILY',
      cycleType: 'DAILY',
      period: new Date().toLocaleDateString('zh-CN'),
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

function dashboardOverview(store: LocalStore) {
  const openTasks = store.tasks.filter((task) => !task.deletedAt && task.status !== 'DONE');
  const activeProjects = store.projects.filter((project) => !project.deletedAt);
  const openIssues = store.issues.filter((issue) => !issue.deletedAt && issue.status === 'OPEN');
  const latestReview = store.reviews.filter((review) => !review.deletedAt)[0];

  return {
    overallScore: openIssues.length > 0 ? 78 : 86,
    domainScores: [
      { domainId: 'domain_health', domainName: 'health', score: 78 },
      { domainId: 'domain_wealth', domainName: 'wealth', score: 84 },
      { domainId: 'domain_work', domainName: 'work', score: Math.max(60, 88 - openTasks.length * 4) },
      { domainId: 'domain_content', domainName: 'content', score: 82 },
      { domainId: 'domain_learning', domainName: 'learning', score: 76 },
    ],
    todayFocus: openTasks.slice(0, 4).map((task) => ({
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
    pendingSuggestions: [
      {
        id: 'suggestion_local_next',
        title: openTasks.length > 0 ? '优先处理今日未完成任务' : '新建下一项关键任务',
        status: 'PENDING',
        impactScore: 82,
      },
    ],
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
    '/reviews': 'reviews',
  };

  const collectionKey = collections[url.pathname];
  if (collectionKey && method === 'GET') {
    return listResponse(store[collectionKey] as StoreRecord[], page, limit) as T;
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

  if (url.pathname === '/issues' && method === 'POST') {
    const record = createIssueRecord(body);
    record.issueDetail.workItemId = record.id;
    store.issues.unshift(record);
    saveStore(store);
    return record as T;
  }

  if (url.pathname === '/reviews/generate-draft' && method === 'POST') {
    const record = createReviewRecord({
      title: '快速复盘草稿',
      summary: '由全局指挥台快速生成，等待补充复盘内容。',
    });
    record.reviewDetail.workItemId = record.id;
    store.reviews.unshift(record);
    saveStore(store);
    return record as T;
  }

  const itemMatch = url.pathname.match(/^\/(v1\/projects|v1\/tasks|v1\/goals|issues|reviews)\/([^/]+)$/);
  if (itemMatch) {
    const [, collectionPath, id] = itemMatch;
    const map: Record<string, keyof LocalStore> = {
      'v1/projects': 'projects',
      'v1/tasks': 'tasks',
      'v1/goals': 'goals',
      issues: 'issues',
      reviews: 'reviews',
    };
    const key = map[collectionPath];
    const list = store[key] as StoreRecord[];
    const item = list.find((entry) => entry.id === id && !entry.deletedAt);
    if (!item) return undefined;

    if (method === 'GET') return item as T;
    if (method === 'PATCH') {
      Object.assign(item, body, { updatedAt: now() });
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
    if (action === 'start') task.status = 'IN_PROGRESS';
    if (action === 'complete') {
      task.status = 'DONE';
      task.completedAt = now();
      task.taskDetail = {
        ...task.taskDetail,
        completionNote: body.completionNote,
      };
    }
    if (action === 'cancel') task.status = 'CANCELLED';
    task.updatedAt = now();
    saveStore(store);
    return task as T;
  }

  return undefined;
}
