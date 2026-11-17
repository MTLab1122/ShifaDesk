import { Test, TestingModule } from '@nestjs/testing';
import { RefundService } from './services/refund.service';
import { FinancialAuditService } from './services/financial-audit.service';
import { NotificationSchedulerService } from '../notification/notification-scheduler.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { RefundStatus } from '@matabai/shared';

describe('RefundService', () => {
  let service: RefundService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockNotification: any;

  const mockOrgId = 'org-101';
  const mockClinicId = 'clinic-1';
  const mockPaymentId = 'pay-1';
  const mockInvoiceId = 'inv-1';
  const mockActorId = 'actor-1';

  beforeEach(async () => {
    mockPrisma = {
      refund: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
      },
      invoice: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const tx = {
          refund: {
            update: jest.fn().mockImplementation((args: any) =>
              Promise.resolve({ id: 'ref-1', ...args.data }),
            ),
          },
          invoice: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: mockInvoiceId,
              totalMinor: 200000,
              paidMinor: 200000,
              outstandingMinor: 0,
            }),
            update: jest.fn().mockImplementation((args: any) =>
              Promise.resolve({ id: mockInvoiceId, ...args.data }),
            ),
          },
          cashRegisterSession: {
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
          },
          cashRegisterTransaction: {
            create: jest.fn(),
          },
        };
        return callback(tx);
      }),
    };

    mockAudit = {
      recordAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    mockNotification = {
      scheduleFinancialNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FinancialAuditService, useValue: mockAudit },
        { provide: NotificationSchedulerService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
  });

  describe('requestRefund', () => {
    it('should create refund in PENDING_APPROVAL status when requested amount is valid', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: mockPaymentId,
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        invoiceId: mockInvoiceId,
        amountMinor: 100000, // PKR 1,000 paid
        currency: 'PKR',
        status: 'COMPLETED',
        refunds: [],
        invoice: { patientId: 'patient-1' },
      });

      mockPrisma.refund.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'ref-1', ...args.data }),
      );

      const refund = await service.requestRefund(
        mockOrgId,
        {
          paymentId: mockPaymentId,
          amountMinor: 50000, // PKR 500 partial refund
          reason: 'Doctor was called away on emergency',
        },
        mockActorId,
      );

      expect(refund).toBeDefined();
      expect(refund.status).toBe(RefundStatus.PENDING_APPROVAL);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'REFUND', action: 'REFUND_REQUESTED' }),
      );
    });

    it('should reject refund request exceeding remaining refundable payment amount', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: mockPaymentId,
        organizationId: mockOrgId,
        amountMinor: 50000,
        status: 'COMPLETED',
        refunds: [{ status: 'COMPLETED', amountMinor: 30000 }], // 300 already refunded
      });

      await expect(
        service.requestRefund(
          mockOrgId,
          {
            paymentId: mockPaymentId,
            amountMinor: 30000, // Remaining refundable is only 200
            reason: 'Excess refund test',
          },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewRefund', () => {
    it('should approve refund, update invoice balances, and dispatch notification', async () => {
      mockPrisma.refund.findFirst.mockResolvedValue({
        id: 'ref-1',
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        invoiceId: mockInvoiceId,
        amountMinor: 50000,
        status: RefundStatus.PENDING_APPROVAL,
        refundReference: 'REF-202611-0001',
        payment: { method: 'BANK_TRANSFER' },
        invoice: {
          id: mockInvoiceId,
          patientId: 'patient-1',
          invoiceReference: 'INV-202611-0001',
          clinic: { name: 'Main Clinic' },
        },
      });

      const approved = await service.reviewRefund(
        mockOrgId,
        'ref-1',
        { action: 'APPROVE' },
        mockActorId,
      );

      expect(approved.status).toBe(RefundStatus.COMPLETED);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'REFUND', action: 'REFUNDED' }),
      );
      expect(mockNotification.scheduleFinancialNotification).toHaveBeenCalled();
    });

    it('should reject refund with reason when action is REJECT', async () => {
      mockPrisma.refund.findFirst.mockResolvedValue({
        id: 'ref-1',
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        status: RefundStatus.PENDING_APPROVAL,
        payment: {},
        invoice: {},
      });

      mockPrisma.refund.update.mockResolvedValue({
        id: 'ref-1',
        status: RefundStatus.REJECTED,
        rejectionReason: 'Services were fully rendered according to policy',
      });

      const rejected = await service.reviewRefund(
        mockOrgId,
        'ref-1',
        { action: 'REJECT', rejectionReason: 'Services were fully rendered according to policy' },
        mockActorId,
      );

      expect(rejected.status).toBe(RefundStatus.REJECTED);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'REFUND', action: 'REFUND_REJECTED' }),
      );
    });
  });
});
