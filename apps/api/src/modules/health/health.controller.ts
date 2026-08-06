import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

/** 健康检查响应载荷 */
export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

/**
 * 健康检查控制器
 *
 * 实际路径为 `/api/health`（受全局 prefix `/api` 影响）。
 * 响应会被 `TransformInterceptor` 包装为 `{ code, message, data }` 结构。
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '健康检查', description: '返回服务存活状态' })
  @ApiOkResponse({ description: '服务健康' })
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
