import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './services/invoice.service';
import { FinancialAuditService } from './services/financial-audit.service';
import { NotificationSchedulerService } from '../notification/notification-scheduler.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@matabai/shared';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockNotification: any;

  const mockOrgId = 'org-101';
  const mockClinicId = 'clinic-1';
  const mockPatientId = 'patient-1';
  const mockActorId = 'actor-1';

  beforeEach(async () => {
    mockPrisma = {
      clinic: {
        findFirst: jest.fn(),
      },
      patient: {
        findFirst: jest.fn(),
      },
      invoice: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    mockAudit = {
      recordAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    mockNotification = {
      scheduleFinancialNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FinancialAuditService, useValue: mockAudit },
        { provide: NotificationSchedulerService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  describe('createInvoice', () => {
    it('should calculate integer minor arithmetic accurately for line items, discounts, and taxes', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId, organizationId: mockOrgId });
      mockPrisma.patient.findFirst.mockResolvedValue({ id: mockPatientId, organizationId: mockOrgId });
      mockPrisma.invoice.create.mockImplementation((args: any) => Promise.resolve({
        id: 'inv-1',
        ...args.data,
      }));

      const input = {
        clinicId: mockClinicId,
        patientId: mockPatientId,
        items: [
          {
            itemType: 'CONSULTATION' as const,
            description: 'General OPD Consultation',
            quantity: 1,
            unitPriceMinor: 200000, // PKR 2,000.00
            discountMinor: 0,
            taxMinor: 0,
          },
          {
            itemType: 'LAB_TEST' as const,
            description: 'Complete Blood Count (CBC)',
            quantity: 2,
            unitPriceMinor: 100000, // 2 x PKR 1,000 = PKR 2,000.00
            discountMinor: 20000,   // PKR 200 item discount
            taxMinor: 0,
          },
        ],
        discountMinor: 30000, // PKR 300 header discount (Total discount = 200 + 300 = 500)
        taxRatePercent: 10,  // 10% tax on taxable base
        currency: 'PKR',
      };

      const invoice = await service.createInvoice(mockOrgId, input, mockActorId);

      expect(invoice).toBeDefined();
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            // Subtotal: 200000 + 200000 = 400000
            subtotalMinor: 400000,
            // Total discount: 20000 + 30000 = 50000
            discountMinor: 50000,
            // Taxable base: 400000 - 50000 = 350000. Tax (10%): 35000
            taxMinor: 35000,
            // Total: 350000 + 35000 = 385000
            totalMinor: 385000,
            paidMinor: 0,
            outstandingMinor: 385000,
            status: InvoiceStatus.DRAFT,
          }),
        }),
      );

      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'INVOICE', action: 'CREATED' }),
      );
    });

    it('should reject invoice creation if clinic does not belong to organization', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue(null);

      await expect(
        service.createInvoice(
          mockOrgId,
          {
            clinicId: 'foreign-clinic',
            patientId: mockPatientId,
            items: [{ itemType: 'SERVICE', description: 'General Service', quantity: 1, unitPriceMinor: 10000, discountMinor: 0, taxMinor: 0 }],
          },
          mockActorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent duplicate invoice creation for the same appointment', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId, organizationId: mockOrgId });
      mockPrisma.patient.findFirst.mockResolvedValue({ id: mockPatientId, organizationId: mockOrgId });
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'existing-inv',
        invoiceReference: 'INV-202611-0001',
      });

      await expect(
        service.createInvoice(
          mockOrgId,
          {
            clinicId: mockClinicId,
            patientId: mockPatientId,
            appointmentId: 'apt-1',
            items: [{ itemType: 'CONSULTATION', description: 'Consultation', quantity: 1, unitPriceMinor: 10000, discountMinor: 0, taxMinor: 0 }],
          },
          mockActorId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('issueInvoice', () => {
    it('should transition DRAFT invoice to ISSUED and dispatch Phase 8 notification', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        patientId: mockPatientId,
        status: InvoiceStatus.DRAFT,
        invoiceReference: 'INV-202611-0001',
        totalMinor: 150000,
        dueAt: null,
        clinic: { name: 'Main Clinic', phone: '+92 51 111 222' },
        patient: { fullName: 'Ali Khan', phone: '+923001234567' },
        items: [],
      });

      mockPrisma.invoice.update.mockResolvedValue({
        id: 'inv-1',
        clinicId: mockClinicId,
        patientId: mockPatientId,
        invoiceReference: 'INV-202611-0001',
        status: InvoiceStatus.ISSUED,
        totalMinor: 150000,
        clinic: { name: 'Main Clinic' },
      });

      const issued = await service.issueInvoice(mockOrgId, 'inv-1', mockActorId);

      expect(issued.status).toBe(InvoiceStatus.ISSUED);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'INVOICE', action: 'ISSUED' }),
      );
      expect(mockNotification.scheduleFinancialNotification).toHaveBeenCalled();
    });

    it('should reject issuing an invoice that is not in DRAFT status', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        organizationId: mockOrgId,
        status: InvoiceStatus.PAID,
      });

      await expect(service.issueInvoice(mockOrgId, 'inv-1', mockActorId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelInvoice', () => {
    it('should cancel an invoice with mandatory justification reason when no payments exist', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        organizationId: mockOrgId,
        clinicId: mockClinicId,
        status: InvoiceStatus.ISSUED,
        paidMinor: 0,
      });

      mockPrisma.invoice.update.mockResolvedValue({
        id: 'inv-1',
        status: InvoiceStatus.CANCELLED,
      });

      const result = await service.cancelInvoice(
        mockOrgId,
        'inv-1',
        { cancellationReason: 'Patient cancelled the consultation' },
        mockActorId,
      );

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'INVOICE', action: 'CANCELLED' }),
      );
    });

    it('should block cancellation if confirmed payments exist on the invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        organizationId: mockOrgId,
        status: InvoiceStatus.PARTIALLY_PAID,
        paidMinor: 50000, // PKR 500 paid
      });

      await expect(
        service.cancelInvoice(
          mockOrgId,
          'inv-1',
          { cancellationReason: 'Test reason' },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
