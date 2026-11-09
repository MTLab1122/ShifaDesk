import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface CreateAuditLogParams {
  organizationId?: string | null;
  clinicId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          clinicId: params.clinicId,
          actorUserId: params.actorUserId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        },
      });
      this.logger.log(
        `Audit: [${params.action}] on ${params.resourceType} (${params.resourceId}) by actor ${params.actorUserId}`,
      );
    } catch (err) {
      this.logger.error(`Failed to record audit log: ${(err as Error).message}`);
    }
  }
}
