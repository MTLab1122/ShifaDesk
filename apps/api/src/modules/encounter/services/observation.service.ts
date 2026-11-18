import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { RecordObservationInput } from '@matabai/validation';

@Injectable()
export class ObservationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records clinical observations and vitals with acceptable input range checks and safe BMI calculation
   */
  async recordObservation(organizationId: string, actorUserId: string, dto: RecordObservationInput) {
    // 1. Verify Patient
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, organizationId },
    });
    if (!patient) throw new NotFoundException('Patient not found in organization');

    // 2. Verify Encounter if specified
    if (dto.encounterId) {
      const encounter = await this.prisma.clinicalEncounter.findFirst({
        where: { id: dto.encounterId, organizationId },
      });
      if (!encounter) throw new NotFoundException('Clinical encounter not found');
      if (encounter.isFinalized) {
        throw new BadRequestException('Cannot add observations to a finalized clinical encounter');
      }
    }

    // 3. BMI Calculation ONLY when valid height and weight are both present
    let bmi: number | null = null;
    if (dto.heightCm && dto.heightCm > 0 && dto.weightKg && dto.weightKg > 0) {
      const heightInMeters = dto.heightCm / 100;
      const rawBmi = dto.weightKg / (heightInMeters * heightInMeters);
      bmi = Math.round(rawBmi * 10) / 10;
    }

    // 4. Save Observation
    return this.prisma.patientObservation.create({
      data: {
        organizationId,
        clinicId: dto.clinicId,
        patientId: dto.patientId,
        encounterId: dto.encounterId || null,
        systolicBp: dto.systolicBp || null,
        diastolicBp: dto.diastolicBp || null,
        pulseRate: dto.pulseRate || null,
        temperature: dto.temperature || null,
        temperatureUnit: dto.temperatureUnit || 'C',
        respiratoryRate: dto.respiratoryRate || null,
        oxygenSaturation: dto.oxygenSaturation || null,
        heightCm: dto.heightCm || null,
        weightKg: dto.weightKg || null,
        bmi,
        recordedById: actorUserId,
        notes: dto.notes || null,
      },
    });
  }

  /**
   * Retrieves observations for an encounter
   */
  async getObservationsForEncounter(encounterId: string, organizationId: string) {
    return this.prisma.patientObservation.findMany({
      where: {
        encounterId,
        organizationId,
      },
      orderBy: { measuredAt: 'desc' },
    });
  }

  /**
   * Retrieves chronological observations for a patient (vital signs trends)
   */
  async getObservationsForPatient(patientId: string, organizationId: string, limit = 50) {
    return this.prisma.patientObservation.findMany({
      where: {
        patientId,
        organizationId,
      },
      take: limit,
      orderBy: { measuredAt: 'desc' },
    });
  }
}
