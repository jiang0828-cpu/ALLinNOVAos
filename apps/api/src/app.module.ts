import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    // 1. 配置模块（全局，读取 .env）
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 2. BullMQ + Redis 全局配置
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
          // BullMQ 硬性要求：禁用请求级重试上限
          maxRetriesPerRequest: null,
        },
      }),
    }),
    // 3. Prisma（全局，复用 @nova-os/database 单例）
    PrismaModule,
    // 4. 基础设施模块（健康检查）
    HealthModule,
  ],
  providers: [
    // 全局异常过滤器：统一错误响应为 { code, message, data: null }
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // 全局响应拦截器：统一包装为 { code, message, data }
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
