import { Test, TestingModule } from '@nestjs/testing';
import { LaboratoryReportService } from './services/laboratory-report.service';
import { LaboratoryDeliveryService } from './services/laboratory-delivery.service';
import { PrivateReportStorageService } from './storage/private-report-storage.service';
import { LaboratoryAuditService } from './services/laboratory-audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { LabReportStatus, LabAccessStatus } from '@matabai/shared';
import * as crypto from 'crypto';

describe('LaboratoryReportService & Secure Delivery', () => {
  let reportService: LaboratoryReportService;
  let deliveryService: LaboratoryDeliveryService;
  let storageService: PrivateReportStorageService;
  let mockPrisma: any;
  let mockAudit: any;

  const mockOrgId = 'org-101';
  const mockReportId = 'rep-1';
  const mockPatientId = 'patient-1';
  const mockActorId = 'user-manager-1';

  beforeEach(async () => {
    mockPrisma = {
      laboratoryReport: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      laboratoryOrder: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      laboratoryReportAccessToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      laboratoryReportAccessLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      notificationJob: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockAudit = {
      recordAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratoryReportService,
        LaboratoryDeliveryService,
        PrivateReportStorageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LaboratoryAuditService, useValue: mockAudit },
      ],
    }).compile();

    reportService = module.get<LaboratoryReportService>(LaboratoryReportService);
    deliveryService = module.get<LaboratoryDeliveryService>(LaboratoryDeliveryService);
    storageService = module.get<PrivateReportStorageService>(PrivateReportStorageService);
  });

  describe('Storage Magic Bytes & Synthetic PDF Generator', () => {
    it('should validate genuine PDF magic bytes (%PDF-)', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      expect(() => storageService.validatePdfMagicBytes(validPdfBuffer)).not.toThrow();
    });

    it('should reject non-PDF payloads', () => {
      const invalidBuffer = Buffer.from('<html><body>Fake report</body></html>');
      expect(() => storageService.validatePdfMagicBytes(invalidBuffer)).toThrow(
        BadRequestException,
      );
    });

    it('should generate a synthetic PDF with valid PDF-1.4 header and %%EOF trailer', () => {
      const pdf = storageService.generateSyntheticPdfReport({
        clinicName: 'Shifa Central Laboratory',
        orderRef: 'LAB-202611-0001',
        reportRef: 'REP-202611-0001',
        version: 1,
        patientName: 'Ahmad Khan',
        patientMrn: 'MRN-7890',
        items: [
          {
            testName: 'Hemoglobin A1c',
            testCode: 'HBA1C',
            resultValue: '5.6',
            unit: '%',
            referenceRange: '4.0 - 5.7',
            status: 'APPROVED',
          },
        ],
      });

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(pdf.toString('utf-8')).toContain('%%EOF');
      expect(pdf.toString('utf-8')).toContain('SHIFA CENTRAL LABORATORY');
    });
  });

  describe('Report Approval & Release Safety Gates', () => {
    it('should prevent release if report is not in APPROVED state', async () => {
      mockPrisma.laboratoryReport.findFirst.mockResolvedValue({
        id: mockReportId,
        organizationId: mockOrgId,
        reportStatus: LabReportStatus.DRAFT, // Not yet approved
        order: { patient: { id: mockPatientId } },
      });

      await expect(
        reportService.releaseReport(mockOrgId, mockReportId, 'Releasing draft', false, mockActorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should release an approved report and update order status', async () => {
      mockPrisma.laboratoryReport.findFirst.mockResolvedValue({
        id: mockReportId,
        organizationId: mockOrgId,
        clinicId: 'clinic-1',
        orderId: 'ord-1',
        reportStatus: LabReportStatus.APPROVED,
        order: { patient: { id: mockPatientId } },
      });

      mockPrisma.laboratoryReport.update.mockResolvedValue({
        id: mockReportId,
        reportStatus: LabReportStatus.RELEASED,
        releasedById: mockActorId,
      });

      const released = await reportService.releaseReport(
        mockOrgId,
        mockReportId,
        'Pathologist finalized release',
        false, // Skip notification in this unit test
        mockActorId,
      );

      expect(released.reportStatus).toBe(LabReportStatus.RELEASED);
      expect(mockPrisma.laboratoryOrder.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { orderStatus: 'DELIVERED' },
      });
      expect(mockAudit.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'REPORT', action: 'RELEASED' }),
      );
    });
  });

  describe('Secure Patient Delivery Tokens & Identity Verification', () => {
    it('should generate a 256-bit unguessable delivery token and store its SHA-256 hash', async () => {
      mockPrisma.laboratoryReport.findFirst.mockResolvedValue({
        id: mockReportId,
        organizationId: mockOrgId,
        clinicId: 'clinic-1',
        reportStatus: LabReportStatus.RELEASED,
        order: {
          patientId: mockPatientId,
          patient: { id: mockPatientId },
        },
      });

      mockPrisma.laboratoryReportAccessToken.create.mockResolvedValue({ id: 'token-rec-1' });

      const deliveryToken = await deliveryService.createAccessToken(
        mockOrgId,
        mockReportId,
        72, // 72 hours
        mockActorId,
      );

      expect(deliveryToken.token).toHaveLength(64); // 32 bytes hex
      expect(deliveryToken.prefix).toBe(deliveryToken.token.substring(0, 8));
      expect(deliveryToken.accessUrl).toContain(deliveryToken.token);

      // Verify Prisma received the SHA-256 hash, NOT the raw token
      const expectedHash = crypto.createHash('sha256').update(deliveryToken.token).digest('hex');
      expect(mockPrisma.laboratoryReportAccessToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokenHash: expectedHash,
          tokenPrefix: deliveryToken.prefix,
        }),
      });
    });

    it('should verify patient identity with matching phone number and grant access', async () => {
      const rawToken = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890';

      const mockPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      jest.spyOn(storageService, 'readReportFile').mockResolvedValue({
        buffer: mockPdfBuffer,
        fileName: 'REP-202611-0001.pdf',
        mimeType: 'application/pdf',
      });

      mockPrisma.laboratoryReportAccessToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        organizationId: mockOrgId,
        reportId: mockReportId,
        expiresAt: new Date(Date.now() + 3600000), // Expires in 1 hour
        revokedAt: null,
        accessCount: 0,
        maxAccessCount: 5,
        patient: {
          id: mockPatientId,
          phone: '+923001234567',
          dateOfBirth: '1990-05-15',
        },
        report: {
          id: mockReportId,
          reportReference: 'REP-202611-0001',
          storagePath: 'org-101/rep-1.enc',
        },
      });

      const result = await deliveryService.verifyPatientIdentityAndGetReport(
        rawToken,
        { phoneNumber: '03001234567' }, // Patient enters local format
        { ipAddress: '127.0.0.1', userAgent: 'Jest-Agent' },
      );

      expect(result.reportReference).toBe('REP-202611-0001');
      expect(result.buffer).toEqual(mockPdfBuffer);

      // Verify access count incremented & access logged with SUCCESS
      expect(mockPrisma.laboratoryReportAccessToken.update).toHaveBeenCalledWith({
        where: { id: 'tok-1' },
        data: { accessCount: { increment: 1 } },
      });
      expect(mockPrisma.laboratoryReportAccessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportId: mockReportId,
          accessStatus: LabAccessStatus.SUCCESS,
        }),
      });
    });

    it('should reject access with UnauthorizedException when identity verification does not match', async () => {
      const rawToken = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890';

      mockPrisma.laboratoryReportAccessToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        organizationId: mockOrgId,
        reportId: mockReportId,
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        accessCount: 0,
        maxAccessCount: 5,
        patient: {
          id: mockPatientId,
          phone: '+923001234567',
          dateOfBirth: '1990-05-15',
        },
        report: { id: mockReportId },
      });

      await expect(
        deliveryService.verifyPatientIdentityAndGetReport(
          rawToken,
          { phoneNumber: '03219999999' }, // Wrong phone
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.laboratoryReportAccessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accessStatus: LabAccessStatus.INVALID_VERIFICATION,
        }),
      });
    });

    it('should reject expired tokens with ForbiddenException', async () => {
      const rawToken = 'expired-token';

      mockPrisma.laboratoryReportAccessToken.findUnique.mockResolvedValue({
        id: 'tok-exp',
        organizationId: mockOrgId,
        reportId: mockReportId,
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        revokedAt: null,
        accessCount: 0,
        maxAccessCount: 5,
        patient: { id: mockPatientId, phone: '+923001234567' },
        report: { id: mockReportId },
      });

      await expect(
        deliveryService.verifyPatientIdentityAndGetReport(rawToken, { phoneNumber: '03001234567' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.laboratoryReportAccessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accessStatus: LabAccessStatus.EXPIRED,
        }),
      });
    });

    it('should reject revoked tokens with ForbiddenException', async () => {
      const rawToken = 'revoked-token';

      mockPrisma.laboratoryReportAccessToken.findUnique.mockResolvedValue({
        id: 'tok-rev',
        organizationId: mockOrgId,
        reportId: mockReportId,
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: new Date(), // Revoked
        accessCount: 0,
        maxAccessCount: 5,
        patient: { id: mockPatientId, phone: '+923001234567' },
        report: { id: mockReportId },
      });

      await expect(
        deliveryService.verifyPatientIdentityAndGetReport(rawToken, { phoneNumber: '03001234567' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.laboratoryReportAccessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accessStatus: LabAccessStatus.REVOKED,
        }),
      });
    });
  });
});

