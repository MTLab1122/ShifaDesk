import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { LaboratoryAuditService } from './laboratory-audit.service';
import {
  CreateLabOrderInput,
  UpdateLabOrderInput,
  CancelLabOrderInput,
  QueryLabOrdersInput,
} from '@matabai/validation';
import { LabOrderStatus } from '@matabai/shared';

@Injectable()
export class LaboratoryOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: LaboratoryAuditService,
  ) {}

  /**
   * Generate sequential human-readable reference e.g. LAB-202611-0001
   */
  private async generateOrderReference(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `LAB-${yearMonth}-`;

    const count = await this.prisma.laboratoryOrder.count({
      where: {
        organizationId,
        orderReference: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Generate sequential sample reference e.g. SMP-202611-0001
   */
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

  /**
   * Create laboratory diagnostic order with immutable price snapshotting
   */
  public async createOrder(
    organizationId: string,
    input: CreateLabOrderInput,
    actorId: string,
  ) {
    // 1. Verify Clinic & Patient belong to organization
    const clinic = await this.prisma.clinic.findFirst({
      where: { id: input.clinicId, organizationId },
    });
    if (!clinic) {
      throw new BadRequestException('Clinic does not exist in this organization');
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: input.patientId, organizationId },
    });
    if (!patient) {
      throw new BadRequestException('Patient not found in this organization');
    }

    if (input.orderingDoctorId) {
      const doctor = await this.prisma.doctor.findFirst({
        where: { id: input.orderingDoctorId, organizationId },
      });
      if (!doctor) {
        throw new BadRequestException('Ordering doctor not found in this organization');
      }
    }

    // 2. Fetch all individual tests
    const individualTestIds = input.testIds || [];
    const individualTests = individualTestIds.length > 0
      ? await this.prisma.laboratoryTest.findMany({
          where: { id: { in: individualTestIds }, organizationId, active: true },
        })
      : [];

    if (individualTests.length !== individualTestIds.length) {
      throw new BadRequestException('One or more selected diagnostic tests are invalid or inactive');
    }

    // 3. Fetch all packages and their included tests
    const packageIds = input.packageIds || [];
    const packages = packageIds.length > 0
      ? await this.prisma.laboratoryPackage.findMany({
          where: { id: { in: packageIds }, organizationId, active: true },
          include: {
            items: {
              include: {
                test: true,
              },
            },
          },
        })
      : [];

    if (packages.length !== packageIds.length) {
      throw new BadRequestException('One or more selected packages are invalid or inactive');
    }

    // 4. Build line items with immutable snapshots and calculate total price
    interface PendingItem {
      testId: string;
      packageId?: string | null;
      testNameSnapshot: string;
      testCodeSnapshot: string;
      priceSnapshot: number;
      sampleType: string;
    }

    const pendingItems: PendingItem[] = [];
    let calculatedTotal = 0;

    // Add individual tests
    for (const test of individualTests) {
      pendingItems.push({
        testId: test.id,
        packageId: null,
        testNameSnapshot: test.testName,
        testCodeSnapshot: test.testCode,
        priceSnapshot: test.price,
        sampleType: test.sampleType,
      });
      calculatedTotal += test.price;
    }

    // Add package tests (distribute package price evenly or snapshot package unit price)
    for (const pkg of packages) {
      const itemCount = pkg.items.length;
      const unitPackagePrice = itemCount > 0 ? Number((pkg.price / itemCount).toFixed(2)) : 0;

      for (const item of pkg.items) {
        pendingItems.push({
          testId: item.test.id,
          packageId: pkg.id,
          testNameSnapshot: item.test.testName,
          testCodeSnapshot: item.test.testCode,
          priceSnapshot: unitPackagePrice,
          sampleType: item.test.sampleType,
        });
      }
      calculatedTotal += pkg.price;
    }

    if (pendingItems.length === 0) {
      throw new BadRequestException('At least one diagnostic test or package must be included');
    }

    // 5. Generate references
    const orderReference = await this.generateOrderReference(organizationId);

    // 6. Execute atomic creation transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create order header
      const createdOrder = await tx.laboratoryOrder.create({
        data: {
          organizationId,
          clinicId: input.clinicId,
          patientId: input.patientId,
          orderingDoctorId: input.orderingDoctorId || null,
          appointmentId: input.appointmentId || null,
          orderReference,
          orderStatus: LabOrderStatus.REGISTERED,
          totalAmount: calculatedTotal,
          currency: 'PKR',
          notes: input.notes || null,
          createdById: actorId,
          expectedCompletionDate: input.expectedCompletionDate
            ? new Date(input.expectedCompletionDate)
            : null,
        },
      });

      // Create line items
      for (const item of pendingItems) {
        await tx.laboratoryOrderItem.create({
          data: {
            orderId: createdOrder.id,
            testId: item.testId,
            packageId: item.packageId || null,
            testNameSnapshot: item.testNameSnapshot,
            testCodeSnapshot: item.testCodeSnapshot,
            priceSnapshot: item.priceSnapshot,
            status: 'PENDING',
          },
        });
      }

      // Group required sample types and create initial sample records
      const uniqueSampleTypes = Array.from(new Set(pendingItems.map((i) => i.sampleType)));
      for (let idx = 0; idx < uniqueSampleTypes.length; idx++) {
        const sampleType = uniqueSampleTypes[idx] || 'Blood';
        const sampleReference = await this.generateSampleReference(organizationId);
        await tx.laboratorySample.create({
          data: {
            organizationId,
            clinicId: input.clinicId,
            orderId: createdOrder.id,
            sampleReference,
            sampleType,
            sampleStatus: 'PENDING',
            collectionInstructions: `Routine ${sampleType} specimen collection for ${orderReference}`,
          },
        });
      }

      return tx.laboratoryOrder.findUnique({
        where: { id: createdOrder.id },
        include: {
          patient: true,
          orderingDoctor: true,
          clinic: true,
          items: {
            include: { test: true },
          },
          samples: true,
        },
      });
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: input.clinicId,
      actorId,
      entityType: 'ORDER',
      entityId: order!.id,
      action: 'CREATED',
      newValues: {
        orderReference: order!.orderReference,
        patientId: order!.patientId,
        totalAmount: order!.totalAmount,
      },
    });

    return order;
  }

  /**
   * List orders with tenant isolation and comprehensive filters
   */
  public async listOrders(organizationId: string, query: QueryLabOrdersInput) {
    const {
      page = 1,
      limit = 20,
      search,
      clinicId,
      patientId,
      orderingDoctorId,
      appointmentId,
      orderStatus,
      date,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(clinicId ? { clinicId } : {}),
      ...(patientId ? { patientId } : {}),
      ...(orderingDoctorId ? { orderingDoctorId } : {}),
      ...(appointmentId ? { appointmentId } : {}),
      ...(orderStatus ? { orderStatus } : {}),
    };

    if (date) {
      const d = new Date(date);
      const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
      const endOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    } else if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { orderReference: { contains: search, mode: 'insensitive' } },
        { patient: { fullName: { contains: search, mode: 'insensitive' } } },
        { patient: { patientNumber: { contains: search, mode: 'insensitive' } } },
        { patient: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.laboratoryOrder.findMany({
        where,
        include: {
          patient: {
            select: { id: true, fullName: true, patientNumber: true, phone: true, gender: true },
          },
          orderingDoctor: {
            select: { id: true, fullName: true, specialty: true },
          },
          clinic: {
            select: { id: true, name: true },
          },
          items: {
            include: {
              result: {
                select: { id: true, resultStatus: true, resultValue: true },
              },
            },
          },
          samples: {
            select: { id: true, sampleReference: true, sampleType: true, sampleStatus: true },
          },
          reports: {
            select: { id: true, reportReference: true, reportStatus: true, version: true },
          },
        },
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        skip,
        take: limit,
      }),
      this.prisma.laboratoryOrder.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single order by ID
   */
  public async getOrderById(organizationId: string, orderId: string) {
    const order = await this.prisma.laboratoryOrder.findFirst({
      where: { id: orderId, organizationId },
      include: {
        patient: true,
        orderingDoctor: true,
        clinic: true,
        appointment: true,
        items: {
          include: {
            test: {
              include: { category: true },
            },
            package: true,
            result: {
              include: {
                enteredBy: {
                  select: { id: true, fullName: true },
                },
                reviews: {
                  include: {
                    reviewer: {
                      select: { id: true, fullName: true },
                    },
                  },
                },
              },
            },
          },
        },
        samples: {
          include: {
            collectedBy: { select: { id: true, fullName: true } },
            receivedBy: { select: { id: true, fullName: true } },
          },
        },
        reports: {
          include: {
            approvedBy: { select: { id: true, fullName: true } },
            releasedBy: { select: { id: true, fullName: true } },
            accessTokens: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Laboratory order not found');
    }

    return order;
  }

  /**
   * Update order details / status
   */
  public async updateOrder(
    organizationId: string,
    orderId: string,
    input: UpdateLabOrderInput,
    actorId: string,
  ) {
    const existing = await this.prisma.laboratoryOrder.findFirst({
      where: { id: orderId, organizationId },
    });
    if (!existing) {
      throw new NotFoundException('Laboratory order not found');
    }

    if (existing.orderStatus === 'CANCELLED') {
      throw new BadRequestException('Cancelled orders cannot be modified');
    }

    const updated = await this.prisma.laboratoryOrder.update({
      where: { id: orderId },
      data: {
        ...(input.orderingDoctorId !== undefined ? { orderingDoctorId: input.orderingDoctorId } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.orderStatus !== undefined ? { orderStatus: input.orderStatus } : {}),
        ...(input.expectedCompletionDate !== undefined
          ? { expectedCompletionDate: input.expectedCompletionDate ? new Date(input.expectedCompletionDate) : null }
          : {}),
      },
      include: {
        patient: true,
        items: true,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: existing.clinicId,
      actorId,
      entityType: 'ORDER',
      entityId: orderId,
      action: input.orderStatus && input.orderStatus !== existing.orderStatus ? 'STATUS_CHANGED' : 'UPDATED',
      previousValues: { status: existing.orderStatus, notes: existing.notes },
      newValues: { status: updated.orderStatus, notes: updated.notes },
    });

    return updated;
  }

  /**
   * Cancel laboratory order with mandatory cancellation reason
   */
  public async cancelOrder(
    organizationId: string,
    orderId: string,
    input: CancelLabOrderInput,
    actorId: string,
  ) {
    const existing = await this.prisma.laboratoryOrder.findFirst({
      where: { id: orderId, organizationId },
      include: { reports: true },
    });
    if (!existing) {
      throw new NotFoundException('Laboratory order not found');
    }

    const releasedReports = existing.reports.filter((r) => r.reportStatus === 'RELEASED');
    if (releasedReports.length > 0) {
      throw new BadRequestException('Cannot cancel order with released diagnostic reports');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Cancel items
      await tx.laboratoryOrderItem.updateMany({
        where: { orderId },
        data: { status: 'CANCELLED' },
      });

      // Update order status
      return tx.laboratoryOrder.update({
        where: { id: orderId },
        data: {
          orderStatus: LabOrderStatus.CANCELLED,
          cancellationReason: input.cancellationReason,
        },
        include: {
          patient: true,
          items: true,
        },
      });
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: existing.clinicId,
      actorId,
      entityType: 'ORDER',
      entityId: orderId,
      action: 'CANCELLED',
      previousValues: { status: existing.orderStatus },
      newValues: { status: 'CANCELLED', cancellationReason: input.cancellationReason },
    });

    return updated;
  }
}
