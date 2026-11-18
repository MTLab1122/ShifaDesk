import { Test, TestingModule } from '@nestjs/testing';
import { DiagnosisService } from './services/diagnosis.service';
import { PrescriptionService } from './services/prescription.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { PrescriptionStatus } from '@matabai/shared';

describe('Diagnosis & Prescription Services', () => {
  let diagService: DiagnosisService;
  let rxService: PrescriptionService;
  let mockPrisma: any;

  const mockOrgId = 'org-uuid-1';
  const mockClinicId = 'clinic-uuid-1';
  const mockPatientId = 'patient-uuid-1';
  const mockDoctorId = 'doctor-uuid-1';
  const mockEncounterId = 'enc-uuid-1';
  const mockActorId = 'user-uuid-1';

  beforeEach(async () => {
    mockPrisma = {
      clinicalEncounter: { findFirst: jest.fn() },
      encounterDiagnosis: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      prescription: {
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      prescriptionItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      prescriptionAmendment: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiagnosisService,
        PrescriptionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    diagService = module.get<DiagnosisService>(DiagnosisService);
    rxService = module.get<PrescriptionService>(PrescriptionService);
  });

  describe('DiagnosisService', () => {
    it('should create primary diagnosis on an active encounter', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: mockEncounterId,
        organizationId: mockOrgId,
        isFinalized: false,
      });

      mockPrisma.encounterDiagnosis.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({ id: 'diag-1', ...data });
      });

      const diag = await diagService.createDiagnosis(mockOrgId, mockActorId, {
        encounterId: mockEncounterId,
        patientId: mockPatientId,
        diagnosisDescription: 'Essential Hypertension',
        diagnosisCode: 'I10',
        codingSystem: 'ICD-10',
        type: 'PRIMARY',
        clinicalStatus: 'CONFIRMED',
      });

      expect(diag).toBeDefined();
      expect(diag.diagnosisDescription).toBe('Essential Hypertension');
      expect(diag.type).toBe('PRIMARY');
    });

    it('should reject adding diagnoses to a finalized encounter', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: mockEncounterId,
        organizationId: mockOrgId,
        isFinalized: true,
      });

      await expect(
        diagService.createDiagnosis(mockOrgId, mockActorId, {
          encounterId: mockEncounterId,
          patientId: mockPatientId,
          diagnosisDescription: 'Type 2 Diabetes',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PrescriptionService', () => {
    it('should create prescription with RX-YYYYMM-XXXX sequence and items', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: mockEncounterId,
        organizationId: mockOrgId,
        isFinalized: false,
      });

      mockPrisma.prescription.count.mockResolvedValue(12);

      mockPrisma.prescription.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: 'rx-1',
          ...data,
          items: data.items.create,
        });
      });

      const rx = await rxService.createPrescription(mockOrgId, mockActorId, {
        encounterId: mockEncounterId,
        patientId: mockPatientId,
        doctorId: mockDoctorId,
        clinicId: mockClinicId,
        items: [
          {
            medicationName: 'Amoxicillin',
            genericName: 'Amoxicillin Trihydrate',
            strength: '500mg',
            dosageForm: 'Capsule',
            dosage: '1 capsule',
            route: 'Oral',
            frequency: 'Every 8 hours',
            duration: '7 days',
            quantity: 21,
            instructions: 'Take after meals',
          },
        ],
      });

      expect(rx.prescriptionReference).toMatch(/^RX-\d{6}-0013$/);
      expect(rx.status).toBe(PrescriptionStatus.ACTIVE);
      expect(rx.version).toBe(1);
    });

    it('should amend prescription, increment version, and record snapshot in amendment table', async () => {
      const existingRx = {
        id: 'rx-1',
        prescriptionReference: 'RX-202611-0013',
        status: PrescriptionStatus.ACTIVE,
        version: 1,
        items: [
          { medicationName: 'Amoxicillin', strength: '500mg' },
        ],
      };

      mockPrisma.prescription.findFirst.mockResolvedValue(existingRx);

      mockPrisma.prescription.update.mockResolvedValue({
        ...existingRx,
        version: 2,
        status: PrescriptionStatus.AMENDED,
      });

      const amended = await rxService.amendPrescription('rx-1', mockOrgId, mockActorId, {
        reason: 'Adjusted dosage due to mild persistent symptoms',
        items: [
          {
            medicationName: 'Amoxicillin',
            strength: '1000mg',
            dosage: '1 tablet',
            frequency: 'Every 12 hours',
            duration: '5 days',
          },
        ],
      });

      expect(amended.version).toBe(2);
      expect(mockPrisma.prescriptionAmendment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prescriptionId: 'rx-1',
            amendedById: mockActorId,
            reason: 'Adjusted dosage due to mild persistent symptoms',
          }),
        }),
      );
      expect(mockPrisma.prescriptionItem.deleteMany).toHaveBeenCalledWith({
        where: { prescriptionId: 'rx-1' },
      });
      expect(mockPrisma.prescriptionItem.createMany).toHaveBeenCalled();
    });

    it('should cancel active prescription and record cancellation reason', async () => {
      mockPrisma.prescription.findFirst.mockResolvedValue({
        id: 'rx-1',
        status: PrescriptionStatus.ACTIVE,
      });

      mockPrisma.prescription.update.mockResolvedValue({
        id: 'rx-1',
        status: PrescriptionStatus.CANCELLED,
        cancellationReason: 'Adverse allergic reaction reported',
      });

      const cancelled = await rxService.cancelPrescription('rx-1', mockOrgId, mockActorId, {
        cancellationReason: 'Adverse allergic reaction reported',
      });

      expect(cancelled.status).toBe(PrescriptionStatus.CANCELLED);
    });
  });
});
