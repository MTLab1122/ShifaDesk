import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from './services/reconciliation.service';
import { FinancialAuditService } from './services/financial-audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { ReconciliationStatus } from '@matabai/shared';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockOrgId = 'org-101';
  const mockActorId = 'actor-1';

  beforeEach(async () => {
    mockPrisma = {
      payment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    mockAudit = {
      recordAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FinancialAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  describe('getReconciliationReport', () => {
    it('should classify cash and unique bank transfers as MATCHED', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          paymentReference: 'PAY-202611-0001',
          method: 'CASH',
          amountMinor: 100000,
          createdAt: new Date(),
        },
        {
          id: 'pay-2',
          paymentReference: 'PAY-202611-0002',
          method: 'BANK_TRANSFER',
          bankReference: 'IBFT-112233',
          amountMinor: 200000,
          createdAt: new Date(),
        },
      ]);

      const report = await service.getReconciliationReport(mockOrgId);

      expect(report.totalPaymentsAudited).toBe(2);
      expect(report.matchedCount).toBe(2);
      expect(report.unmatchedCount).toBe(0);
      expect(report.discrepancyCount).toBe(0);
      expect(report.reconciliationRatePercentage).toBe(100);
    });

    it('should flag duplicate bank transfer references as DISCREPANCY', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          paymentReference: 'PAY-202611-0001',
          method: 'BANK_TRANSFER',
          bankReference: 'DUP-REF-100',
          amountMinor: 100000,
          createdAt: new Date(),
        },
        {
          id: 'pay-2',
          paymentReference: 'PAY-202611-0002',
          method: 'BANK_TRANSFER',
          bankReference: 'DUP-REF-100', // Duplicate!
          amountMinor: 100000,
          createdAt: new Date(),
        },
      ]);

      const report = await service.getReconciliationReport(mockOrgId);

      expect(report.matchedCount).toBe(1);
      expect(report.discrepancyCount).toBe(1);
      expect(report.items[1]?.status).toBe(ReconciliationStatus.DISCREPANCY);
    });

    it('should flag bank transfers without reference as UNMATCHED', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          paymentReference: 'PAY-202611-0001',
          method: 'BANK_TRANSFER',
          bankReference: null,
          amountMinor: 100000,
          createdAt: new Date(),
        },
      ]);

      const report = await service.getReconciliationReport(mockOrgId);

      expect(report.unmatchedCount).toBe(1);
      expect(report.items[0]?.status).toBe(ReconciliationStatus.UNMATCHED);
    });
  });

  describe('reconcileManually', () => {
    it('should authorize manual reconciliation and record an immutable audit entry', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        paymentReference: 'PAY-202611-0001',
        clinicId: 'clinic-1',
      });

      const result = await service.reconcileManually(
        mockOrgId,
        {
          itemType: 'PAYMENT',
          reference: 'PAY-202611-0001',
          matchedReference: 'BANK-SLIP-7788',
          notes: 'Customer presented physical deposit slip stamped by branch teller',
        },
        mockActorId,
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe(ReconciliationStatus.MANUALLY_RECONCILED);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'PAYMENT', action: 'ADJUSTED' }),
      );
    });
  });
});
