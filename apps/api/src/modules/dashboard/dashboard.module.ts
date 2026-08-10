import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardQueryService } from './services/dashboard-query.service';
import { DashboardSnapshotService } from './services/dashboard-snapshot.service';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardQueryService, DashboardSnapshotService],
  exports: [DashboardQueryService, DashboardSnapshotService],
})
export class DashboardModule {}
