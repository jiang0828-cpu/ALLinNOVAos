import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@nova-os/database';

/**
 * Prisma 服务（NestJS Provider）
 *
 * 复用 `@nova-os/database` 导出的全局 prisma 单例，
 * 不另起 PrismaClient 实例，保持 monorepo 内连接池单一来源。
 * 通过 `OnModuleDestroy` 在应用关闭时优雅断开连接。
 *
 * 注：typescript-eslint 的 projectService 解析 workspace 包 `@nova-os/database`
 * 时类型推断与 tsc 不一致（tsc 能正确推断 prisma 为 PrismaClient），
 * 故在使用处禁用相关 unsafe 规则。生产环境类型安全由 tsc 保证。
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private localPrisma: PrismaClient | null = null;

  /** 暴露 prisma 单例供业务模块使用 */
  get client(): PrismaClient {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (prisma) {
      return prisma;
    }
    
    // Fallback: create a new PrismaClient if the singleton is undefined
    this.logger.warn('Prisma singleton is undefined, creating new PrismaClient instance');
    if (!this.localPrisma) {
      this.localPrisma = new PrismaClient();
    }
    return this.localPrisma;
  }

  async onModuleDestroy(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (prisma) {
      await prisma.$disconnect();
    }
    if (this.localPrisma) {
      await this.localPrisma.$disconnect();
    }
  }
}
