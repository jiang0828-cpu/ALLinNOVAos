/**
 * Mock @nova-os/database 模块，避免 e2e 测试依赖真实 PrismaClient 生成与 PostgreSQL 连接。
 * 健康检查不需要数据库访问，仅验证 HTTP 层与全局过滤器/拦截器装配。
 */
jest.mock('@nova-os/database', () => ({
  prisma: {
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface HealthResponseBody {
  code: number;
  message: string;
  data: {
    status: string;
    timestamp: string;
  };
}

interface ErrorResponseBody {
  code: number;
  message: string;
  data: null;
}

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // 复用 main.ts 中的全局 prefix，使实际路径为 /api/health
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET) 应返回统一结构 { code, message, data }', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as HealthResponseBody;
        expect(body.code).toBe(0);
        expect(body.message).toBe('success');
        expect(body.data.status).toBe('ok');
        expect(typeof body.data.timestamp).toBe('string');
        // timestamp 应为合法 ISO 字符串
        expect(Number.isNaN(Date.parse(body.data.timestamp))).toBe(false);
      });
  });

  it('/api/unknown (GET) 应被全局异常过滤器处理为 404 + 统一结构', () => {
    return request(app.getHttpServer())
      .get('/api/unknown')
      .expect(404)
      .expect((res) => {
        const body = res.body as ErrorResponseBody;
        expect(body.code).toBe(404);
        expect(body.data).toBeNull();
        expect(typeof body.message).toBe('string');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
