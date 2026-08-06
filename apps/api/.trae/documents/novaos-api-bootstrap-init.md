# NOVA OS API — 后端基础能力初始化计划

## Context（背景与目标）

`@nova-os/api` 是 NOVA OS monorepo（pnpm workspace）中的 NestJS 后端子包。当前项目处于 NestJS CLI 模板初始状态：

- `main.ts` 已预置 Swagger `/api/docs`、全局 `ValidationPipe`、CORS、全局 prefix `/api`，但缺少全局异常过滤器和统一响应拦截器。
- `AppModule` 仍是空模块；`AppController/AppService` 是模板默认的 "Hello World!"，无实际用途。
- `@nova-os/database` workspace 包**已配置好 Prisma schema（含业务表）、PrismaClient 单例导出与 seed 脚本**，`@nova-os/api` 已通过 `workspace:*` 依赖它，并已安装 `@prisma/client`、`@nestjs/swagger`、`@nestjs/throttler`、`class-validator/transformer`。
- `docs/ai-development-rules.md` 是项目最高约束，明确技术栈（NestJS+TS、PostgreSQL 16、Prisma、Redis+BullMQ、UUID、UTC TIMESTAMPTZ）和命名规范（字段 camelCase、表 snake_case、枚举 UPPER_SNAKE_CASE）。

**目标**：在遵守「不创建业务模块 / 不创建业务表 / 不使用 any」三条限制下，搭好 API 的基础设施层（配置、数据库连接、队列、健康检查、统一响应、异常处理、Swagger、Jest 测试），为后续业务模块开发提供稳定底座。

**关键决策**（已与用户确认）：
1. Prisma 复用 `@nova-os/database` 导出的 `prisma` 单例（不重建 schema、不另起 PrismaClient）。
2. 健康检查实际路径为 `/api/health`（遵循现有全局 prefix `/api`，与 `/api/docs` 一致）。
3. 统一返回结构为 `{ code, message, data }`（`code: 0` 表示成功，非 0 为错误码）。
4. 删除默认 `AppController/AppService/AppController.spec.ts`，由 `HealthController` 取代。

---

## 实施步骤

### 步骤 0：安装依赖

在 `apps/api` 内执行（不安装 `prisma` CLI 与 `@prisma/client`，二者已在 `@nova-os/database` 包/当前 deps 内）：

```bash
pnpm --filter @nova-os/api add @nestjs/config @nestjs/bullmq bullmq ioredis
```

### 步骤 1：禁用 `any`（落实限制）

- [apps/api/tsconfig.json](file:///e:/AI/Codex/all%20in/NOVAOS/apps/api/tsconfig.json)：`"noImplicitAny": false` → `true`
- [apps/api/eslint.config.mjs](file:///e:/AI/Codex/all%20in/NOVAOS/apps/api/eslint.config.mjs)：`'@typescript-eslint/no-explicit-any': 'off'` → `'error'`

### 步骤 2：统一 API 返回结构

新建 `src/common/interfaces/api-response.interface.ts`：

```ts
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}
```

新建 `src/common/interceptors/transform.interceptor.ts`：实现 `NestInterceptor`，使用 `map` 把 controller 返回值包装为 `{ code: 0, message: 'success', data }`。若 controller 已返回 `ApiResponse` 结构则原样透传（避免双重包装）。

新建 `src/common/interceptors/transform.interceptor.spec.ts`：用 `Test.createTestingModule` 注入拦截器，验证普通对象/ApiResponse 两种输入的输出形态。

### 步骤 3：全局异常过滤器

新建 `src/common/filters/all-exceptions.filter.ts`：实现 `ExceptionFilter`，分三种分支：
- `HttpException` → 透传其 `statusCode` 与 `message`，`code` 取 HTTP status。
- `Prisma.PrismaClientKnownRequestError` → 映射 P2002/P2025 等为 4xx + 业务 code。
- 其他 `unknown` → 500 + `code: 5000`，日志记录 `error.message`。

日志使用 `Logger`（不直接 `console.log`）。响应体统一为 `{ code, message, data: null }`。

新建 `src/common/filters/all-exceptions.filter.spec.ts`：覆盖 HttpException / Prisma 已知错误 / 未知错误三类。

### 步骤 4：Prisma 封装（复用 database 单例）

新建 `src/infrastructure/database/prisma.service.ts`：

```ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@nova-os/database';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  get client() {
    return prisma;
  }
  async onModuleDestroy(): Promise<void> {
    await prisma.$disconnect();
  }
}
```

新建 `src/infrastructure/database/prisma.module.ts`：`@Module({ providers: [PrismaService], exports: [PrismaService] })`，标记 `@Global()` 供后续业务模块直接注入。

新建 `src/infrastructure/database/prisma.service.spec.ts`：验证 `client` getter 返回 `prisma` 单例。

### 步骤 5：BullMQ + Redis 配置

[apps/api/src/app.module.ts](file:///e:/AI/Codex/all%20in/NOVAOS/apps/api/src/app.module.ts) 内 `BullModule.forRootAsync`：注入 `ConfigService`，从 `REDIS_HOST` / `REDIS_PORT` 读取，`maxRetriesPerRequest` 设为 `null`（BullMQ 要求）。

### 步骤 6：ConfigModule 配置

`AppModule` 引入 `ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })`。

### 步骤 7：HealthController

新建 `src/modules/health/health.controller.ts`：

```ts
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: '服务健康' })
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

实际路径为 `/api/health`（全局 prefix `/api` 生效）。响应会被 `TransformInterceptor` 包装为 `{ code: 0, message: 'success', data: { status: 'ok', timestamp } }`。

新建 `src/modules/health/health.module.ts` 与 `health.controller.spec.ts`。

### 步骤 8：AppModule 装配

[apps/api/src/app.module.ts](file:///e:/AI/Codex/all%20in/NOVAOS/apps/api/src/app.module.ts)：

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    BullModule.forRootAsync({ inject: [ConfigService], useFactory: (cfg) => ({ connection: { host: cfg.get('REDIS_HOST'), port: Number(cfg.get('REDIS_PORT')), maxRetriesPerRequest: null } }) }),
    PrismaModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
```

> 全局 `ValidationPipe` 与 Swagger 保留在 `main.ts` 不动；`APP_FILTER/APP_INTERCEPTOR` 放 AppModule 以便 e2e 测试自动生效。

### 步骤 9：main.ts 微调

[apps/api/src/main.ts](file:///e:/AI/Codex/all%20in/NOVAOS/apps/api/src/main.ts)：保留现有 `setGlobalPrefix('api')`、`enableCors`、`ValidationPipe`、Swagger setup；给 `SwaggerModule.setup` 的 config 补 `.addTag('health')`。

### 步骤 10：.env.example

新建 [apps/api/.env.example](file:///e:/AI/Codex/all%20in/NOVAOS/apps/api/.env.example)：

```env
# Application
NODE_ENV=development
PORT=3003

# Database (PostgreSQL 16)
DATABASE_URL=postgresql://nova:nova@localhost:5432/nova_os?schema=public

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
CORS_ORIGIN=http://localhost:3004
```

### 步骤 11：Jest 测试

- 删除 `src/app.controller.ts`、`src/app.service.ts`、`src/app.controller.spec.ts`。
- 更新 [apps/api/test/app.e2e-spec.ts](file:///e:/AI/Codex/all%20in/NOVAOS/apps/api/test/app.e2e-spec.ts)：把测试目标改为 `GET /api/health`，断言 `200` 且 body 为 `{ code: 0, message: 'success', data: { status: 'ok' } }`。`createNestApplication` 时同样需要应用 `ValidationPipe` 与 `setGlobalPrefix('api')` 以贴近生产配置（或直接 `init` AppModule，由 `APP_FILTER/APP_INTERCEPTOR` 自动注册）。
- e2e 测试需要 mock Redis/BullMQ 连接：在 `beforeAll` 用 `ConfigModule` 的 `load` 注入测试环境变量，或用 `BullModule.forRoot` 的 `connection` 指向不存在的 host 但 `maxRetries` 设小。**简化方案**：e2e 测试时用 `Test.createTestingModule` 覆盖 `BullModule` 为空实现（`overrideProvider`），仅验证 HTTP 层。

---

## 修改的文件列表

### 新增（12 个）
- `apps/api/src/common/interfaces/api-response.interface.ts`
- `apps/api/src/common/interceptors/transform.interceptor.ts`
- `apps/api/src/common/interceptors/transform.interceptor.spec.ts`
- `apps/api/src/common/filters/all-exceptions.filter.ts`
- `apps/api/src/common/filters/all-exceptions.filter.spec.ts`
- `apps/api/src/infrastructure/database/prisma.service.ts`
- `apps/api/src/infrastructure/database/prisma.module.ts`
- `apps/api/src/infrastructure/database/prisma.service.spec.ts`
- `apps/api/src/modules/health/health.controller.ts`
- `apps/api/src/modules/health/health.module.ts`
- `apps/api/src/modules/health/health.controller.spec.ts`
- `apps/api/.env.example`

### 修改（5 个）
- `apps/api/src/main.ts`（补 Swagger tag）
- `apps/api/src/app.module.ts`（装配 ConfigModule/BullModule/PrismaModule/HealthModule + APP_FILTER/APP_INTERCEPTOR）
- `apps/api/package.json`（新增 4 个依赖）
- `apps/api/tsconfig.json`（`noImplicitAny: true`）
- `apps/api/eslint.config.mjs`（`no-explicit-any: error`）
- `apps/api/test/app.e2e-spec.ts`（改测 `/api/health`）

### 删除（3 个）
- `apps/api/src/app.controller.ts`
- `apps/api/src/app.service.ts`
- `apps/api/src/app.controller.spec.ts`

---

## 启动和测试命令

```bash
# 1. 安装依赖（在 monorepo 根目录执行）
pnpm --filter @nova-os/api add @nestjs/config @nestjs/bullmq bullmq ioredis

# 2. 生成 Prisma Client（首次必须，依赖 @nova-os/database 的 schema）
pnpm --filter @nova-os/database db:generate

# 3. 准备环境变量
copy apps\api\.env.example apps\api\.env      # Windows
# cp apps/api/.env.example apps/api/.env        # macOS/Linux

# 4. 启动 PostgreSQL 与 Redis（需本地已运行；infra/ 下有 docker-compose 可用）

# 5. 启动开发模式（监听变更）
pnpm --filter @nova-os/api dev
# 等价：cd apps/api && pnpm run dev
# 启动后访问：
#   - API 根:      http://localhost:3003/api
#   - 健康检查:    http://localhost:3003/api/health
#   - Swagger 文档: http://localhost:3003/api/docs

# 6. 单元测试
pnpm --filter @nova-os/api test

# 7. e2e 测试
pnpm --filter @nova-os/api test:e2e

# 8. 覆盖率
pnpm --filter @nova-os/api test:cov

# 9. Lint（验证无 any）
pnpm --filter @nova-os/api lint
```

---

## 验证（Verification）

执行后逐项核对：

1. **依赖安装成功**：`apps/api/package.json` 含 4 个新依赖，`pnpm install` 无报错。
2. **lint 通过**：`pnpm --filter @nova-os/api lint` 零警告，确认无 `any` 残留。
3. **类型检查**：`pnpm --filter @nova-os/api build` 通过。
4. **单元测试全绿**：`pnpm --filter @nova-os/api test`，覆盖 health controller / transform interceptor / all-exceptions filter / prisma service。
5. **e2e 测试通过**：`GET /api/health` 返回 200 且 body 形如 `{ code: 0, message: 'success', data: { status: 'ok', timestamp: '...' } }`。
6. **Swagger 文档可访问**：浏览器打开 `http://localhost:3003/api/docs`，看到 `health` tag 与 `GET /health` 接口。
7. **统一响应生效**：任意 controller 返回值都被包装为 `{ code, message, data }`。
8. **异常处理生效**：访问不存在路由返回 `{ code: 404, message: 'Cannot GET ...', data: null }` 而非默认 HTML。
9. **Prisma 单例复用**：`PrismaService.client === prisma`（来自 `@nova-os/database`），未创建新 PrismaClient。
10. **限制遵守**：grep 全仓库 `src/` 下无 `business` 模块、无新 Prisma model、无 `: any` 类型标注。

---

## 不在本次范围

- 不创建任何业务模块（goal/project/task/idea/issue/suggestion/review/insight/decision）。
- 不创建任何业务数据库表（schema 已在 `@nova-os/database` 内，本次不动）。
- 不实现 BullMQ 队列消费者/生产者（仅配置 forRoot 连接）。
- 不实现鉴权/多租户/日志中间件等更高层能力。
