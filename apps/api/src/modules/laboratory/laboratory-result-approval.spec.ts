import { Test, TestingModule } from '@nestjs/testing';
import { LaboratoryResultService } from './services/laboratory-result.service';
import { LaboratoryAuditService } from './services/laboratory-audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { LabResultStatus, LabOrderStatus, ReviewDecision, UserRole } from '@matabai/shared';

describe('LaboratoryResultService & Review Workflow', () => {
  let service: LaboratoryResultService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockOrgId = 'org-101';
  const mockTechId = 'user-tech-1';
  const mockReviewerId = 'user-pathologist-1';

  beforeEach(async () => {
    mockPrisma = {
      laboratoryOrderItem: {
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      laboratoryResult: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      laboratoryResultReview: {
        create: jest.fn(),
      },
      laboratoryOrder: {
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockAudit = {
      recordAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratoryResultService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LaboratoryAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<LaboratoryResultService>(LaboratoryResultService);
  });

  describe('enterResult', () => {
    it('should enter structured result and transition order to UNDER_REVIEW when all items complete', async () => {
      mockPrisma.laboratoryOrderItem.findFirst.mockResolvedValue({
        id: 'item-1',
        orderId: 'ord-1',
        result: null, // No existing result
        order: { organizationId: mockOrgId, clinicId: 'clinic-1', orderStatus: 'PROCESSING' },
        test: { unit: 'g/dL', referenceRange: '13.5 - 17.5', resultType: 'NUMERIC' },
      });

      mockPrisma.laboratoryResult.create.mockResolvedValue({
        id: 'res-1',
        orderItemId: 'item-1',
        resultValue: '14.8',
        resultStatus: LabResultStatus.ENTERED,
      });

      // Total items in order = 1, results entered = 1 -> triggers UNDER_REVIEW
      mockPrisma.laboratoryOrderItem.count.mockResolvedValue(1);
      mockPrisma.laboratoryResult.count.mockResolvedValue(1);

      const result = await service.enterResult(
        mockOrgId,
        'item-1',
        { resultValue: '14.8', resultType: 'NUMERIC' },
        mockTechId,
      );

      expect(result.resultValue).toBe('14.8');
      expect(mockPrisma.laboratoryOrderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { status: 'COMPLETED' },
      });
      expect(mockPrisma.laboratoryOrder.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { orderStatus: LabOrderStatus.UNDER_REVIEW },
      });
    });

    it('should reject enterResult if a result already exists (must use amend workflow)', async () => {
      mockPrisma.laboratoryOrderItem.findFirst.mockResolvedValue({
        id: 'item-1',
        orderId: 'ord-1',
        result: { id: 'existing-res', resultValue: '12.0' },
        order: { organizationId: mockOrgId },
        test: {},
      });

      await expect(
        service.enterResult(
          mockOrgId,
          'item-1',
          { resultValue: '14.0', resultType: 'NUMERIC' },
          mockTechId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('amendResult', () => {
    it('should amend an existing result and log full before/after audit values', async () => {
      mockPrisma.laboratoryResult.findFirst.mockResolvedValue({
        id: 'res-1',
        organizationId: mockOrgId,
        clinicId: 'clinic-1',
        resultValue: '14.8',
        unit: 'g/dL',
        referenceRange: '13.5 - 17.5',
        resultStatus: LabResultStatus.ENTERED,
        resultNotes: null,
      });

      mockPrisma.laboratoryResult.update.mockResolvedValue({
        id: 'res-1',
        resultValue: '15.2',
        resultStatus: LabResultStatus.AMENDED,
        amendedReason: 'Recalibrated hemocounter verification',
      });

      const amended = await service.amendResult(
        mockOrgId,
        'res-1',
        {
          resultValue: '15.2',
          amendedReason: 'Recalibrated hemocounter verification',
        },
        mockTechId,
      );

      expect(amended.resultStatus).toBe(LabResultStatus.AMENDED);
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'RESULT',
          action: 'RESULT_AMENDED',
          previousValues: expect.objectContaining({ resultValue: '14.8' }),
          newValues: expect.objectContaining({ resultValue: '15.2' }),
        }),
      );
    });
  });

  describe('reviewResult & Separation of Duties', () => {
    it('should enforce separation of duties: technician cannot approve their own result', async () => {
      mockPrisma.laboratoryResult.findFirst.mockResolvedValue({
        id: 'res-1',
        organizationId: mockOrgId,
        enteredById: mockTechId, // Entered by mockTechId
        orderItem: { orderId: 'ord-1' },
      });

      // Same technician attempts to approve result with LAB_STAFF role
      await expect(
        service.reviewResult(
          mockOrgId,
          'res-1',
          { decision: ReviewDecision.APPROVED },
          mockTechId, // Reviewer is same as enteredById
          UserRole.LAB_STAFF,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow independent reviewer or pathologist to approve results and mark order APPROVED', async () => {
      mockPrisma.laboratoryResult.findFirst.mockResolvedValue({
        id: 'res-1',
        organizationId: mockOrgId,
        clinicId: 'clinic-1',
        enteredById: mockTechId, // Entered by technician
        orderItem: { orderId: 'ord-1' },
      });

      mockPrisma.laboratoryResultReview.create.mockResolvedValue({
        id: 'rev-1',
        decision: ReviewDecision.APPROVED,
        reviewerId: mockReviewerId,
      });

      // Total items = 1, approved = 1
      mockPrisma.laboratoryOrderItem.count.mockResolvedValue(1);
      mockPrisma.laboratoryResult.count.mockResolvedValue(1);

      const review = await service.reviewResult(
        mockOrgId,
        'res-1',
        { decision: ReviewDecision.APPROVED, comments: 'Clinically consistent with CBC' },
        mockReviewerId,
        UserRole.LAB_REVIEWER,
      );

      expect(review.decision).toBe(ReviewDecision.APPROVED);
      expect(mockPrisma.laboratoryResult.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { resultStatus: LabResultStatus.APPROVED },
      });
      expect(mockPrisma.laboratoryOrder.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { orderStatus: LabOrderStatus.APPROVED },
      });
    });
  });
});

