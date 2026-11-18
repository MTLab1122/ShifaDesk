import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { SaveMedicalHistoryInput } from '@matabai/validation';

@Injectable()
export class PatientMedicalHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves medical history for a patient
   */
  async getMedicalHistory(patientId: string, organizationId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
    });
    if (!patient) throw new NotFoundException('Patient not found in organization');

    const history = await this.prisma.patientMedicalHistory.findFirst({
      where: { patientId, organizationId },
    });

    return (
      history || {
        id: '',
        organizationId,
        patientId,
        conditions: null,
        surgeries: null,
        allergies: null,
        familyHistory: null,
        socialHistory: null,
        currentMedications: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  /**
   * Upserts medical history for a patient
   */
  async saveMedicalHistory(
    patientId: string,
    organizationId: string,
    actorUserId: string,
    dto: SaveMedicalHistoryInput,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
    });
    if (!patient) throw new NotFoundException('Patient not found in organization');

    return this.prisma.patientMedicalHistory.upsert({
      where: { patientId },
      create: {
        organizationId,
        patientId,
        conditions: dto.conditions || null,
        surgeries: dto.surgeries || null,
        allergies: dto.allergies || null,
        familyHistory: dto.familyHistory || null,
        socialHistory: dto.socialHistory || null,
        currentMedications: dto.currentMedications || null,
        lastUpdatedById: actorUserId,
      },
      update: {
        conditions: dto.conditions !== undefined ? dto.conditions : undefined,
        surgeries: dto.surgeries !== undefined ? dto.surgeries : undefined,
        allergies: dto.allergies !== undefined ? dto.allergies : undefined,
        familyHistory: dto.familyHistory !== undefined ? dto.familyHistory : undefined,
        socialHistory: dto.socialHistory !== undefined ? dto.socialHistory : undefined,
        currentMedications: dto.currentMedications !== undefined ? dto.currentMedications : undefined,
        lastUpdatedById: actorUserId,
      },
    });
  }
}
