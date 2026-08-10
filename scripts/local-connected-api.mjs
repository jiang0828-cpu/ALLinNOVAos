import http from "node:http";

const port = Number(process.env.PORT || process.env.API_PORT || 3003);

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function ok(data) {
  return { code: 200, message: "OK", data };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function createGoalRecord(payload) {
  const now = new Date().toISOString();
  const progress = Number(payload.progress ?? 0);
  return {
    id: `goal_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    workspaceId: payload.workspaceId || "ws_default",
    domainId: payload.domainId || undefined,
    cycleId: payload.cycleId || undefined,
    title: payload.title,
    description: payload.description || "",
    status: "ACTIVE",
    priority: payload.priority || "P2",
    createdBy: "local-user",
    ownerId: "local-user",
    sourceType: "LOCAL_CONNECTED_API",
    plannedStartAt: payload.plannedStartAt,
    plannedEndAt: payload.plannedEndAt,
    completedAt: undefined,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    goalDetail: {
      id: `goal_detail_${Date.now()}`,
      targetValue: payload.targetValue,
      currentValue: payload.currentValue,
      unit: payload.unit,
      progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
      weight: payload.weight,
      targetDate: payload.targetDate,
    },
  };
}

let goals = [
  createGoalRecord({
    workspaceId: "ws_default",
    title: "完善 NOVA OS 本地运行体验",
    priority: "P1",
    domainId: "work",
    progress: 65,
    targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }),
];

const overview = {
  overallScore: 82,
  domainScores: [
    { domainId: "domain_health", domainName: "health", score: 78 },
    { domainId: "domain_wealth", domainName: "wealth", score: 84 },
    { domainId: "domain_work", domainName: "work", score: 72 },
    { domainId: "domain_content", domainName: "content", score: 88 },
    { domainId: "domain_learning", domainName: "learning", score: 76 },
  ],
  todayFocus: [
    {
      id: "focus_nova_mvp",
      title: "完成 NOVA OS 今日联调",
      itemType: "TASK",
      status: "IN_PROGRESS",
      priority: "P0",
    },
    {
      id: "focus_work_os",
      title: "检查 Work OS 三个业务入口",
      itemType: "TASK",
      status: "TODO",
      priority: "P1",
    },
  ],
  activeProjects: [
    {
      id: "project_work_os",
      title: "Work OS 业务入口集成",
      progress: 80,
      healthStatus: "ON_TRACK",
    },
  ],
  openIssues: [
    {
      id: "issue_local_connected",
      title: "本地连接模式已启用，正式数据后续接入 PostgreSQL",
      level: "LOW",
      status: "OPEN",
    },
  ],
  pendingSuggestions: [
    {
      id: "suggestion_next_api",
      title: "下一步接入真实数据库与 Redis 后台服务",
      status: "PENDING",
      impactScore: 78,
    },
  ],
  latestReview: {
    id: "review_local_run",
    title: "本地联调复盘",
    reviewType: "DAILY",
    status: "COMPLETED",
    reviewedAt: new Date().toISOString(),
  },
  activeInsights: [
    {
      id: "insight_local_connected",
      statement: "前端通过 /api 代理访问本地 3003 服务时会显示后端已连接。",
      insightType: "SYSTEM",
      confidence: 0.9,
      impactScore: 82,
    },
  ],
  lastUpdatedAt: new Date().toISOString(),
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/health") {
    sendJson(res, 200, ok({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }

  if (url.pathname === "/api/dashboard/overview") {
    sendJson(res, 200, ok({ ...overview, lastUpdatedAt: new Date().toISOString() }));
    return;
  }

  if (url.pathname === "/api/v1/goals" && req.method === "GET") {
    const status = url.searchParams.get("status")?.split(",").filter(Boolean) || [];
    const priority = url.searchParams.get("priority")?.split(",").filter(Boolean) || [];
    const domainId = url.searchParams.get("domainId");
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 50);

    const filtered = goals.filter((goal) => {
      if (goal.deletedAt) return false;
      if (status.length > 0 && !status.includes(goal.status)) return false;
      if (priority.length > 0 && !priority.includes(goal.priority)) return false;
      if (domainId && goal.domainId !== domainId) return false;
      return true;
    });

    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    sendJson(res, 200, ok({
      data,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    }));
    return;
  }

  if (url.pathname === "/api/v1/goals" && req.method === "POST") {
    try {
      const payload = await readBody(req);
      if (!payload.title || !String(payload.title).trim()) {
        sendJson(res, 400, { code: 400, message: "Goal title is required", data: null });
        return;
      }
      const goal = createGoalRecord({ ...payload, title: String(payload.title).trim() });
      goals = [goal, ...goals];
      sendJson(res, 200, ok(goal));
    } catch {
      sendJson(res, 400, { code: 400, message: "Invalid JSON body", data: null });
    }
    return;
  }

  const goalMatch = url.pathname.match(/^\/api\/v1\/goals\/([^/]+)$/);
  if (goalMatch) {
    const goalId = decodeURIComponent(goalMatch[1]);
    const goal = goals.find((item) => item.id === goalId && !item.deletedAt);

    if (!goal) {
      sendJson(res, 404, { code: 404, message: "Goal not found", data: null });
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, ok(goal));
      return;
    }

    if (req.method === "PATCH") {
      try {
        const payload = await readBody(req);
        Object.assign(goal, {
          ...payload,
          updatedAt: new Date().toISOString(),
          goalDetail: {
            ...goal.goalDetail,
            progress: payload.progress ?? goal.goalDetail?.progress ?? 0,
            targetDate: payload.targetDate ?? goal.goalDetail?.targetDate,
            targetValue: payload.targetValue ?? goal.goalDetail?.targetValue,
            currentValue: payload.currentValue ?? goal.goalDetail?.currentValue,
            unit: payload.unit ?? goal.goalDetail?.unit,
            weight: payload.weight ?? goal.goalDetail?.weight,
          },
        });
        sendJson(res, 200, ok(goal));
      } catch {
        sendJson(res, 400, { code: 400, message: "Invalid JSON body", data: null });
      }
      return;
    }

    if (req.method === "DELETE") {
      goal.deletedAt = new Date().toISOString();
      goal.updatedAt = goal.deletedAt;
      sendJson(res, 200, ok(goal));
      return;
    }
  }

  sendJson(res, 404, { code: 404, message: "Not Found", data: null });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`NOVA OS local connected API running on http://127.0.0.1:${port}/api`);
});
