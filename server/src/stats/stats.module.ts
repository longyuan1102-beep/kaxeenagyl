import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StatsController],
})
export class StatsModule {}