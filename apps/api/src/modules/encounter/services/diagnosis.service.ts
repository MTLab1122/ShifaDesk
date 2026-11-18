import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { CreateDiagnosisInput, UpdateDiagnosisInput } from '@matabai/validation';

@Injectable()
export class DiagnosisService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adds a doctor-entered clinical diagnosis to an encounter
   */
  async createDiagnosis(organizationId: string, actorUserId: string, dto: CreateDiagnosisInput) {
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id: dto.encounterId, organizationId },
    });
    if (!encounter) throw new NotFoundException('Clinical encounter not found');

    if (encounter.isFinalized) {
      throw new BadRequestException('Cannot add diagnosis to a finalized clinical encounter');
    }

    return this.prisma.encounterDiagnosis.create({
      data: {
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        diagnosisDescription: dto.diagnosisDescription,
        diagnosisCode: dto.diagnosisCode || null,
        codingSystem: dto.codingSystem || 'CUSTOM',
        type: dto.type || 'PRIMARY',
        clinicalStatus: dto.clinicalStatus || 'CONFIRMED',
        notes: dto.notes || null,
        diagnosedById: actorUserId,
      },
    });
  }

  /**
   * Updates an existing diagnosis
   */
  async updateDiagnosis(id: string, organizationId: string, actorUserId: string, dto: UpdateDiagnosisInput) {
    const diagnosis = await this.prisma.encounterDiagnosis.findFirst({
      where: { id, encounter: { organizationId } },
      include: { encounter: true },
    });
    if (!diagnosis) throw new NotFoundException('Diagnosis record not found');

    if (diagnosis.encounter.isFinalized) {
      throw new BadRequestException('Cannot edit diagnosis on a finalized clinical encounter');
    }

    return this.prisma.encounterDiagnosis.update({
      where: { id },
      data: {
        diagnosisDescription: dto.diagnosisDescription,
        diagnosisCode: dto.diagnosisCode !== undefined ? dto.diagnosisCode : diagnosis.diagnosisCode,
        codingSystem: dto.codingSystem !== undefined ? dto.codingSystem : diagnosis.codingSystem,
        type: dto.type !== undefined ? dto.type : diagnosis.type,
        clinicalStatus: dto.clinicalStatus !== undefined ? dto.clinicalStatus : diagnosis.clinicalStatus,
        notes: dto.notes !== undefined ? dto.notes : diagnosis.notes,
        diagnosedById: actorUserId,
      },
    });
  }

  /**
   * Deletes a diagnosis record
   */
  async deleteDiagnosis(id: string, organizationId: string) {
    const diagnosis = await this.prisma.encounterDiagnosis.findFirst({
      where: { id, encounter: { organizationId } },
      include: { encounter: true },
    });
    if (!diagnosis) throw new NotFoundException('Diagnosis record not found');

    if (diagnosis.encounter.isFinalized) {
      throw new BadRequestException('Cannot delete diagnosis from a finalized clinical encounter');
    }

    return this.prisma.encounterDiagnosis.delete({ where: { id } });
  }

  /**
   * Retrieves all diagnoses for an encounter
   */
  async getDiagnosesForEncounter(encounterId: string, organizationId: string) {
    return this.prisma.encounterDiagnosis.findMany({
      where: { encounterId, encounter: { organizationId } },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
