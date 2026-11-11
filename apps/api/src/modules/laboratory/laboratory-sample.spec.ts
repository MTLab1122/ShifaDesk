import { Test, TestingModule } from '@nestjs/testing';
import { LaboratorySampleService } from './services/laboratory-sample.service';
import { LaboratoryAuditService } from './services/laboratory-audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LabSampleStatus, LabOrderStatus } from '@matabai/shared';

describe('LaboratorySampleService', () => {
  let service: LaboratorySampleService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockOrgId = 'org-101';
  const mockSampleId = 'smp-1';
  const mockActorId = 'user-phlebotomist-1';

  beforeEach(async () => {
    mockPrisma = {
      laboratorySample: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      laboratoryOrder: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockAudit = {
      recordAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratorySampleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LaboratoryAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<LaboratorySampleService>(LaboratorySampleService);
  });

  describe('updateSampleStatus', () => {
    it('should transition sample to COLLECTED and synchronize parent order status', async () => {
      mockPrisma.laboratorySample.findFirst.mockResolvedValue({
        id: mockSampleId,
        organizationId: mockOrgId,
        sampleStatus: LabSampleStatus.PENDING,
        orderId: 'ord-1',
        order: {
          id: 'ord-1',
          orderStatus: LabOrderStatus.REGISTERED,
        },
      });

      mockPrisma.laboratorySample.update.mockResolvedValue({
        id: mockSampleId,
        sampleStatus: LabSampleStatus.COLLECTED,
        collectedById: mockActorId,
      });

      const updated = await service.updateSampleStatus(
        mockOrgId,
        mockSampleId,
        { sampleStatus: LabSampleStatus.COLLECTED },
        mockActorId,
      );

      expect(updated.sampleStatus).toBe(LabSampleStatus.COLLECTED);
      // Order status updated to SAMPLE_COLLECTED
      expect(mockPrisma.laboratoryOrder.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { orderStatus: LabOrderStatus.SAMPLE_COLLECTED },
      });
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'SAMPLE', action: 'STATUS_CHANGED' }),
      );
    });

    it('should require rejectionReason when rejecting a specimen', async () => {
      mockPrisma.laboratorySample.findFirst.mockResolvedValue({
        id: mockSampleId,
        organizationId: mockOrgId,
        sampleStatus: LabSampleStatus.RECEIVED,
        order: { id: 'ord-1', orderStatus: 'PROCESSING' },
      });

      await expect(
        service.updateSampleStatus(
          mockOrgId,
          mockSampleId,
          { sampleStatus: LabSampleStatus.REJECTED, rejectionReason: '' },
          mockActorId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid rejection with non-empty reason', async () => {
      mockPrisma.laboratorySample.findFirst.mockResolvedValue({
        id: mockSampleId,
        organizationId: mockOrgId,
        sampleStatus: LabSampleStatus.RECEIVED,
        order: { id: 'ord-1', orderStatus: 'PROCESSING' },
      });

      mockPrisma.laboratorySample.update.mockResolvedValue({
        id: mockSampleId,
        sampleStatus: LabSampleStatus.REJECTED,
        rejectionReason: 'Specimen hemolyzed during transport; recollection necessary',
      });

      const rejected = await service.updateSampleStatus(
        mockOrgId,
        mockSampleId,
        {
          sampleStatus: LabSampleStatus.REJECTED,
          rejectionReason: 'Specimen hemolyzed during transport; recollection necessary',
        },
        mockActorId,
      );

      expect(rejected.sampleStatus).toBe(LabSampleStatus.REJECTED);
      expect(rejected.rejectionReason).toContain('hemolyzed');
    });
  });
});
