import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import {
  CreateEncounterInput,
  UpdateEncounterStatusInput,
  ReassignEncounterInput,
  CancelEncounterInput,
  QueryEncountersInput,
  FinalizeEncounterInput,
  AmendEncounterInput,
} from '@matabai/validation';
import { EncounterStatus } from '@matabai/shared';

@Injectable()
export class EncounterService {
  private readonly logger = new Logger(EncounterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates next sequential reference: ENC-YYYYMM-XXXX
   */
  private async generateEncounterReference(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `ENC-${yearMonth}-`;

    const count = await this.prisma.clinicalEncounter.count({
      where: {
        organizationId,
        encounterReference: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Creates a new clinical encounter from Appointment, Walk-In, Doctor, or Receptionist
   */
  async createEncounter(organizationId: string, actorUserId: string, dto: CreateEncounterInput) {
    // 1. Verify Clinic
    const clinic = await this.prisma.clinic.findFirst({
      where: { id: dto.clinicId, organizationId },
    });
    if (!clinic) throw new NotFoundException('Clinic not found in organization');

    // 2. Verify Patient
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, organizationId },
    });
    if (!patient) throw new NotFoundException('Patient not found in organization');

    // 3. Verify Doctor
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: dto.doctorId, organizationId },
      include: { userProfile: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found in organization');

    // 4. Appointment Check & Duplicate Prevention
    let appointmentDate = dto.encounterDate;
    let appointmentStartTime = dto.startTime;

    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, organizationId },
      });
      if (!appointment) throw new NotFoundException('Referenced appointment not found');

      // Prevent duplicate active encounter for same appointment
      const activeExisting = await this.prisma.clinicalEncounter.findFirst({
        where: {
          appointmentId: dto.appointmentId,
          status: { in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'PENDING_REVIEW'] },
        },
      });
      if (activeExisting) {
        throw new BadRequestException(
          `An active clinical encounter (${activeExisting.encounterReference}) already exists for this appointment`,
        );
      }

      appointmentDate = appointmentDate || appointment.appointmentDate;
      appointmentStartTime = appointmentStartTime || appointment.startTime;
    }

    // 5. Default date/time if not provided
    const today = new Date();
    const encounterDate = appointmentDate || today.toISOString().split('T')[0]!;
    const startTime =
      appointmentStartTime ||
      `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    // 6. Generate sequential reference
    const encounterReference = await this.generateEncounterReference(organizationId);

    // Initial status based on source
    const initialStatus =
      dto.source === 'WALK_IN' || dto.source === 'DOCTOR_INITIATED'
        ? EncounterStatus.IN_PROGRESS
        : EncounterStatus.CHECKED_IN;

    // 7. Atomic creation with status history and optional clinical note
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.clinicalEncounter.create({
        data: {
          organizationId,
          clinicId: dto.clinicId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          appointmentId: dto.appointmentId || null,
          queueTokenId: dto.queueTokenId || null,
          encounterReference,
          encounterDate,
          startTime,
          timezone: 'Asia/Karachi',
          status: initialStatus,
          source: dto.source || 'WALK_IN',
          type: dto.type || 'GENERAL_CONSULTATION',
          createdById: actorUserId,
        },
        include: {
          patient: true,
          doctor: { include: { userProfile: true } },
          clinic: true,
          appointment: true,
          queueToken: true,
        },
      });

      // Record initial status history
      await tx.encounterStatusHistory.create({
        data: {
          encounterId: encounter.id,
          fromStatus: null,
          toStatus: initialStatus,
          changeReason: `Encounter opened via ${dto.source || 'WALK_IN'}`,
          changedById: actorUserId,
        },
      });

      // Create initial clinical note if chief complaint provided
      if (dto.chiefComplaint) {
        await tx.clinicalNote.create({
          data: {
            encounterId: encounter.id,
            chiefComplaint: dto.chiefComplaint,
            visitPurpose: dto.visitPurpose || null,
            visitContext: dto.visitContext || null,
            recordedById: actorUserId,
          },
        });
      }

      // Synchronize appointment status if linked
      if (dto.appointmentId && initialStatus === EncounterStatus.IN_PROGRESS) {
        await tx.appointment.update({
          where: { id: dto.appointmentId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      // Synchronize queue token status if linked
      if (dto.queueTokenId && initialStatus === EncounterStatus.IN_PROGRESS) {
        await tx.queueToken.update({
          where: { id: dto.queueTokenId },
          data: { status: 'SERVING', serviceStartedAt: new Date() },
        });
      }

      return encounter;
    });
  }

  /**
   * Retrieves an encounter by ID with all clinical sub-entities
   */
  async getEncounter(id: string, organizationId: string) {
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id, organizationId },
      include: {
        patient: true,
        doctor: { include: { userProfile: true } },
        clinic: true,
        appointment: true,
        queueToken: true,
        clinicalNote: true,
        observations: { orderBy: { measuredAt: 'desc' } },
        diagnoses: { orderBy: { createdAt: 'asc' } },
        prescriptions: {
          include: { items: true, amendments: true },
          orderBy: { createdAt: 'desc' },
        },
        laboratoryOrders: {
          include: { items: true, samples: true, reports: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          include: { items: true, payments: true },
          orderBy: { createdAt: 'desc' },
        },
        followups: { orderBy: { createdAt: 'desc' } },
        amendments: { orderBy: { versionNumber: 'desc' } },
        documentVersions: { orderBy: { versionNumber: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!encounter) throw new NotFoundException('Clinical encounter not found');
    return encounter;
  }

  /**
   * Updates encounter status with state machine enforcement and appointment/queue sync
   */
  async updateStatus(
    id: string,
    organizationId: string,
    actorUserId: string,
    dto: UpdateEncounterStatusInput,
  ) {
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id, organizationId },
    });
    if (!encounter) throw new NotFoundException('Clinical encounter not found');

    if (encounter.isFinalized && dto.status !== EncounterStatus.COMPLETED) {
      throw new BadRequestException('Cannot change status of a finalized encounter. Record is locked.');
    }

    if (encounter.status === EncounterStatus.CANCELLED) {
      throw new BadRequestException('Cannot change status of a cancelled encounter.');
    }

    const fromStatus = encounter.status;
    const toStatus = dto.status;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.clinicalEncounter.update({
        where: { id },
        data: {
          status: toStatus,
          endTime: dto.endTime || (toStatus === EncounterStatus.COMPLETED ? new Date().toTimeString().substring(0, 5) : encounter.endTime),
        },
        include: {
          patient: true,
          doctor: { include: { userProfile: true } },
          clinic: true,
          clinicalNote: true,
        },
      });

      // Record status transition
      await tx.encounterStatusHistory.create({
        data: {
          encounterId: id,
          fromStatus,
          toStatus,
          changeReason: dto.changeReason || null,
          changedById: actorUserId,
        },
      });

      // Synchronize appointment
      if (encounter.appointmentId) {
        if (toStatus === EncounterStatus.COMPLETED) {
          await tx.appointment.update({
            where: { id: encounter.appointmentId },
            data: { status: 'COMPLETED' },
          });
        } else if (toStatus === EncounterStatus.CANCELLED) {
          await tx.appointment.update({
            where: { id: encounter.appointmentId },
            data: { status: 'CANCELLED', cancellationReason: dto.changeReason || 'Encounter cancelled' },
          });
        }
      }

      // Synchronize queue token
      if (encounter.queueTokenId) {
        if (toStatus === EncounterStatus.COMPLETED) {
          await tx.queueToken.update({
            where: { id: encounter.queueTokenId },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        } else if (toStatus === EncounterStatus.CANCELLED) {
          await tx.queueToken.update({
            where: { id: encounter.queueTokenId },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          });
        }
      }

      return updated;
    });
  }

  /**
   * Reassigns encounter to another doctor with audit history
   */
  async reassignDoctor(
    id: string,
    organizationId: string,
    actorUserId: string,
    dto: ReassignEncounterInput,
  ) {
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id, organizationId },
      include: { doctor: { include: { userProfile: true } } },
    });
    if (!encounter) throw new NotFoundException('Clinical encounter not found');

    if (encounter.isFinalized) {
      throw new BadRequestException('Cannot reassign a finalized clinical encounter');
    }

    const newDoctor = await this.prisma.doctor.findFirst({
      where: { id: dto.doctorId, organizationId },
      include: { userProfile: true },
    });
    if (!newDoctor) throw new NotFoundException('Target doctor not found');

    const previousDoctorName = encounter.doctor.fullName;
    const newDoctorName = newDoctor.fullName;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.clinicalEncounter.update({
        where: { id },
        data: { doctorId: dto.doctorId },
        include: {
          doctor: { include: { userProfile: true } },
          patient: true,
          clinic: true,
        },
      });

      if (encounter.appointmentId) {
        await tx.appointment.update({
          where: { id: encounter.appointmentId },
          data: { doctorId: dto.doctorId },
        });
      }

      await tx.encounterStatusHistory.create({
        data: {
          encounterId: id,
          fromStatus: encounter.status,
          toStatus: encounter.status,
          changeReason: `Reassigned from Dr. ${previousDoctorName} to Dr. ${newDoctorName}. Reason: ${dto.reassignmentReason}`,
          changedById: actorUserId,
        },
      });

      return updated;
    });
  }

  /**
   * Cancels encounter with mandatory clinical justification
   */
  async cancelEncounter(
    id: string,
    organizationId: string,
    actorUserId: string,
    dto: CancelEncounterInput,
  ) {
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id, organizationId },
    });
    if (!encounter) throw new NotFoundException('Clinical encounter not found');

    if (encounter.isFinalized) {
      throw new BadRequestException('Cannot cancel a finalized clinical encounter');
    }

    return this.updateStatus(id, organizationId, actorUserId, {
      status: EncounterStatus.CANCELLED,
      changeReason: dto.cancellationReason,
    });
  }

  /**
   * Finalizes an encounter, locking it against direct edits and snapshotting a clinical document version
   */
  async finalizeEncounter(
    id: string,
    organizationId: string,
    actorUserId: string,
    dto: FinalizeEncounterInput,
  ) {
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id, organizationId },
      include: {
        clinicalNote: true,
        diagnoses: true,
        prescriptions: { include: { items: true } },
        observations: true,
        patient: true,
        doctor: { include: { userProfile: true } },
        clinic: true,
      },
    });

    if (!encounter) throw new NotFoundException('Clinical encounter not found');
    if (encounter.isFinalized) {
      throw new BadRequestException('Encounter is already finalized');
    }

    if (!dto.confirmedByDoctor) {
      throw new BadRequestException('Explicit doctor confirmation is required to finalize an encounter');
    }

    // Validation of mandatory clinical sections
    if (!encounter.clinicalNote || !encounter.clinicalNote.chiefComplaint) {
      throw new BadRequestException('Cannot finalize encounter: Chief complaint is mandatory');
    }

    this.logger.log(`Finalizing encounter ${encounter.encounterReference} by actor ${actorUserId}`);

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark finalized and COMPLETED
      const finalized = await tx.clinicalEncounter.update({
        where: { id },
        data: {
          isFinalized: true,
          finalizedAt: now,
          finalizedById: actorUserId,
          status: EncounterStatus.COMPLETED,
          endTime: new Date().toTimeString().substring(0, 5),
        },
        include: {
          patient: true,
          doctor: { include: { userProfile: true } },
          clinic: true,
          clinicalNote: true,
          diagnoses: true,
          prescriptions: { include: { items: true } },
        },
      });

      // 2. Status History
      await tx.encounterStatusHistory.create({
        data: {
          encounterId: id,
          fromStatus: encounter.status,
          toStatus: EncounterStatus.COMPLETED,
          changeReason: 'Encounter formally finalized and signed by attending doctor',
          changedById: actorUserId,
        },
      });

      // 3. Document Snapshot
      const documentContent = {
        encounterReference: encounter.encounterReference,
        encounterDate: encounter.encounterDate,
        patient: {
          id: encounter.patient.id,
          fullName: encounter.patient.fullName,
          patientNumber: encounter.patient.patientNumber,
          gender: encounter.patient.gender,
          dateOfBirth: encounter.patient.dateOfBirth,
        },
        doctor: {
          id: encounter.doctor.id,
          fullName: encounter.doctor.fullName,
          specialty: encounter.doctor.specialty,
          pmdcNumber: encounter.doctor.registrationNumber,
        },
        clinic: {
          id: encounter.clinic.id,
          name: encounter.clinic.name,
        },
        clinicalNote: encounter.clinicalNote,
        diagnoses: encounter.diagnoses,
        prescriptions: encounter.prescriptions,
        observations: encounter.observations,
        finalizedAt: now.toISOString(),
        finalizedById: actorUserId,
      };

      await tx.clinicalDocumentVersion.create({
        data: {
          encounterId: id,
          documentType: 'ENCOUNTER_SUMMARY',
          versionNumber: 1,
          documentTitle: `Clinical Encounter Summary - ${encounter.encounterReference}`,
          contentJson: JSON.stringify(documentContent),
          isFinal: true,
          signedById: actorUserId,
          signedAt: now,
        },
      });

      // 4. Synchronize linked appointment and queue token
      if (encounter.appointmentId) {
        await tx.appointment.update({
          where: { id: encounter.appointmentId },
          data: { status: 'COMPLETED' },
        });
      }

      if (encounter.queueTokenId) {
        await tx.queueToken.update({
          where: { id: encounter.queueTokenId },
          data: { status: 'COMPLETED', completedAt: now },
        });
      }

      return finalized;
    });
  }

  /**
   * Submits an authorized amendment to a finalized encounter with version control
   */
  async amendEncounter(
    id: string,
    organizationId: string,
    actorUserId: string,
    dto: AmendEncounterInput,
  ) {
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id, organizationId },
      include: {
        clinicalNote: true,
        diagnoses: true,
        documentVersions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    if (!encounter) throw new NotFoundException('Clinical encounter not found');
    if (!encounter.isFinalized) {
      throw new BadRequestException('Encounter is not yet finalized. Amendments are only for finalized records.');
    }

    const latestVersion = encounter.documentVersions[0]?.versionNumber || 1;
    const nextVersion = latestVersion + 1;

    const previousState = {
      clinicalNote: encounter.clinicalNote,
      diagnoses: encounter.diagnoses,
    };

    return this.prisma.$transaction(async (tx) => {
      // 1. Apply updated notes if provided
      if (dto.notes) {
        await tx.clinicalNote.upsert({
          where: { encounterId: id },
          create: {
            encounterId: id,
            chiefComplaint: dto.notes.chiefComplaint,
            patientReportedSymptoms: dto.notes.patientReportedSymptoms || null,
            visitPurpose: dto.notes.visitPurpose || null,
            visitContext: dto.notes.visitContext || null,
            examinationNotes: dto.notes.examinationNotes || null,
            clinicalAssessment: dto.notes.clinicalAssessment || null,
            treatmentPlan: dto.notes.treatmentPlan || null,
            remarks: dto.notes.remarks || null,
            recordedById: actorUserId,
          },
          update: {
            chiefComplaint: dto.notes.chiefComplaint,
            patientReportedSymptoms: dto.notes.patientReportedSymptoms || null,
            visitPurpose: dto.notes.visitPurpose || null,
            visitContext: dto.notes.visitContext || null,
            examinationNotes: dto.notes.examinationNotes || null,
            clinicalAssessment: dto.notes.clinicalAssessment || null,
            treatmentPlan: dto.notes.treatmentPlan || null,
            remarks: dto.notes.remarks || null,
            recordedById: actorUserId,
          },
        });
      }

      // 2. Apply updated diagnoses if provided
      if (dto.diagnoses && dto.diagnoses.length > 0) {
        await tx.encounterDiagnosis.deleteMany({ where: { encounterId: id } });
        for (const diag of dto.diagnoses) {
          await tx.encounterDiagnosis.create({
            data: {
              encounterId: id,
              patientId: encounter.patientId,
              diagnosisDescription: diag.diagnosisDescription,
              diagnosisCode: diag.diagnosisCode || null,
              codingSystem: diag.codingSystem || 'CUSTOM',
              type: diag.type || 'PRIMARY',
              clinicalStatus: diag.clinicalStatus || 'CONFIRMED',
              notes: diag.notes || null,
              diagnosedById: actorUserId,
            },
          });
        }
      }

      const amendedState = {
        notes: dto.notes || encounter.clinicalNote,
        diagnoses: dto.diagnoses || encounter.diagnoses,
      };

      // 3. Record amendment ledger
      const amendment = await tx.encounterAmendment.create({
        data: {
          encounterId: id,
          versionNumber: nextVersion,
          amendmentReason: dto.amendmentReason,
          amendedById: actorUserId,
          previousStateJson: JSON.stringify(previousState),
          amendedStateJson: JSON.stringify(amendedState),
        },
      });

      // 4. Create new clinical document version
      await tx.clinicalDocumentVersion.create({
        data: {
          encounterId: id,
          documentType: 'ENCOUNTER_SUMMARY',
          versionNumber: nextVersion,
          documentTitle: `Amended Clinical Summary (v${nextVersion}) - ${encounter.encounterReference}`,
          contentJson: JSON.stringify(amendedState),
          isFinal: true,
          signedById: actorUserId,
          signedAt: new Date(),
        },
      });

      return amendment;
    });
  }

  /**
   * Queries encounters with pagination and multi-dimensional filters
   */
  async queryEncounters(organizationId: string, query: QueryEncountersInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.clinicId) where.clinicId = query.clinicId;
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;
    if (query.date) where.encounterDate = query.date;

    if (query.startDate || query.endDate) {
      where.encounterDate = {};
      if (query.startDate) where.encounterDate.gte = query.startDate;
      if (query.endDate) where.encounterDate.lte = query.endDate;
    }

    if (query.search) {
      where.OR = [
        { encounterReference: { contains: query.search, mode: 'insensitive' } },
        { patient: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { patient: { phone: { contains: query.search } } },
        { patient: { patientNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.clinicalEncounter.count({ where }),
      this.prisma.clinicalEncounter.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ encounterDate: 'desc' }, { startTime: 'desc' }],
        include: {
          patient: true,
          doctor: { include: { userProfile: true } },
          clinic: true,
          clinicalNote: true,
          diagnoses: true,
          prescriptions: { select: { id: true, prescriptionReference: true, status: true } },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
