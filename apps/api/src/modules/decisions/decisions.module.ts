import { Module } from '@nestjs/common';
import { DecisionsService } from './services/decisions.service';
import { DecisionsController } from './decisions.controller';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}
