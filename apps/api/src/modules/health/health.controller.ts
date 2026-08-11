import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  database: {
    status: 'connected' | 'disconnected';
    provider: 'postgresql';
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns API and database status.' })
  @ApiOkResponse({ description: 'Service health status' })
  async check(): Promise<HealthResponse> {
    let databaseConnected = false;

    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      databaseConnected = false;
    }

    return {
      status: databaseConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: databaseConnected ? 'connected' : 'disconnected',
        provider: 'postgresql',
      },
    };
  }
}
