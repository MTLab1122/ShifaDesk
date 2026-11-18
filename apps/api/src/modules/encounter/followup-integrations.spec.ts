import { Test, TestingModule } from '@nestjs/testing';
import { FollowupService } from './services/followup.service';
import { PatientClinicalHistoryService } from './services/patient-clinical-history.service';
import { PrismaService } from '../../common/database/prisma.service';
import { FollowupStatus } from '@matabai/shared';

describe('Followup & Clinical Integrations', () => {
  let followupService: FollowupService;
  let chartService: PatientClinicalHistoryService;
  let mockPrisma: any;

  const mockOrgId = 'org-uuid-1';
  const mockClinicId = 'clinic-uuid-1';
  const mockPatientId = 'patient-uuid-1';
  const mockDoctorId = 'doctor-uuid-1';
  const mockEncounterId = 'enc-uuid-1';
  const mockActorId = 'user-uuid-1';

  beforeEach(async () => {
    mockPrisma = {
      clinicalEncounter: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      encounterFollowup: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      patient: { findFirst: jest.fn() },
      patientMedicalHistory: { findFirst: jest.fn() },
      patientObservation: { findMany: jest.fn() },
      encounterDiagnosis: { findMany: jest.fn().mockResolvedValue([]) },
      prescription: { findMany: jest.fn() },
      laboratoryOrder: { findMany: jest.fn() },
      invoice: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowupService,
        PatientClinicalHistoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    followupService = module.get<FollowupService>(FollowupService);
    chartService = module.get<PatientClinicalHistoryService>(PatientClinicalHistoryService);
  });

  describe('FollowupService', () => {
    it('should create follow-up plan with recommended date and instructions', async () => {
      mockPrisma.clinicalEncounter.findFirst.mockResolvedValue({
        id: mockEncounterId,
        organizationId: mockOrgId,
      });

      mockPrisma.encounterFollowup.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({ id: 'fup-1', ...data });
      });

      const fup = await followupService.createFollowup(
        mockEncounterId,
        mockOrgId,
        mockActorId,
        {
          encounterId: mockEncounterId,
          clinicId: mockClinicId,
          patientId: mockPatientId,
          doctorId: mockDoctorId,
          recommendedDate: '2026-11-25',
          instructions: 'Check BP and review blood sugar log in 1 week',
        },
      );

      expect(fup).toBeDefined();
      expect(fup.recommendedDate).toBe('2026-11-25');
      expect(fup.status).toBe(FollowupStatus.PENDING);
    });

    it('should update follow-up status when linked to a scheduled appointment', async () => {
      mockPrisma.encounterFollowup.findFirst.mockResolvedValue({
        id: 'fup-1',
        status: FollowupStatus.PENDING,
      });

      mockPrisma.encounterFollowup.update.mockResolvedValue({
        id: 'fup-1',
        status: FollowupStatus.SCHEDULED,
        scheduledAppointmentId: 'apt-followup-1',
      });

      const updated = await followupService.updateFollowup(
        'fup-1',
        mockOrgId,
        mockActorId,
        {
          status: 'SCHEDULED',
          scheduledAppointmentId: 'apt-followup-1',
        },
      );

      expect(updated.status).toBe('SCHEDULED');
      expect(updated.scheduledAppointmentId).toBe('apt-followup-1');
    });
  });

  describe('PatientClinicalHistoryService (EMR-Lite Longitudinal Chart)', () => {
    it('should aggregate patient history across encounters, vitals, prescriptions, lab orders, and follow-ups', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({
        id: mockPatientId,
        fullName: 'Zainab Bibi',
      });

      mockPrisma.patientMedicalHistory.findFirst.mockResolvedValue({
        allergies: 'Penicillin',
        conditions: 'Asthma',
      });

      mockPrisma.clinicalEncounter.findMany.mockResolvedValue([
        { id: 'enc-1', encounterReference: 'ENC-202611-0001', isFinalized: true },
      ]);

      mockPrisma.patientObservation.findMany.mockResolvedValue([
        { systolicBp: 118, diastolicBp: 78, measuredAt: new Date() },
      ]);

      mockPrisma.prescription.findMany.mockResolvedValue([
        { prescriptionReference: 'RX-202611-0001', status: 'ACTIVE' },
      ]);

      mockPrisma.laboratoryOrder.findMany.mockResolvedValue([
        { orderReference: 'LAB-202611-0001', reports: [{ reportStatus: 'RELEASED' }] },
      ]);

      mockPrisma.encounterFollowup.findMany.mockResolvedValue([
        { recommendedDate: '2026-11-25', status: 'PENDING' },
      ]);

      const chart = await chartService.getPatientClinicalHistory(mockPatientId, mockOrgId);

      expect(chart).toBeDefined();
      expect(chart.patient.fullName).toBe('Zainab Bibi');
      expect(chart.medicalHistory?.allergies).toBe('Penicillin');
      expect(chart.encounters.length).toBe(1);
      expect(chart.observations.length).toBe(1);
      expect(chart.prescriptions.length).toBe(1);
      expect(chart.laboratoryOrders.length).toBe(1);
      expect(chart.followups.length).toBe(1);
    });

    it('should return sanitized encounters for patient self-view', async () => {
      mockPrisma.clinicalEncounter.findMany.mockResolvedValue([
        {
          id: 'enc-1',
          encounterDate: '2026-11-18',
          doctor: { fullName: 'Dr. Ahmad', specialty: 'General Physician' },
          clinic: { name: 'City Clinic' },
          diagnoses: [{ diagnosisDescription: 'Seasonal Rhinitis' }],
          prescriptions: [{ items: [{ medicationName: 'Cetirizine' }] }],
          followups: [],
          documentVersions: [{ documentTitle: 'Consultation Summary', versionNumber: 1 }],
        },
      ]);

      const patientEncounters = await chartService.getPatientFacingEncounters(
        mockPatientId,
        mockOrgId,
      );

      expect(patientEncounters.length).toBe(1);
      expect(patientEncounters[0]!.doctor.fullName).toBe('Dr. Ahmad');
      expect(patientEncounters[0]!.diagnoses[0]!.diagnosisDescription).toBe('Seasonal Rhinitis');
    });
  });
});
