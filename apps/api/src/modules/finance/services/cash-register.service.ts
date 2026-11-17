import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { FinancialAuditService } from './financial-audit.service';
import {
  OpenCashRegisterInput,
  CloseCashRegisterInput,
  ReopenCashRegisterInput,
  QueryCashSessionsInput,
} from '@matabai/validation';
import { CashSessionStatus } from '@matabai/shared';

@Injectable()
export class CashRegisterService {
  private readonly logger = new Logger(CashRegisterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: FinancialAuditService,
  ) {}

  /**
   * Generates sequential unique session number: CRS-YYYYMM-XXXX
   */
  public async generateSessionNumber(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const prefix = `CRS-${yearMonth}-`;

    const count = await this.prisma.cashRegisterSession.count({
      where: {
        organizationId,
        sessionNumber: { startsWith: prefix },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Open a new cash register shift session.
   */
  public async openSession(
    organizationId: string,
    data: OpenCashRegisterInput,
    actorId: string,
  ) {
    const clinic = await this.prisma.clinic.findFirst({
      where: { id: data.clinicId, organizationId },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${data.clinicId} not found`);
    }

    // Check for existing open session in this clinic
    const existingOpenSession = await this.prisma.cashRegisterSession.findFirst({
      where: {
        clinicId: data.clinicId,
        status: CashSessionStatus.OPEN,
      },
    });

    if (existingOpenSession) {
      throw new ConflictException(
        `A cash register session (${existingOpenSession.sessionNumber}) is already OPEN for this clinic. Please close the active session first.`,
      );
    }

    const sessionNumber = await this.generateSessionNumber(organizationId);
    const openingBalanceMinor = Math.max(0, data.openingBalanceMinor || 0);

    const session = await this.prisma.cashRegisterSession.create({
      data: {
        organizationId,
        clinicId: data.clinicId,
        sessionNumber,
        openedById: actorId,
        openingBalanceMinor,
        expectedClosingMinor: openingBalanceMinor,
        status: CashSessionStatus.OPEN,
        openedAt: new Date(),
      },
      include: {
        openedBy: true,
        clinic: true,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: data.clinicId,
      actorId,
      entityType: 'CASH_REGISTER',
      entityId: session.id,
      action: 'REGISTER_OPENED',
      newValues: {
        sessionNumber: session.sessionNumber,
        openingBalanceMinor: session.openingBalanceMinor,
      },
    });

    this.logger.log(`Cash session opened: ${session.sessionNumber} for clinic ${data.clinicId}`);
    return session;
  }

  /**
   * Get active open session for a clinic.
   */
  public async getActiveSession(organizationId: string, clinicId: string) {
    return this.prisma.cashRegisterSession.findFirst({
      where: {
        organizationId,
        clinicId,
        status: CashSessionStatus.OPEN,
      },
      include: {
        openedBy: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  /**
   * Close cash register session with physical cash count and discrepancy verification.
   */
  public async closeSession(
    organizationId: string,
    sessionId: string,
    data: CloseCashRegisterInput,
    actorId: string,
  ) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id: sessionId, organizationId },
      include: { transactions: true },
    });

    if (!session) {
      throw new NotFoundException(`Cash register session ${sessionId} not found`);
    }

    if (session.status === CashSessionStatus.CLOSED) {
      throw new BadRequestException('Cash register session is already CLOSED');
    }

    const discrepancyMinor = data.actualClosingMinor - session.expectedClosingMinor;

    if (discrepancyMinor !== 0 && !data.discrepancyReason?.trim()) {
      const pkrDiff = (Math.abs(discrepancyMinor) / 100).toFixed(2);
      const direction = discrepancyMinor > 0 ? 'Surplus' : 'Deficit';
      throw new BadRequestException(
        `Discrepancy detected: Physical cash count differs from expected balance by PKR ${pkrDiff} (${direction}). A detailed explanation is mandatory before closing.`,
      );
    }

    const closed = await this.prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        actualClosingMinor: data.actualClosingMinor,
        discrepancyMinor,
        discrepancyReason: data.discrepancyReason?.trim() || null,
        status: CashSessionStatus.CLOSED,
        closedAt: new Date(),
        closedById: actorId,
      },
      include: {
        openedBy: true,
        closedBy: true,
        transactions: true,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: session.clinicId,
      actorId,
      entityType: 'CASH_REGISTER',
      entityId: session.id,
      action: 'REGISTER_CLOSED',
      previousValues: {
        status: session.status,
        expectedClosingMinor: session.expectedClosingMinor,
      },
      newValues: {
        status: closed.status,
        actualClosingMinor: closed.actualClosingMinor,
        discrepancyMinor: closed.discrepancyMinor,
        discrepancyReason: closed.discrepancyReason,
      },
      reason: closed.discrepancyReason,
    });

    return closed;
  }

  /**
   * Reopen a closed register session for emergency administrative audit corrections.
   */
  public async reopenSession(
    organizationId: string,
    sessionId: string,
    data: ReopenCashRegisterInput,
    actorId: string,
  ) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      throw new NotFoundException(`Cash register session ${sessionId} not found`);
    }

    if (session.status !== CashSessionStatus.CLOSED) {
      throw new BadRequestException(`Cannot reopen a session with status: ${session.status}`);
    }

    const reopened = await this.prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        status: CashSessionStatus.REOPENED_AUDIT,
        reopenedAt: new Date(),
        reopenedById: actorId,
        reopenReason: data.reason,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: session.clinicId,
      actorId,
      entityType: 'CASH_REGISTER',
      entityId: session.id,
      action: 'REGISTER_REOPENED',
      previousValues: { status: session.status },
      newValues: { status: reopened.status, reopenReason: data.reason },
      reason: data.reason,
    });

    return reopened;
  }

  /**
   * Query cash register sessions history with filters.
   */
  public async querySessions(organizationId: string, query: QueryCashSessionsInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (query.clinicId) where.clinicId = query.clinicId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.cashRegisterSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          openedBy: true,
          closedBy: true,
          transactions: true,
          clinic: true,
        },
      }),
      this.prisma.cashRegisterSession.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
