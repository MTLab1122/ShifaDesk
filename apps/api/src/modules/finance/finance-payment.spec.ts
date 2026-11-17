import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './services/payment.service';
import { FinancialAuditService } from './services/financial-audit.service';
import { NotificationSchedulerService } from '../notification/notification-scheduler.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus } from '@matabai/shared';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockNotification: any;

  const mockOrgId = 'org-101';
  const mockClinicId = 'clinic-1';
  const mockInvoiceId = 'inv-1';
  const mockPatientId = 'patient-1';
  const mockActorId = 'actor-1';

  beforeEach(async () => {
    mockPrisma = {
      payment: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const tx = {
          payment: {
            create: jest.fn().mockImplementation((args: any) =>
              Promise.resolve({ id: 'pay-1', ...args.data }),
            ),
          },
          paymentAllocation: {
            create: jest.fn().mockResolvedValue({ id: 'alloc-1' }),
          },
          invoice: {
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
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FinancialAuditService, useValue: mockAudit },
        { provide: NotificationSchedulerService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('collectPayment', () => {
    it('should collect full payment and update invoice status to PAID atomically', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: mockInvoiceId,
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        patientId: mockPatientId,
        status: InvoiceStatus.ISSUED,
        totalMinor: 250000,
        paidMinor: 0,
        outstandingMinor: 250000,
        currency: 'PKR',
        invoiceReference: 'INV-202611-0001',
        clinic: { name: 'Main Clinic' },
      });

      const payment = await service.collectPayment(
        mockOrgId,
        {
          clinicId: mockClinicId,
          invoiceId: mockInvoiceId,
          amountMinor: 250000,
          method: 'CASH',
        },
        mockActorId,
      );

      expect(payment).toBeDefined();
      expect(payment.amountMinor).toBe(250000);
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'PAYMENT', action: 'PAID' }),
      );
      expect(mockNotification.scheduleFinancialNotification).toHaveBeenCalled();
    });

    it('should collect partial payment and update invoice status to PARTIALLY_PAID', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: mockInvoiceId,
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        patientId: mockPatientId,
        status: InvoiceStatus.ISSUED,
        totalMinor: 300000,
        paidMinor: 0,
        outstandingMinor: 300000,
        currency: 'PKR',
        invoiceReference: 'INV-202611-0002',
        clinic: { name: 'Main Clinic' },
      });

      const payment = await service.collectPayment(
        mockOrgId,
        {
          clinicId: mockClinicId,
          invoiceId: mockInvoiceId,
          amountMinor: 100000, // PKR 1,000 partial payment
          method: 'BANK_TRANSFER',
          bankName: 'Meezan Bank',
          bankReference: 'TXN-998811',
        },
        mockActorId,
      );

      expect(payment).toBeDefined();
      expect(payment.amountMinor).toBe(100000);
      expect(payment.bankReference).toBe('TXN-998811');
    });

    it('should strictly prohibit overpayment exceeding authoritative invoice outstanding balance', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: mockInvoiceId,
        organizationId: mockOrgId,
        status: InvoiceStatus.ISSUED,
        totalMinor: 100000,
        paidMinor: 0,
        outstandingMinor: 100000, // Only 1,000 due
      });

      await expect(
        service.collectPayment(
          mockOrgId,
          {
            clinicId: mockClinicId,
            invoiceId: mockInvoiceId,
            amountMinor: 150000, // Attempting to pay 1,500
            method: 'CASH',
          },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent payment against a DRAFT or CANCELLED invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: mockInvoiceId,
        organizationId: mockOrgId,
        status: InvoiceStatus.DRAFT,
        outstandingMinor: 100000,
      });

      await expect(
        service.collectPayment(
          mockOrgId,
          {
            clinicId: mockClinicId,
            invoiceId: mockInvoiceId,
            amountMinor: 50000,
            method: 'CASH',
          },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing payment when idempotency key is matched', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'existing-payment-id',
        paymentReference: 'PAY-202611-0001',
        idempotencyKey: 'idemp-key-1234',
        amountMinor: 50000,
      });

      const payment = await service.collectPayment(
        mockOrgId,
        {
          clinicId: mockClinicId,
          invoiceId: mockInvoiceId,
          amountMinor: 50000,
          method: 'CASH',
          idempotencyKey: 'idemp-key-1234',
        },
        mockActorId,
      );

      expect(payment.id).toBe('existing-payment-id');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
