# NOVA OS

> 基于 PDCAr (Plan-Do-Check-Act-Review) 方法论的个人指挥系统
> A Personal Command System based on PDCAr methodology

## 技术栈 (Tech Stack)

| 层级 (Layer) | 技术 (Technology) |
|--------------|-------------------|
| 前端 (Frontend) | Next.js 16 + React 19 + TypeScript |
| 后端 (Backend) | NestJS 11 + TypeScript |
| 数据库 (Database) | PostgreSQL 16 + Prisma 6 |
| 缓存/队列 (Cache & Queue) | Redis 7 |
| 包管理 (Package Manager) | pnpm 9 |
| 容器化 (Container) | Docker Compose |

## 项目结构 (Project Structure)

```
nova-os/
├── apps/
│   ├── api/                  # NestJS 后端
│   │   ├── src/
│   │   │   ├── main.ts       # 入口文件
│   │   │   ├── app.module.ts # 根模块
│   │   │   ├── prisma/       # Prisma 服务
│   │   │   └── modules/      # 业务模块
│   │   └── package.json
│   └── web/                  # Next.js 前端
│       ├── src/
│       │   ├── app/          # App Router 页面
│       │   ├── components/   # React 组件
│       │   └── services/     # API 服务
│       └── package.json
├── packages/
│   ├── database/             # Prisma Schema + Migration
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   ├── shared-types/         # 前后端共享类型
│   │   └── src/index.ts
│   └── business-rules/       # PDCAr 规则 + 评分规则
│       └── src/
├── docs/                     # 文档
├── infra/
│   └── docker-compose.yml    # 基础设施
├── scripts/                  # 脚本
├── .env.example              # 环境变量模板
├── pnpm-workspace.yaml       # pnpm 工作区配置
├── tsconfig.json             # TypeScript 配置
└── package.json              # 根 package.json
```

## 快速开始 (Quick Start)

### 1. 安装依赖 (Install Dependencies)

```bash
# 安装 pnpm (如果未安装)
npm install -g pnpm@9.1.0

# 安装所有依赖
pnpm install
```

### 2. 启动基础设施 (Start Infrastructure)

```bash
# 启动 PostgreSQL + Redis
pnpm docker:up

# 停止
pnpm docker:down
```

### 3. 初始化数据库 (Initialize Database)

```bash
# 复制环境变量
cp .env.example .env

# 生成 Prisma Client
pnpm db:generate

# 创建数据库迁移
pnpm db:migrate

# 播种初始数据
pnpm db:seed
```

### 4. 启动开发服务器 (Start Development Servers)

```bash
# 同时启动前端和后端
pnpm dev

# 单独启动后端
pnpm dev:api

# 单独启动前端
pnpm dev:web
```

### 5. 访问应用 (Access Application)

> **端口说明 (Port Note)**：默认端口为 API `3003` / Web `3004`。
> 本机 3000–3002 端口被其他 Node 进程占用，故使用 3003/3004。
> 如需更改，可设置环境变量 `PORT`（后端）或修改 `apps/web/package.json` 的 `-p` 参数（前端）。

- 前端 (Frontend): http://localhost:3004
- 后端 API (Backend API): http://localhost:3003/api
- Swagger 文档 (Swagger Docs): http://localhost:3003/api/docs

前端通过 Next.js rewrites 将 `/api/*` 代理到后端，因此前端代码可直接请求 `/api/...`。
The frontend proxies `/api/*` to the backend via Next.js rewrites, so frontend code can call `/api/...` directly.

## PDCAr 方法论 (Methodology)

PDCAr 是戴明环 PDCA 的增强版本，新增 **r — Review 复盘** 阶段：

| 阶段 (Stage) | 中文 (Chinese) | 核心对象 (Objects) |
|--------------|----------------|-------------------|
| P — Plan | 计划 | goal / project / idea |
| D — Do | 执行 | task |
| C — Check | 检查 | issue / metric |
| A — Act | 行动/调整 | suggestion / decision |
| r — Review | 复盘 | review / insight |

详细文档见 [docs/](docs/) 目录。

## 核心业务链路 (Business Chain)

```
Idea → Goal → Project → Task → Metric → Issue 
  → Suggestion / Decision → Review → Insight → Next Cycle Plan
```

## 可用脚本 (Available Scripts)

### 开发 (Development)
- `pnpm dev` — 同时启动前后端
- `pnpm dev:api` — 启动后端 (NestJS)
- `pnpm dev:web` — 启动前端 (Next.js)

### 构建 (Build)
- `pnpm build` — 构建所有包
- `pnpm build:api` — 构建后端
- `pnpm build:web` — 构建前端

### 数据库 (Database)
- `pnpm db:generate` — 生成 Prisma Client
- `pnpm db:migrate` — 创建新迁移
- `pnpm db:migrate:deploy` — 部署迁移
- `pnpm db:seed` — 播种数据
- `pnpm db:studio` — 打开 Prisma Studio

### 容器 (Docker)
- `pnpm docker:up` — 启动基础设施
- `pnpm docker:down` — 停止基础设施

## 数据库规则 (Database Rules)

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

## AI 权限规则 (AI Permission Rules)

1. AI 可以生成建议、复盘草稿和任务草稿
2. AI 不能直接删除数据
3. AI 不能直接修改目标值、评分规则和历史记录
4. AI 创建真实任务前必须由用户确认
5. 默认不将原始健康、财务敏感数据发送到外部 AI

## 技术文档 (Documentation)

- [AI 开发规则](docs/ai-development-rules.md)
- [产品模型](docs/product-model.md)
- [PDCAr 模型](docs/pdcar-model.md)
- [数据字典](docs/data-dictionary.md)
- [状态机定义](docs/state-machines.md)
- [评分规则](docs/score-rules.md)
- [验收测试](docs/acceptance-tests.md)

## 许可证 (License)

Private — 仅供内部使用
