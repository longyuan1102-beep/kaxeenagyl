import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface LogData {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  summary: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: LogData) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          summary: data.summary,
        },
      });
    } catch (error) {
      console.error('审计日志记录失败:', error);
    }
  }
}
