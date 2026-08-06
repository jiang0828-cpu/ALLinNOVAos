/**
 * Mock @nova-os/database 模块，避免测试依赖真实 PrismaClient 生成。
 * 真实 prisma 单例在 `@nova-os/database/src/index.ts` 内 `new PrismaClient()`，
 * 若 PrismaClient 未生成会抛错；测试只需验证 PrismaService 的封装行为。
 */
jest.mock('@nova-os/database', () => ({
  prisma: {
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from '@nova-os/database';
import { PrismaService } from './prisma.service';

/** 显式类型，因 jest.mock 工厂返回值会被推断为 any */
const mockPrisma = prisma as unknown as {
  $disconnect: jest.Mock;
};

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PrismaService();
  });

  it('client 应返回 @nova-os/database 导出的 prisma 单例', () => {
    expect(service.client).toBe(prisma);
  });

  it('onModuleDestroy 应调用 prisma.$disconnect', async () => {
    await service.onModuleDestroy();

    expect(mockPrisma.$disconnect).toHaveBeenCalledTimes(1);
  });
});
