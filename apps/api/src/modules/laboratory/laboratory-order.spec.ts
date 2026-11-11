import { Test, TestingModule } from '@nestjs/testing';
import { LaboratoryOrderService } from './services/laboratory-order.service';
import { LaboratoryAuditService } from './services/laboratory-audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LabOrderStatus } from '@matabai/shared';

describe('LaboratoryOrderService', () => {
  let service: LaboratoryOrderService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockOrgId = 'org-101';
  const mockClinicId = 'clinic-1';
  const mockPatientId = 'patient-1';
  const mockActorId = 'user-receptionist-1';

  beforeEach(async () => {
    mockPrisma = {
      clinic: { findFirst: jest.fn() },
      patient: { findFirst: jest.fn() },
      doctor: { findFirst: jest.fn() },
      laboratoryTest: { findMany: jest.fn() },
      laboratoryPackage: { findMany: jest.fn() },
      laboratoryOrder: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      laboratoryOrderItem: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      laboratorySample: {
        count: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockAudit = {
      recordAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratoryOrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LaboratoryAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<LaboratoryOrderService>(LaboratoryOrderService);
  });

  describe('createOrder', () => {
    it('should create an order with immutable snapshotting and auto-generate grouped samples', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId, organizationId: mockOrgId });
      mockPrisma.patient.findFirst.mockResolvedValue({ id: mockPatientId, organizationId: mockOrgId });

      // Tests in order: 2 blood tests and 1 urine test
      mockPrisma.laboratoryTest.findMany.mockResolvedValue([
        {
          id: 'test-cbc',
          testCode: 'CBC',
          testName: 'Complete Blood Count',
          price: 1200,
          sampleType: 'Blood',
        },
        {
          id: 'test-esr',
          testCode: 'ESR',
          testName: 'Erythrocyte Sedimentation Rate',
          price: 600,
          sampleType: 'Blood',
        },
        {
          id: 'test-ua',
          testCode: 'UA',
          testName: 'Urine Analysis Routine',
          price: 800,
          sampleType: 'Urine',
        },
      ]);

      mockPrisma.laboratoryPackage.findMany.mockResolvedValue([]);
      mockPrisma.laboratoryOrder.count.mockResolvedValue(4); // Generates LAB-YYYYMM-0005
      mockPrisma.laboratorySample.count
        .mockResolvedValueOnce(10) // SMP-YYYYMM-0011 (Blood)
        .mockResolvedValueOnce(11); // SMP-YYYYMM-0012 (Urine)

      mockPrisma.laboratoryOrder.create.mockResolvedValue({
        id: 'ord-100',
        orderReference: 'LAB-202611-0005',
        totalAmount: 2600,
        orderStatus: LabOrderStatus.REGISTERED,
      });

      mockPrisma.laboratoryOrder.findUnique.mockResolvedValue({
        id: 'ord-100',
        orderReference: 'LAB-202611-0005',
        totalAmount: 2600,
        orderStatus: LabOrderStatus.REGISTERED,
        patientId: mockPatientId,
      });

      const order = await service.createOrder(
        mockOrgId,
        {
          clinicId: mockClinicId,
          patientId: mockPatientId,
          testIds: ['test-cbc', 'test-esr', 'test-ua'],
        },
        mockActorId,
      );

      expect(order).toBeDefined();
      expect(mockPrisma.laboratoryOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 2600,
            orderStatus: LabOrderStatus.REGISTERED,
          }),
        }),
      );

      // Verify immutable snapshots created
      expect(mockPrisma.laboratoryOrderItem.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.laboratoryOrderItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            testNameSnapshot: 'Complete Blood Count',
            testCodeSnapshot: 'CBC',
            priceSnapshot: 1200,
          }),
        }),
      );

      // Verify samples grouped by sampleType (Blood and Urine -> 2 samples created)
      expect(mockPrisma.laboratorySample.create).toHaveBeenCalledTimes(2);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'ORDER', action: 'CREATED' }),
      );
    });

    it('should reject order creation if clinic does not exist in organization', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrder(
          mockOrgId,
          { clinicId: 'invalid-clinic', patientId: mockPatientId, testIds: ['test-1'] },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order with valid cancellation reason and update items', async () => {
      mockPrisma.laboratoryOrder.findFirst.mockResolvedValue({
        id: 'ord-1',
        organizationId: mockOrgId,
        orderStatus: LabOrderStatus.REGISTERED,
        reports: [],
      });
      mockPrisma.laboratoryOrder.update.mockResolvedValue({
        id: 'ord-1',
        orderStatus: LabOrderStatus.CANCELLED,
        cancellationReason: 'Patient requested cancellation prior to sample draw',
      });

      const cancelled = await service.cancelOrder(
        mockOrgId,
        'ord-1',
        { cancellationReason: 'Patient requested cancellation prior to sample draw' },
        mockActorId,
      );

      expect(cancelled.orderStatus).toBe(LabOrderStatus.CANCELLED);
      expect(mockPrisma.laboratoryOrderItem.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'ord-1' },
        data: { status: 'CANCELLED' },
      });
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CANCELLED' }),
      );
    });

    it('should forbid cancellation if report has already been released', async () => {
      mockPrisma.laboratoryOrder.findFirst.mockResolvedValue({
        id: 'ord-1',
        organizationId: mockOrgId,
        orderStatus: LabOrderStatus.DELIVERED,
        reports: [{ reportStatus: 'RELEASED' }],
      });

      await expect(
        service.cancelOrder(
          mockOrgId,
          'ord-1',
          { cancellationReason: 'Mistaken order' },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
