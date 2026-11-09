import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublicQueueController } from './public-queue.controller';
import { QueueSessionService } from './queue-session.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('Phase 5: Public Queue Privacy & Protection Unit Tests', () => {
  let controller: PublicQueueController;
  let prisma: any;
  let sessionService: any;

  beforeEach(async () => {
    prisma = {
      clinicQueueSettings: { findUnique: jest.fn() },
      clinicQueueSession: { findUnique: jest.fn() },
      queueToken: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    };

    sessionService = {
      getTodayInTimezone: jest.fn().mockReturnValue('2026-11-09'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicQueueController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: QueueSessionService, useValue: sessionService },
      ],
    }).compile();

    controller = module.get<PublicQueueController>(PublicQueueController);
  });

  describe('Privacy Safe Public Display', () => {
    it('should return only privacy-safe fields and never leak patient names or phone numbers', async () => {
      prisma.clinicQueueSettings.findUnique.mockResolvedValue({
        id: 'qs-internal-uuid-secret',
        organizationId: 'org-internal-uuid-secret',
        clinicId: 'clinic-internal-uuid-secret',
        queueName: 'Cardiology OPD',
        tokenPrefix: 'C',
        isActive: true,
        isPublicDisplayEnabled: true,
        estimatedConsultationMinutes: 20,
        clinic: { name: 'Al-Shifa Heart Institute', timezone: 'Asia/Karachi' },
        doctor: { fullName: 'Dr. Sarah Khan', specialty: 'Cardiology' },
      });

      prisma.clinicQueueSession.findUnique.mockResolvedValue({
        id: 'sess-internal-uuid-secret',
        status: 'ACTIVE',
      });

      prisma.queueToken.findFirst.mockResolvedValue({
        tokenDisplay: 'C012',
      });

      prisma.queueToken.findMany.mockResolvedValue([
        { tokenDisplay: 'C012' },
        { tokenDisplay: 'C011' },
        { tokenDisplay: 'C010' },
      ]);

      prisma.queueToken.count.mockResolvedValue(5);

      const result = await controller.getPublicQueue('valid-public-slug-123');

      // Verify privacy and content
      expect(result.clinicName).toBe('Al-Shifa Heart Institute');
      expect(result.queueName).toBe('Cardiology OPD');
      expect(result.doctorName).toBe('Dr. Sarah Khan');
      expect(result.status).toBe('ACTIVE');
      expect(result.currentServingToken).toBe('C012');
      expect(result.recentlyCalledTokens).toEqual(['C012', 'C011', 'C010']);
      expect(result.waitingCount).toBe(5);
      expect(result.estimatedWaitMinutes).toBe(100);

      // Verify ZERO patient personal information or internal IDs are returned
      const resultObj = result as any;
      expect(resultObj.patientName).toBeUndefined();
      expect(resultObj.patientPhone).toBeUndefined();
      expect(resultObj.mrn).toBeUndefined();
      expect(resultObj.id).toBeUndefined();
      expect(resultObj.organizationId).toBeUndefined();
      expect(resultObj.clinicId).toBeUndefined();
    });

    it('should throw NotFoundException if public display is disabled by administrator', async () => {
      prisma.clinicQueueSettings.findUnique.mockResolvedValue({
        id: 'qs-1',
        isActive: true,
        isPublicDisplayEnabled: false, // Disabled!
        clinic: { name: 'Main Hospital', timezone: 'Asia/Karachi' },
      });

      await expect(controller.getPublicQueue('disabled-public-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if public identifier does not exist', async () => {
      prisma.clinicQueueSettings.findUnique.mockResolvedValue(null);

      await expect(controller.getPublicQueue('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
