import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';

export interface RecordLabAuditParams {
  organizationId: string;
  clinicId?: string | null;
  actorId: string;
  entityType: 'TEST' | 'PACKAGE' | 'ORDER' | 'SAMPLE' | 'RESULT' | 'REPORT' | 'ACCESS_TOKEN';
  entityId: string;
  action:
    | 'CREATED'
    | 'UPDATED'
    | 'STATUS_CHANGED'
    | 'RESULT_ENTERED'
    | 'RESULT_AMENDED'
    | 'REVIEWED'
    | 'APPROVED'
    | 'RELEASED'
    | 'TOKEN_GENERATED'
    | 'REVOKED'
    | 'CANCELLED';
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

@Injectable()
export class LaboratoryAuditService {
  private readonly logger = new Logger(LaboratoryAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async recordAuditLog(params: RecordLabAuditParams): Promise<void> {
    try {
      await this.prisma.laboratoryAuditLog.create({
        data: {
          organizationId: params.organizationId,
          clinicId: params.clinicId || null,
          actorId: params.actorId,
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          previousValues: (params.previousValues as any) ?? {},
          newValues: (params.newValues as any) ?? {},
        },
      });
      this.logger.log(
        `Recorded laboratory audit: [${params.entityType}:${params.entityId}] action=${params.action} by actor=${params.actorId}`,
      );
    } catch (err: any) {
      // Never throw from audit logger to prevent breaking main business transactions
      this.logger.error(`Failed to write laboratory audit log: ${err.message}`);
    }
  }

  public async getAuditLogs(params: {
    organizationId: string;
    clinicId?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }) {
    return this.prisma.laboratoryAuditLog.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.clinicId ? { clinicId: params.clinicId } : {}),
        ...(params.entityType ? { entityType: params.entityType } : {}),
        ...(params.entityId ? { entityId: params.entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
    });
  }
}
