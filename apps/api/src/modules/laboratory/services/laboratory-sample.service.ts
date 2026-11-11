import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { LaboratoryAuditService } from './laboratory-audit.service';
import {
  CreateLabSampleInput,
  UpdateLabSampleStatusInput,
  QueryLabSamplesInput,
} from '@matabai/validation';
import { LabSampleStatus, LabOrderStatus } from '@matabai/shared';

@Injectable()
export class LaboratorySampleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: LaboratoryAuditService,
  ) {}

  private async generateSampleReference(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `SMP-${yearMonth}-`;

    const count = await this.prisma.laboratorySample.count({
      where: {
        organizationId,
        sampleReference: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  public async createSample(
    organizationId: string,
    input: CreateLabSampleInput,
    actorId: string,
  ) {
    const order = await this.prisma.laboratoryOrder.findFirst({
      where: { id: input.orderId, organizationId },
    });
    if (!order) {
      throw new NotFoundException('Parent laboratory order not found');
    }

    const sampleReference = await this.generateSampleReference(organizationId);

    const sample = await this.prisma.laboratorySample.create({
      data: {
        organizationId,
        clinicId: order.clinicId,
        orderId: order.id,
        sampleReference,
        sampleType: input.sampleType,
        sampleStatus: LabSampleStatus.PENDING,
        collectionInstructions: input.collectionInstructions || null,
        notes: input.notes || null,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: order.clinicId,
      actorId,
      entityType: 'SAMPLE',
      entityId: sample.id,
      action: 'CREATED',
      newValues: {
        sampleReference: sample.sampleReference,
        sampleType: sample.sampleType,
      },
    });

    return sample;
  }

  public async updateSampleStatus(
    organizationId: string,
    sampleId: string,
    input: UpdateLabSampleStatusInput,
    actorId: string,
  ) {
    const sample = await this.prisma.laboratorySample.findFirst({
      where: { id: sampleId, organizationId },
      include: { order: true },
    });
    if (!sample) {
      throw new NotFoundException('Diagnostic sample not found');
    }

    if (
      (input.sampleStatus === LabSampleStatus.REJECTED ||
        input.sampleStatus === LabSampleStatus.RECOLLECTION_REQUIRED) &&
      (!input.rejectionReason || input.rejectionReason.trim().length === 0)
    ) {
      throw new BadRequestException(
        'Rejection reason is required when rejecting a sample or requiring recollection',
      );
    }

    const now = new Date();
    const updateData: any = {
      sampleStatus: input.sampleStatus,
      rejectionReason: input.rejectionReason || sample.rejectionReason,
      notes: input.notes !== undefined ? input.notes : sample.notes,
    };

    if (input.sampleStatus === LabSampleStatus.COLLECTED) {
      updateData.collectedById = actorId;
      updateData.collectedAt = now;
    } else if (input.sampleStatus === LabSampleStatus.RECEIVED || input.sampleStatus === LabSampleStatus.ACCEPTED) {
      updateData.receivedById = actorId;
      updateData.receivedAt = now;
    }

    const updatedSample = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.laboratorySample.update({
        where: { id: sampleId },
        data: updateData,
        include: {
          collectedBy: { select: { id: true, fullName: true } },
          receivedBy: { select: { id: true, fullName: true } },
          order: {
            include: { patient: true },
          },
        },
      });

      // Synchronize order status based on sample progress
      if (
        input.sampleStatus === LabSampleStatus.COLLECTED &&
        (sample.order.orderStatus === LabOrderStatus.REGISTERED ||
          sample.order.orderStatus === LabOrderStatus.SAMPLE_PENDING)
      ) {
        await tx.laboratoryOrder.update({
          where: { id: sample.orderId },
          data: { orderStatus: LabOrderStatus.SAMPLE_COLLECTED },
        });
      } else if (
        (input.sampleStatus === LabSampleStatus.PROCESSING ||
          input.sampleStatus === LabSampleStatus.ACCEPTED) &&
        (sample.order.orderStatus === LabOrderStatus.SAMPLE_COLLECTED ||
          sample.order.orderStatus === LabOrderStatus.REGISTERED)
      ) {
        await tx.laboratoryOrder.update({
          where: { id: sample.orderId },
          data: { orderStatus: LabOrderStatus.PROCESSING },
        });
      }

      return updated;
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: sample.clinicId,
      actorId,
      entityType: 'SAMPLE',
      entityId: sampleId,
      action: 'STATUS_CHANGED',
      previousValues: { sampleStatus: sample.sampleStatus },
      newValues: {
        sampleStatus: updatedSample.sampleStatus,
        rejectionReason: updatedSample.rejectionReason,
      },
    });

    return updatedSample;
  }

  public async listSamples(organizationId: string, query: QueryLabSamplesInput) {
    const {
      page = 1,
      limit = 20,
      clinicId,
      orderId,
      sampleStatus,
      sampleType,
      date,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(clinicId ? { clinicId } : {}),
      ...(orderId ? { orderId } : {}),
      ...(sampleStatus ? { sampleStatus } : {}),
      ...(sampleType ? { sampleType } : {}),
    };

    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
      const endOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    if (search) {
      where.OR = [
        { sampleReference: { contains: search, mode: 'insensitive' } },
        { order: { orderReference: { contains: search, mode: 'insensitive' } } },
        { order: { patient: { fullName: { contains: search, mode: 'insensitive' } } } },
        { order: { patient: { patientNumber: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.laboratorySample.findMany({
        where,
        include: {
          collectedBy: { select: { id: true, fullName: true } },
          receivedBy: { select: { id: true, fullName: true } },
          order: {
            select: {
              id: true,
              orderReference: true,
              orderStatus: true,
              patient: {
                select: { id: true, fullName: true, patientNumber: true, gender: true },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        skip,
        take: limit,
      }),
      this.prisma.laboratorySample.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getSampleById(organizationId: string, sampleId: string) {
    const sample = await this.prisma.laboratorySample.findFirst({
      where: { id: sampleId, organizationId },
      include: {
        order: {
          include: {
            patient: true,
            orderingDoctor: true,
            clinic: true,
          },
        },
        collectedBy: true,
        receivedBy: true,
      },
    });

    if (!sample) {
      throw new NotFoundException('Diagnostic sample not found');
    }

    return sample;
  }
}
