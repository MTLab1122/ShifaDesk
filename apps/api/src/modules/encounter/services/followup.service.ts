import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import {
  CreateFollowupInput,
  UpdateFollowupInput,
  QueryFollowupsInput,
} from '@matabai/validation';
import { FollowupStatus } from '@matabai/shared';

@Injectable()
export class FollowupService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a doctor-recommended follow-up plan
   */
  async createFollowup(
    encounterId: string,
    organizationId: string,
    _actorUserId: string,
    dto: CreateFollowupInput,
  ) {
    const encounter = await this.prisma.clinicalEncounter.findFirst({
      where: { id: encounterId, organizationId },
    });
    if (!encounter) throw new NotFoundException('Clinical encounter not found');

    return this.prisma.encounterFollowup.create({
      data: {
        encounterId,
        clinicId: dto.clinicId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        followupRequired: dto.followupRequired !== undefined ? dto.followupRequired : true,
        recommendedDate: dto.recommendedDate,
        instructions: dto.instructions,
        status: FollowupStatus.PENDING,
      },
      include: {
        encounter: true,
      },
    });
  }

  /**
   * Updates follow-up status (e.g. when linked appointment is scheduled or completed)
   */
  async updateFollowup(
    id: string,
    organizationId: string,
    _actorUserId: string,
    dto: UpdateFollowupInput,
  ) {
    const followup = await this.prisma.encounterFollowup.findFirst({
      where: {
        id,
        encounter: { organizationId },
      },
    });
    if (!followup) throw new NotFoundException('Follow-up record not found');

    return this.prisma.encounterFollowup.update({
      where: { id },
      data: {
        status: dto.status,
        scheduledAppointmentId:
          dto.scheduledAppointmentId !== undefined
            ? dto.scheduledAppointmentId
            : followup.scheduledAppointmentId,
        instructions: dto.instructions !== undefined ? dto.instructions : followup.instructions,
      },
    });
  }

  /**
   * Queries follow-up records with filters and pagination
   */
  async queryFollowups(organizationId: string, query: QueryFollowupsInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      encounter: { organizationId },
    };

    if (query.clinicId) where.clinicId = query.clinicId;
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;
    if (query.date) where.recommendedDate = query.date;

    if (query.startDate || query.endDate) {
      where.recommendedDate = {};
      if (query.startDate) where.recommendedDate.gte = query.startDate;
      if (query.endDate) where.recommendedDate.lte = query.endDate;
    }

    const [total, data] = await Promise.all([
      this.prisma.encounterFollowup.count({ where }),
      this.prisma.encounterFollowup.findMany({
        where,
        skip,
        take: limit,
        orderBy: { recommendedDate: 'asc' },
        include: {
          encounter: {
            include: {
              patient: true,
              doctor: { include: { userProfile: true } },
              clinic: true,
            },
          },
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
