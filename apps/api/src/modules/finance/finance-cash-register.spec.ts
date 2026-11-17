import { Test, TestingModule } from '@nestjs/testing';
import { CashRegisterService } from './services/cash-register.service';
import { FinancialAuditService } from './services/financial-audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CashSessionStatus } from '@matabai/shared';

describe('CashRegisterService', () => {
  let service: CashRegisterService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockOrgId = 'org-101';
  const mockClinicId = 'clinic-1';
  const mockActorId = 'actor-1';

  beforeEach(async () => {
    mockPrisma = {
      clinic: {
        findFirst: jest.fn(),
      },
      cashRegisterSession: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockAudit = {
      recordAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashRegisterService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FinancialAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<CashRegisterService>(CashRegisterService);
  });

  describe('openSession', () => {
    it('should open a new cash session with initial opening balance', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId, organizationId: mockOrgId });
      mockPrisma.cashRegisterSession.findFirst.mockResolvedValue(null);
      mockPrisma.cashRegisterSession.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'crs-1', ...args.data }),
      );

      const session = await service.openSession(
        mockOrgId,
        { clinicId: mockClinicId, openingBalanceMinor: 500000 }, // PKR 5,000 float
        mockActorId,
      );

      expect(session).toBeDefined();
      expect(session.openingBalanceMinor).toBe(500000);
      expect(session.status).toBe(CashSessionStatus.OPEN);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'CASH_REGISTER', action: 'REGISTER_OPENED' }),
      );
    });

    it('should prevent opening a second session if a session is already OPEN for the clinic', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId, organizationId: mockOrgId });
      mockPrisma.cashRegisterSession.findFirst.mockResolvedValue({
        id: 'existing-session',
        sessionNumber: 'CRS-202611-0001',
        status: CashSessionStatus.OPEN,
      });

      await expect(
        service.openSession(
          mockOrgId,
          { clinicId: mockClinicId, openingBalanceMinor: 10000 },
          mockActorId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('closeSession', () => {
    it('should close cash session when counted cash matches expected closing balance', async () => {
      mockPrisma.cashRegisterSession.findFirst.mockResolvedValue({
        id: 'crs-1',
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        status: CashSessionStatus.OPEN,
        expectedClosingMinor: 850000,
        transactions: [],
      });

      mockPrisma.cashRegisterSession.update.mockResolvedValue({
        id: 'crs-1',
        status: CashSessionStatus.CLOSED,
        actualClosingMinor: 850000,
        discrepancyMinor: 0,
      });

      const closed = await service.closeSession(
        mockOrgId,
        'crs-1',
        { actualClosingMinor: 850000 },
        mockActorId,
      );

      expect(closed.status).toBe(CashSessionStatus.CLOSED);
      expect(closed.discrepancyMinor).toBe(0);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'CASH_REGISTER', action: 'REGISTER_CLOSED' }),
      );
    });

    it('should reject closing session if cash discrepancy exists without an explanation reason', async () => {
      mockPrisma.cashRegisterSession.findFirst.mockResolvedValue({
        id: 'crs-1',
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        status: CashSessionStatus.OPEN,
        expectedClosingMinor: 1000000,
        transactions: [],
      });

      await expect(
        service.closeSession(
          mockOrgId,
          'crs-1',
          { actualClosingMinor: 950000 }, // PKR 500 deficit with no reason
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should permit closing with discrepancy when a justification reason is supplied', async () => {
      mockPrisma.cashRegisterSession.findFirst.mockResolvedValue({
        id: 'crs-1',
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        status: CashSessionStatus.OPEN,
        expectedClosingMinor: 1000000,
        transactions: [],
      });

      mockPrisma.cashRegisterSession.update.mockResolvedValue({
        id: 'crs-1',
        status: CashSessionStatus.CLOSED,
        actualClosingMinor: 950000,
        discrepancyMinor: -50000,
        discrepancyReason: 'Emergency courier payment paid from drawer without receipt',
      });

      const closed = await service.closeSession(
        mockOrgId,
        'crs-1',
        {
          actualClosingMinor: 950000,
          discrepancyReason: 'Emergency courier payment paid from drawer without receipt',
        },
        mockActorId,
      );

      expect(closed.status).toBe(CashSessionStatus.CLOSED);
      expect(closed.discrepancyMinor).toBe(-50000);
    });
  });

  describe('reopenSession', () => {
    it('should reopen a closed session for audit with a valid explanation', async () => {
      mockPrisma.cashRegisterSession.findFirst.mockResolvedValue({
        id: 'crs-1',
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        status: CashSessionStatus.CLOSED,
      });

      mockPrisma.cashRegisterSession.update.mockResolvedValue({
        id: 'crs-1',
        status: CashSessionStatus.REOPENED_AUDIT,
      });

      const reopened = await service.reopenSession(
        mockOrgId,
        'crs-1',
        { reason: 'Late cash slip correction required' },
        mockActorId,
      );

      expect(reopened.status).toBe(CashSessionStatus.REOPENED_AUDIT);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'CASH_REGISTER', action: 'REGISTER_REOPENED' }),
      );
    });
  });
});
