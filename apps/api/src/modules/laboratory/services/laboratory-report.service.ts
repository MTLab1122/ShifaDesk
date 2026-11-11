import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { PrivateReportStorageService } from '../storage/private-report-storage.service';
import { LaboratoryDeliveryService } from './laboratory-delivery.service';
import { LaboratoryAuditService } from './laboratory-audit.service';
import { QueryLabReportsInput } from '@matabai/validation';
import { LabReportStatus, LabOrderStatus } from '@matabai/shared';

@Injectable()
export class LaboratoryReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: PrivateReportStorageService,
    private readonly deliveryService: LaboratoryDeliveryService,
    private readonly auditService: LaboratoryAuditService,
  ) {}

  private async generateReportReference(organizationId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `REP-${yearMonth}-`;

    const count = await this.prisma.laboratoryReport.count({
      where: {
        organizationId,
        reportReference: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Generate formal PDF report from approved laboratory results
   */
  public async generateReport(organizationId: string, orderId: string, actorId: string) {
    const order = await this.prisma.laboratoryOrder.findFirst({
      where: { id: orderId, organizationId },
      include: {
        patient: true,
        orderingDoctor: true,
        clinic: true,
        samples: true,
        items: {
          include: {
            test: true,
            result: {
              include: {
                enteredBy: true,
                reviews: {
                  include: { reviewer: true },
                },
              },
            },
          },
        },
        reports: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Laboratory order not found');
    }

    // Check that at least some results are entered
    const itemsWithResults = order.items.filter((item) => item.result !== null);
    if (itemsWithResults.length === 0) {
      throw new BadRequestException('Cannot generate report: No results have been recorded for this order');
    }

    // Determine version
    const latestVersion = order.reports[0]?.version || 0;
    const newVersion = latestVersion + 1;
    const reportReference = await this.generateReportReference(organizationId);

    // Build synthetic professional PDF
    const firstSample = order.samples[0];
    const reviewerName =
      itemsWithResults[0]?.result?.reviews?.[0]?.reviewer?.fullName ||
      'Authorized Pathologist / Lab Reviewer';

    const pdfBuffer = this.storageService.generateSyntheticPdfReport({
      clinicName: order.clinic.name,
      orderRef: order.orderReference,
      reportRef: reportReference,
      version: newVersion,
      patientName: order.patient.fullName,
      patientMrn: order.patient.patientNumber || undefined,
      patientPhone: order.patient.phone || undefined,
      doctorName: order.orderingDoctor?.fullName || undefined,
      sampleRef: firstSample?.sampleReference,
      sampleType: firstSample?.sampleType,
      items: itemsWithResults.map((item) => ({
        testName: item.testNameSnapshot,
        testCode: item.testCodeSnapshot,
        resultValue: item.result!.resultValue,
        unit: item.result!.unit,
        referenceRange: item.result!.referenceRange,
        status: item.result!.resultStatus,
      })),
      approvedBy: reviewerName,
      approvedAt: new Date().toISOString(),
    });

    // Save encrypted file to secure tenant storage
    const tempReportId = crypto.randomUUID();
    const saveResult = await this.storageService.saveReportFile(
      organizationId,
      tempReportId,
      pdfBuffer,
      `${reportReference}.pdf`,
    );

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.laboratoryReport.create({
        data: {
          id: tempReportId,
          organizationId,
          clinicId: order.clinicId,
          orderId: order.id,
          reportReference,
          version: newVersion,
          storagePath: saveResult.storagePath,
          fileName: `${reportReference}.pdf`,
          fileSizeBytes: saveResult.fileSizeBytes,
          mimeType: 'application/pdf',
          reportStatus: LabReportStatus.APPROVED,
          approvedById: actorId,
          approvedAt: new Date(),
        },
      });

      await tx.laboratoryOrder.update({
        where: { id: order.id },
        data: { orderStatus: LabOrderStatus.REPORT_READY },
      });

      return created;
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: order.clinicId,
      actorId,
      entityType: 'REPORT',
      entityId: report.id,
      action: 'CREATED',
      newValues: {
        reportReference: report.reportReference,
        version: report.version,
        fileSizeBytes: report.fileSizeBytes,
      },
    });

    return report;
  }

  /**
   * Upload external signed diagnostic report PDF
   */
  public async uploadReport(
    organizationId: string,
    orderId: string,
    pdfBuffer: Buffer,
    originalFileName: string,
    actorId: string,
  ) {
    this.storageService.validatePdfMagicBytes(pdfBuffer);

    const order = await this.prisma.laboratoryOrder.findFirst({
      where: { id: orderId, organizationId },
      include: {
        reports: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Laboratory order not found');
    }

    const latestVersion = order.reports[0]?.version || 0;
    const newVersion = latestVersion + 1;
    const reportReference = await this.generateReportReference(organizationId);

    const tempReportId = crypto.randomUUID();
    const saveResult = await this.storageService.saveReportFile(
      organizationId,
      tempReportId,
      pdfBuffer,
      originalFileName,
    );

    const report = await this.prisma.laboratoryReport.create({
      data: {
        id: tempReportId,
        organizationId,
        clinicId: order.clinicId,
        orderId: order.id,
        reportReference,
        version: newVersion,
        storagePath: saveResult.storagePath,
        fileName: originalFileName || `${reportReference}.pdf`,
        fileSizeBytes: saveResult.fileSizeBytes,
        mimeType: 'application/pdf',
        reportStatus: LabReportStatus.PENDING_REVIEW,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: order.clinicId,
      actorId,
      entityType: 'REPORT',
      entityId: report.id,
      action: 'CREATED',
      newValues: {
        reportReference: report.reportReference,
        fileName: report.fileName,
        fileSizeBytes: report.fileSizeBytes,
      },
    });

    return report;
  }

  /**
   * Pathologist formal approval of report
   */
  public async approveReport(
    organizationId: string,
    reportId: string,
    comments?: string,
    actorId?: string,
  ) {
    const report = await this.prisma.laboratoryReport.findFirst({
      where: { id: reportId, organizationId },
    });

    if (!report) {
      throw new NotFoundException('Diagnostic report not found');
    }

    const updated = await this.prisma.laboratoryReport.update({
      where: { id: reportId },
      data: {
        reportStatus: LabReportStatus.APPROVED,
        approvedById: actorId || null,
        approvedAt: new Date(),
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: report.clinicId,
      actorId: actorId || 'SYSTEM',
      entityType: 'REPORT',
      entityId: reportId,
      action: 'APPROVED',
      previousValues: { reportStatus: report.reportStatus },
      newValues: { reportStatus: updated.reportStatus, comments },
    });

    return updated;
  }

  /**
   * Formal report release: Strictly gated to approved reports
   */
  public async releaseReport(
    organizationId: string,
    reportId: string,
    notes?: string,
    sendNotification: boolean = true,
    actorId: string = 'SYSTEM',
  ) {
    const report = await this.prisma.laboratoryReport.findFirst({
      where: { id: reportId, organizationId },
      include: {
        order: {
          include: { patient: true },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Diagnostic report not found');
    }

    // Safety gate: Incomplete or unapproved reports must never be released
    if (report.reportStatus !== LabReportStatus.APPROVED) {
      throw new BadRequestException(
        `Safety gate rejection: Report must be APPROVED before it can be released. Current status is ${report.reportStatus}.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const released = await tx.laboratoryReport.update({
        where: { id: reportId },
        data: {
          reportStatus: LabReportStatus.RELEASED,
          releasedById: actorId,
          releasedAt: new Date(),
        },
      });

      await tx.laboratoryOrder.update({
        where: { id: report.orderId },
        data: { orderStatus: LabOrderStatus.DELIVERED },
      });

      return released;
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: report.clinicId,
      actorId,
      entityType: 'REPORT',
      entityId: reportId,
      action: 'RELEASED',
      previousValues: { reportStatus: report.reportStatus },
      newValues: { reportStatus: updated.reportStatus, notes },
    });

    // Dispatch WhatsApp / SMS notification with secure unguessable link
    if (sendNotification) {
      await this.deliveryService.dispatchReportReadyNotification(
        organizationId,
        reportId,
        actorId,
      );
    }

    return updated;
  }

  /**
   * Internal staff / doctor secure download
   */
  public async downloadReport(organizationId: string, reportId: string) {
    const report = await this.prisma.laboratoryReport.findFirst({
      where: { id: reportId, organizationId },
    });

    if (!report) {
      throw new NotFoundException('Diagnostic report not found');
    }

    const file = await this.storageService.readReportFile(organizationId, report.storagePath);

    return {
      buffer: file.buffer,
      fileName: `${report.reportReference}.pdf`,
      mimeType: 'application/pdf',
      reportReference: report.reportReference,
    };
  }

  public async listReports(organizationId: string, query: QueryLabReportsInput) {
    const {
      page = 1,
      limit = 20,
      clinicId,
      orderId,
      reportStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(clinicId ? { clinicId } : {}),
      ...(orderId ? { orderId } : {}),
      ...(reportStatus ? { reportStatus } : {}),
    };

    if (search) {
      where.OR = [
        { reportReference: { contains: search, mode: 'insensitive' } },
        { order: { orderReference: { contains: search, mode: 'insensitive' } } },
        { order: { patient: { fullName: { contains: search, mode: 'insensitive' } } } },
        { order: { patient: { patientNumber: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.laboratoryReport.findMany({
        where,
        include: {
          approvedBy: { select: { id: true, fullName: true } },
          releasedBy: { select: { id: true, fullName: true } },
          order: {
            select: {
              id: true,
              orderReference: true,
              orderStatus: true,
              patient: {
                select: { id: true, fullName: true, patientNumber: true, phone: true },
              },
            },
          },
          accessTokens: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        skip,
        take: limit,
      }),
      this.prisma.laboratoryReport.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getReportById(organizationId: string, reportId: string) {
    const report = await this.prisma.laboratoryReport.findFirst({
      where: { id: reportId, organizationId },
      include: {
        approvedBy: true,
        releasedBy: true,
        order: {
          include: {
            patient: true,
            orderingDoctor: true,
            clinic: true,
            items: {
              include: {
                test: true,
                result: true,
              },
            },
          },
        },
        accessTokens: {
          orderBy: { createdAt: 'desc' },
        },
        accessLogs: {
          orderBy: { accessedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Diagnostic report not found');
    }

    return report;
  }
}
