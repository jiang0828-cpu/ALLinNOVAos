import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * 全局 Prisma 模块
 *
 * 标记为 @Global 后，业务模块无需在 imports 中重复声明即可注入 PrismaService。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
