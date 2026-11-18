import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { SaveClinicalNoteInput } from '@matabai/validation';

@Injectable()
export class ClinicalNoteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts clinical consultation notes for an active encounter
   */
  async saveClinicalNote(
    encounterId: string,
    organizationId: string,
    actorUserId: string,
    dto: SaveClinicalNoteInput,
  ) {
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id: encounterId, organizationId },
    });
    if (!encounter) throw new NotFoundException('Clinical encounter not found');

    if (encounter.isFinalized) {
      throw new BadRequestException(
        'Cannot modify clinical notes on a finalized encounter. Please use the authorized amendment workflow.',
      );
    }

    return this.prisma.clinicalNote.upsert({
      where: { encounterId },
      create: {
        encounterId,
        chiefComplaint: dto.chiefComplaint,
        patientReportedSymptoms: dto.patientReportedSymptoms || null,
        visitPurpose: dto.visitPurpose || null,
        visitContext: dto.visitContext || null,
        examinationNotes: dto.examinationNotes || null,
        clinicalAssessment: dto.clinicalAssessment || null,
        treatmentPlan: dto.treatmentPlan || null,
        remarks: dto.remarks || null,
        recordedById: actorUserId,
      },
      update: {
        chiefComplaint: dto.chiefComplaint,
        patientReportedSymptoms: dto.patientReportedSymptoms || null,
        visitPurpose: dto.visitPurpose || null,
        visitContext: dto.visitContext || null,
        examinationNotes: dto.examinationNotes || null,
        clinicalAssessment: dto.clinicalAssessment || null,
        treatmentPlan: dto.treatmentPlan || null,
        remarks: dto.remarks || null,
        recordedById: actorUserId,
      },
    });
  }

  /**
   * Retrieves clinical note for an encounter
   */
  async getClinicalNote(encounterId: string, organizationId: string) {
    const note = await this.prisma.clinicalNote.findFirst({
      where: {
        encounterId,
        encounter: { organizationId },
      },
    });

    if (!note) throw new NotFoundException('Clinical note not found for this encounter');
    return note;
  }
}
