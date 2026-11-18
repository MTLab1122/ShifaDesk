import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';

@Injectable()
export class PatientClinicalHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves complete longitudinal clinical history and EMR-Lite chart for a patient
   */
  async getPatientClinicalHistory(patientId: string, organizationId: string) {
    // 1. Verify Patient
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
    });
    if (!patient) throw new NotFoundException('Patient not found in organization');

    // 2. Fetch all clinical records concurrently
    const [medicalHistory, encounters, observations, diagnoses, prescriptions, laboratoryOrders, followups] =
      await Promise.all([
        this.prisma.patientMedicalHistory.findFirst({
          where: { patientId, organizationId },
        }),
        this.prisma.clinicalEncounter.findMany({
          where: { patientId, organizationId },
          orderBy: { encounterDate: 'desc' },
          include: {
            doctor: { include: { userProfile: true } },
            clinic: true,
            clinicalNote: true,
            diagnoses: true,
            observations: true,
            prescriptions: { include: { items: true } },
            laboratoryOrders: { include: { reports: true } },
            followups: true,
            amendments: true,
            documentVersions: true,
          },
        }),
        this.prisma.patientObservation.findMany({
          where: { patientId, organizationId },
          orderBy: { measuredAt: 'desc' },
          take: 100,
        }),
        this.prisma.encounterDiagnosis.findMany({
          where: { patientId, encounter: { organizationId } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.prescription.findMany({
          where: { patientId, organizationId },
          orderBy: { createdAt: 'desc' },
          include: { items: true, doctor: true, clinic: true },
        }),
        this.prisma.laboratoryOrder.findMany({
          where: { patientId, organizationId },
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            samples: true,
            reports: {
              where: { reportStatus: 'RELEASED' },
            },
          },
        }),
        this.prisma.encounterFollowup.findMany({
          where: { patientId, encounter: { organizationId } },
          orderBy: { recommendedDate: 'desc' },
        }),
      ]);

    return {
      patient,
      medicalHistory,
      encounters,
      observations,
      diagnoses,
      prescriptions,
      laboratoryOrders,
      followups,
    };
  }

  /**
   * Retrieves patient-facing consultation history (only released, completed, and sanitized records)
   */
  async getPatientFacingEncounters(patientId: string, organizationId: string) {
    return this.prisma.clinicalEncounter.findMany({
      where: {
        patientId,
        organizationId,
        status: { in: ['COMPLETED', 'PENDING_REVIEW', 'IN_PROGRESS', 'SCHEDULED', 'CHECKED_IN'] },
      },
      orderBy: { encounterDate: 'desc' },
      include: {
        doctor: { select: { fullName: true, specialty: true, registrationNumber: true } },
        clinic: { select: { name: true, phone: true, address: true } },
        diagnoses: { select: { diagnosisDescription: true, diagnosisCode: true, type: true } },
        prescriptions: {
          where: { status: { in: ['ACTIVE', 'AMENDED', 'DISPENSED'] } },
          include: { items: true },
        },
        followups: true,
        documentVersions: {
          where: { isFinal: true },
          select: { id: true, documentTitle: true, versionNumber: true, signedAt: true },
        },
      },
    });
  }
}
