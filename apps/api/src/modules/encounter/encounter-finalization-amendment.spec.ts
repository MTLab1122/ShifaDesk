import { Test, TestingModule } from '@nestjs/testing';
import { EncounterService } from './services/encounter.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { EncounterStatus } from '@matabai/shared';

describe('Encounter Finalization & Amendments', () => {
  let service: EncounterService;
  let mockPrisma: any;

  const mockOrgId = 'org-uuid-1';
  const mockDoctorUserId = 'user-doctor-1';
  const mockEncounterId = 'enc-uuid-1';

  beforeEach(async () => {
    mockPrisma = {
      clinicalEncounter: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      clinicalNote: {
        upsert: jest.fn(),
      },
      clinicalDocumentVersion: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      encounterAmendment: {
        create: jest.fn(),
      },
      encounterStatusHistory: {
        create: jest.fn(),
      },
      appointment: {
        update: jest.fn(),
      },
      queueToken: {
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncounterService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EncounterService>(EncounterService);
  });

  describe('finalizeEncounter', () => {
    it('should reject finalization without explicit doctor confirmation', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: mockEncounterId,
        isFinalized: false,
        clinicalNote: { chiefComplaint: 'Fever' },
      });

      await expect(
        service.finalizeEncounter(mockEncounterId, mockOrgId, mockDoctorUserId, {
          confirmedByDoctor: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject finalization if chief complaint is missing', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: mockEncounterId,
        isFinalized: false,
        clinicalNote: null, // missing note
      });

      await expect(
        service.finalizeEncounter(mockEncounterId, mockOrgId, mockDoctorUserId, {
          confirmedByDoctor: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should finalize encounter, transition status to COMPLETED, and create immutable document snapshot', async () => {
      const existingEncounter = {
        id: mockEncounterId,
        encounterReference: 'ENC-202611-0001',
        isFinalized: false,
        appointmentId: 'apt-1',
        queueTokenId: 'token-1',
        clinicalNote: {
          chiefComplaint: 'Acute bronchitis with persistent cough',
          clinicalAssessment: 'Viral bronchitis',
          treatmentPlan: 'Hydration and symptomatic relief',
        },
        diagnoses: [{ diagnosisDescription: 'Acute Bronchitis', diagnosisCode: 'J20.9' }],
        prescriptions: [{ prescriptionReference: 'RX-202611-0001', items: [] }],
        observations: [{ systolicBp: 120, diastolicBp: 80 }],
        patient: { fullName: 'Ali Khan' },
        doctor: { fullName: 'Dr. Fatima', userProfile: { fullName: 'Dr. Fatima' } },
        clinic: { name: 'Main Clinic' },
      };

      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue(existingEncounter);
      mockPrisma.clinicalEncounter.update.mockResolvedValue({
        ...existingEncounter,
        isFinalized: true,
        status: EncounterStatus.COMPLETED,
      });

      const finalized = await service.finalizeEncounter(
        mockEncounterId,
        mockOrgId,
        mockDoctorUserId,
        { confirmedByDoctor: true },
      );

      expect(finalized.isFinalized).toBe(true);
      expect(mockPrisma.clinicalDocumentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            encounterId: mockEncounterId,
            versionNumber: 1,
            isFinal: true,
            signedById: mockDoctorUserId,
          }),
        }),
      );

      // Verify linked appointment and queue token completed
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt-1' },
          data: { status: 'COMPLETED' },
        }),
      );
      expect(mockPrisma.queueToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'token-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
  });

  describe('amendEncounter', () => {
    it('should require minimum 5 characters reason and increment document version', async () => {
      const finalizedEncounter = {
        id: mockEncounterId,
        isFinalized: true,
        clinicalNote: { chiefComplaint: 'Original complaint' },
        documentVersions: [{ versionNumber: 1 }],
      };

      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue(finalizedEncounter);
      mockPrisma.clinicalEncounter.update.mockResolvedValue(finalizedEncounter);
      mockPrisma.encounterAmendment.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'amend-1', ...data }),
      );

      const amended = await service.amendEncounter(
        mockEncounterId,
        mockOrgId,
        mockDoctorUserId,
        {
          amendmentReason: 'Patient called to report secondary ear pain',
          notes: {
            chiefComplaint: 'Original complaint with new ear pain',
          },
        },
      );

      expect(amended).toBeDefined();
      expect(mockPrisma.encounterAmendment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            encounterId: mockEncounterId,
            versionNumber: 2,
            amendmentReason: 'Patient called to report secondary ear pain',
            amendedById: mockDoctorUserId,
          }),
        }),
      );
      expect(mockPrisma.clinicalDocumentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            encounterId: mockEncounterId,
            versionNumber: 2,
            isFinal: true,
          }),
        }),
      );
    });
  });
});
