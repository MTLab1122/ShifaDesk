import { Test, TestingModule } from '@nestjs/testing';
import { ClinicalNoteService } from './services/clinical-note.service';
import { ObservationService } from './services/observation.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('ClinicalNotes & Observations', () => {
  let noteService: ClinicalNoteService;
  let obsService: ObservationService;
  let mockPrisma: any;

  const mockOrgId = 'org-uuid-1';
  const mockClinicId = 'clinic-uuid-1';
  const mockPatientId = 'patient-uuid-1';
  const mockEncounterId = 'enc-uuid-1';
  const mockActorId = 'user-uuid-1';

  beforeEach(async () => {
    mockPrisma = {
      clinic: { findFirst: jest.fn() },
      patient: { findFirst: jest.fn() },
      clinicalEncounter: { findFirst: jest.fn() },
      clinicalNote: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
      },
      patientObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalNoteService,
        ObservationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    noteService = module.get<ClinicalNoteService>(ClinicalNoteService);
    obsService = module.get<ObservationService>(ObservationService);
  });

  describe('ClinicalNoteService', () => {
    it('should save clinical note successfully when encounter is active', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: mockEncounterId,
        organizationId: mockOrgId,
        isFinalized: false,
      });

      mockPrisma.clinicalNote.upsert.mockResolvedValue({
        id: 'note-1',
        encounterId: mockEncounterId,
        chiefComplaint: 'Chest tightness for 2 days',
        clinicalAssessment: 'Probable musculoskeletal pain',
      });

      const note = await noteService.saveClinicalNote(mockEncounterId, mockOrgId, mockActorId, {
        chiefComplaint: 'Chest tightness for 2 days',
        clinicalAssessment: 'Probable musculoskeletal pain',
      });

      expect(note).toBeDefined();
      expect(note.chiefComplaint).toBe('Chest tightness for 2 days');
      expect(mockPrisma.clinicalNote.upsert).toHaveBeenCalled();
    });

    it('should reject note modifications when encounter is finalized', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: mockEncounterId,
        organizationId: mockOrgId,
        isFinalized: true,
      });

      await expect(
        noteService.saveClinicalNote(mockEncounterId, mockOrgId, mockActorId, {
          chiefComplaint: 'Updated complaint',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ObservationService (Vitals & BMI)', () => {
    it('should calculate BMI accurately when both height and weight are provided', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId });
      mockPrisma.patient.findFirst.mockResolvedValue({ id: mockPatientId });
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: mockEncounterId,
        organizationId: mockOrgId,
        isFinalized: false,
      });

      mockPrisma.patientObservation.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({ id: 'obs-1', ...data });
      });

      // Height: 180cm, Weight: 81kg -> BMI = 81 / (1.8 * 1.8) = 25.0
      const result = await obsService.recordObservation(mockOrgId, mockActorId, {
        clinicId: mockClinicId,
        patientId: mockPatientId,
        encounterId: mockEncounterId,
        systolicBp: 120,
        diastolicBp: 80,
        pulseRate: 72,
        temperature: 37,
        temperatureUnit: 'C',
        respiratoryRate: 16,
        oxygenSaturation: 99,
        heightCm: 180,
        weightKg: 81,
      });

      expect(result.bmi).toBe(25.0);
      expect(result.systolicBp).toBe(120);
      expect(result.diastolicBp).toBe(80);
      expect(result.pulseRate).toBe(72);
      expect(result.oxygenSaturation).toBe(99);
    });

    it('should NOT calculate BMI (returns null) when height or weight is missing', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId });
      mockPrisma.patient.findFirst.mockResolvedValue({ id: mockPatientId });

      mockPrisma.patientObservation.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({ id: 'obs-2', ...data });
      });

      // Height missing
      const result = await obsService.recordObservation(mockOrgId, mockActorId, {
        clinicId: mockClinicId,
        patientId: mockPatientId,
        systolicBp: 130,
        diastolicBp: 85,
        weightKg: 75,
      });

      expect(result.bmi).toBeNull();
      expect(result.systolicBp).toBe(130);
    });
  });
});
