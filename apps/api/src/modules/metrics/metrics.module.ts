import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './services/metrics.service';
import { MetricCalculatorService } from './services/metric-calculator.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MetricsController],
  providers: [MetricsService, MetricCalculatorService],
  exports: [MetricsService, MetricCalculatorService],
})
export class MetricsModule {}
