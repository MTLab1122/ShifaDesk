import { Test, TestingModule } from '@nestjs/testing';
import { EncounterService } from './services/encounter.service';
import { PrismaService } from '../../common/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { EncounterStatus } from '@matabai/shared';

describe('EncounterLifecycle (EncounterService)', () => {
  let service: EncounterService;
  let mockPrisma: any;

  const mockOrgId = 'org-uuid-1';
  const mockClinicId = 'clinic-uuid-1';
  const mockPatientId = 'patient-uuid-1';
  const mockDoctorId = 'doctor-uuid-1';
  const mockActorId = 'user-uuid-1';

  beforeEach(async () => {
    mockPrisma = {
      clinic: { findFirst: jest.fn() },
      patient: { findFirst: jest.fn() },
      doctor: { findFirst: jest.fn() },
      appointment: { findFirst: jest.fn(), update: jest.fn() },
      queueToken: { update: jest.fn() },
      clinicalEncounter: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      encounterStatusHistory: {
        create: jest.fn(),
      },
      clinicalNote: {
        create: jest.fn(),
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

  describe('createEncounter', () => {
    it('should generate sequential ENC-YYYYMM-XXXX reference and create walk-in encounter', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId });
      mockPrisma.patient.findFirst.mockResolvedValue({ id: mockPatientId });
      mockPrisma.doctor.findFirst.mockResolvedValue({ id: mockDoctorId, userProfile: { fullName: 'Dr. Test' } });
      mockPrisma.clinicalEncounter.count.mockResolvedValue(5);

      mockPrisma.clinicalEncounter.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: 'encounter-uuid-1',
          ...data,
        });
      });

      const result = await service.createEncounter(mockOrgId, mockActorId, {
        clinicId: mockClinicId,
        patientId: mockPatientId,
        doctorId: mockDoctorId,
        source: 'WALK_IN',
        type: 'GENERAL_CONSULTATION',
        chiefComplaint: 'Severe headache and fever',
      });

      expect(result).toBeDefined();
      expect(result.encounterReference).toMatch(/^ENC-\d{6}-0006$/);
      expect(result.status).toBe(EncounterStatus.IN_PROGRESS);
      expect(mockPrisma.encounterStatusHistory.create).toHaveBeenCalled();
      expect(mockPrisma.clinicalNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chiefComplaint: 'Severe headache and fever',
          }),
        }),
      );
    });

    it('should prevent duplicate active encounter when opening from an appointment', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId });
      mockPrisma.patient.findFirst.mockResolvedValue({ id: mockPatientId });
      mockPrisma.doctor.findFirst.mockResolvedValue({ id: mockDoctorId });
      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'apt-1',
        appointmentDate: '2026-11-18',
        startTime: '10:00',
      });

      // Existing active encounter
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: 'existing-enc-1',
        encounterReference: 'ENC-202611-0001',
        status: 'IN_PROGRESS',
      });

      await expect(
        service.createEncounter(mockOrgId, mockActorId, {
          clinicId: mockClinicId,
          patientId: mockPatientId,
          doctorId: mockDoctorId,
          appointmentId: 'apt-1',
          source: 'APPOINTMENT',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should synchronize linked appointment and queue token to in-progress when encounter starts', async () => {
      mockPrisma.clinic.findFirst.mockResolvedValue({ id: mockClinicId });
      mockPrisma.patient.findFirst.mockResolvedValue({ id: mockPatientId });
      mockPrisma.doctor.findFirst.mockResolvedValue({ id: mockDoctorId });
      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'apt-1',
        appointmentDate: '2026-11-18',
        startTime: '10:00',
      });
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue(null); // No existing
      mockPrisma.clinicalEncounter.count.mockResolvedValue(0);

      mockPrisma.clinicalEncounter.create.mockResolvedValue({
        id: 'enc-1',
        encounterReference: 'ENC-202611-0001',
      });

      await service.createEncounter(mockOrgId, mockActorId, {
        clinicId: mockClinicId,
        patientId: mockPatientId,
        doctorId: mockDoctorId,
        appointmentId: 'apt-1',
        queueTokenId: 'token-1',
        source: 'DOCTOR_INITIATED',
      });

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt-1' },
          data: { status: 'IN_PROGRESS' },
        }),
      );

      expect(mockPrisma.queueToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'token-1' },
          data: expect.objectContaining({ status: 'SERVING' }),
        }),
      );
    });
  });

  describe('updateStatus & reassignDoctor', () => {
    it('should transition status and log in status history', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: 'enc-1',
        status: EncounterStatus.CHECKED_IN,
        isFinalized: false,
        appointmentId: null,
        queueTokenId: null,
      });

      mockPrisma.clinicalEncounter.update.mockResolvedValue({
        id: 'enc-1',
        status: EncounterStatus.IN_PROGRESS,
      });

      const updated = await service.updateStatus('enc-1', mockOrgId, mockActorId, {
        status: EncounterStatus.IN_PROGRESS,
        changeReason: 'Patient called into doctor office',
      });

      expect(updated.status).toBe(EncounterStatus.IN_PROGRESS);
      expect(mockPrisma.encounterStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: EncounterStatus.CHECKED_IN,
            toStatus: EncounterStatus.IN_PROGRESS,
            changedById: mockActorId,
          }),
        }),
      );
    });

    it('should block status change on finalized encounter', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: 'enc-1',
        status: EncounterStatus.COMPLETED,
        isFinalized: true,
      });

      await expect(
        service.updateStatus('enc-1', mockOrgId, mockActorId, {
          status: EncounterStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reassign doctor and update appointment if linked', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: 'enc-1',
        doctorId: 'old-doc-id',
        isFinalized: false,
        appointmentId: 'apt-1',
        doctor: { fullName: 'Dr. Previous' },
      });

      mockPrisma.doctor.findFirst.mockResolvedValue({
        id: 'new-doc-id',
        userProfile: { fullName: 'Dr. Specialist' },
      });

      mockPrisma.clinicalEncounter.update.mockResolvedValue({
        id: 'enc-1',
        doctorId: 'new-doc-id',
      });

      await service.reassignDoctor('enc-1', mockOrgId, mockActorId, {
        doctorId: 'new-doc-id',
        reassignmentReason: 'Referred to cardiologist',
      });

      expect(mockPrisma.clinicalEncounter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'enc-1' },
          data: { doctorId: 'new-doc-id' },
        }),
      );

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt-1' },
          data: { doctorId: 'new-doc-id' },
        }),
      );
    });
  });
});
