import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/database/prisma.service';
import { PrivateReportStorageService } from '../storage/private-report-storage.service';
import { LaboratoryAuditService } from './laboratory-audit.service';
import { VerifyReportAccessInput } from '@matabai/validation';
import { LabAccessStatus, NotificationEventType, NotificationJobStatus } from '@matabai/shared';

@Injectable()
export class LaboratoryDeliveryService {
  private readonly logger = new Logger(LaboratoryDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: PrivateReportStorageService,
    private readonly auditService: LaboratoryAuditService,
  ) {}

  /**
   * Generate an unguessable high-entropy token, store only its SHA-256 hash, and return plaintext token to caller
   */
  public async createAccessToken(
    organizationId: string,
    reportId: string,
    expiresInHours: number = 168, // Default 7 days
    actorId?: string,
  ): Promise<{ token: string; prefix: string; expiresAt: Date; accessUrl: string }> {
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

    if (report.reportStatus !== 'RELEASED' && report.reportStatus !== 'APPROVED') {
      throw new BadRequestException(
        'Cannot generate delivery token: Report has not been approved or released',
      );
    }

    // High entropy 32-byte hex token (256 bits)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenPrefix = rawToken.substring(0, 8);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    await this.prisma.laboratoryReportAccessToken.create({
      data: {
        organizationId,
        clinicId: report.clinicId,
        reportId: report.id,
        patientId: report.order.patientId,
        tokenHash,
        tokenPrefix,
        expiresAt,
        maxAccessCount: 15,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: report.clinicId,
      actorId: actorId || 'SYSTEM',
      entityType: 'ACCESS_TOKEN',
      entityId: report.id,
      action: 'TOKEN_GENERATED',
      newValues: { tokenPrefix, expiresAt },
    });

    const webBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const accessUrl = `${webBaseUrl}/reports/access/${rawToken}`;

    return {
      token: rawToken,
      prefix: tokenPrefix,
      expiresAt,
      accessUrl,
    };
  }

  /**
   * Patient identity verification & secure report download
   */
  public async verifyPatientIdentityAndGetReport(
    rawToken: string,
    verification: VerifyReportAccessInput,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string; reportReference: string }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const tokenRecord = await this.prisma.laboratoryReportAccessToken.findUnique({
      where: { tokenHash },
      include: {
        report: {
          include: {
            order: {
              include: { patient: true },
            },
          },
        },
        patient: true,
      },
    });

    if (!tokenRecord) {
      this.logger.warn(`Failed report access attempt with unrecognized token hash`);
      throw new NotFoundException('Invalid or expired report access link');
    }

    const { report, patient } = tokenRecord;
    const now = new Date();

    // Check revocation
    if (tokenRecord.revokedAt) {
      await this.logAccess(report.id, patient.id, tokenRecord.id, LabAccessStatus.REVOKED, clientInfo);
      throw new ForbiddenException(
        'This diagnostic report link has been revoked by the clinic. Please contact your clinic for an updated link.',
      );
    }

    // Check expiration
    if (tokenRecord.expiresAt < now) {
      await this.logAccess(report.id, patient.id, tokenRecord.id, LabAccessStatus.EXPIRED, clientInfo);
      throw new ForbiddenException(
        'This diagnostic report link has expired. Please contact your clinic for a renewed link.',
      );
    }

    // Check rate limit / access count
    if (tokenRecord.accessCount >= tokenRecord.maxAccessCount) {
      await this.logAccess(
        report.id,
        patient.id,
        tokenRecord.id,
        LabAccessStatus.ACCESS_LIMIT_EXCEEDED,
        clientInfo,
      );
      throw new ForbiddenException(
        'The maximum number of downloads for this secure link has been reached. Please request a new link from the clinic.',
      );
    }

    // Identity verification step:
    // Verify phone number (last 7 digits matching or normalized matching) OR Year of birth
    let verified = false;

    if (verification.phoneNumber && patient.phone) {
      const cleanInput = verification.phoneNumber.replace(/\D/g, '');
      const cleanPatient = patient.phone.replace(/\D/g, '');
      const inputCore = cleanInput.length >= 7 ? cleanInput.slice(-9) : cleanInput;
      const patientCore = cleanPatient.length >= 7 ? cleanPatient.slice(-9) : cleanPatient;
      if (
        inputCore &&
        patientCore &&
        (inputCore === patientCore ||
          cleanPatient.endsWith(inputCore) ||
          cleanInput.endsWith(patientCore))
      ) {
        verified = true;
      }
    }

    if (!verified && verification.yearOfBirth && patient.dateOfBirth) {
      const birthYear = new Date(patient.dateOfBirth).getUTCFullYear();
      if (birthYear === Number(verification.yearOfBirth)) {
        verified = true;
      }
    }

    if (!verified) {
      // Increment attempt count on token
      await this.prisma.laboratoryReportAccessToken.update({
        where: { id: tokenRecord.id },
        data: { accessCount: { increment: 1 } },
      });

      await this.logAccess(
        report.id,
        patient.id,
        tokenRecord.id,
        LabAccessStatus.INVALID_VERIFICATION,
        clientInfo,
        { inputPhone: verification.phoneNumber ? '***' : null, inputYear: verification.yearOfBirth },
      );

      throw new UnauthorizedException(
        'Verification failed: The provided contact or identity information does not match clinic records for this report.',
      );
    }

    // Verification passed: Increment access count & log success
    await this.prisma.laboratoryReportAccessToken.update({
      where: { id: tokenRecord.id },
      data: { accessCount: { increment: 1 } },
    });

    await this.logAccess(report.id, patient.id, tokenRecord.id, LabAccessStatus.SUCCESS, clientInfo);

    // Read and decrypt PDF payload
    const fileData = await this.storageService.readReportFile(
      tokenRecord.organizationId,
      report.storagePath,
    );

    return {
      buffer: fileData.buffer,
      fileName: `${report.reportReference}.pdf`,
      mimeType: 'application/pdf',
      reportReference: report.reportReference,
    };
  }

  /**
   * One-click revocation of all access tokens for a report
   */
  public async revokeAccessTokens(
    organizationId: string,
    reportId: string,
    reason: string,
    actorId: string,
  ) {
    const report = await this.prisma.laboratoryReport.findFirst({
      where: { id: reportId, organizationId },
    });
    if (!report) {
      throw new NotFoundException('Diagnostic report not found');
    }

    const now = new Date();
    await this.prisma.laboratoryReportAccessToken.updateMany({
      where: {
        reportId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await this.auditService.recordAuditLog({
      organizationId,
      clinicId: report.clinicId,
      actorId,
      entityType: 'ACCESS_TOKEN',
      entityId: reportId,
      action: 'REVOKED',
      newValues: { reason, revokedAt: now },
    });

    return { message: 'All active delivery access links for this report have been revoked' };
  }

  /**
   * Dispatch delivery notification via Phase 6 WhatsApp & Phase 8 Notification engine
   */
  public async dispatchReportReadyNotification(
    organizationId: string,
    reportId: string,
    actorId: string,
  ): Promise<void> {
    const report = await this.prisma.laboratoryReport.findFirst({
      where: { id: reportId, organizationId },
      include: {
        order: {
          include: {
            patient: true,
            clinic: true,
          },
        },
      },
    });

    if (!report || !report.order.patient) {
      return;
    }

    const patient = report.order.patient;
    const clinic = report.order.clinic;

    // Generate fresh access token
    const { accessUrl, expiresAt } = await this.createAccessToken(
      organizationId,
      reportId,
      168,
      actorId,
    );

    // Schedule notification job via NotificationSchedulerService or direct NotificationJob
    try {
      const idempotencyKey = `lab-report-${report.id}-notif`;

      await this.prisma.notificationJob.upsert({
        where: { idempotencyKey },
        create: {
          organizationId,
          clinicId: clinic.id,
          recipientId: patient.id,
          recipientType: 'PATIENT',
          eventType: NotificationEventType.LAB_REPORT_READY,
          channel: 'WHATSAPP',
          relatedEntityType: 'LAB_REPORT',
          relatedEntityId: report.id,
          scheduledAt: new Date(),
          status: NotificationJobStatus.PENDING,
          idempotencyKey,
          payload: {
            patient_name: patient.fullName,
            clinic_name: clinic.name,
            order_reference: report.order.orderReference,
            report_reference: report.reportReference,
            report_access_url: accessUrl,
            expires_at: expiresAt.toISOString(),
          },
          attempts: 0,
          maxAttempts: 3,
        },
        update: {
          scheduledAt: new Date(),
          status: NotificationJobStatus.PENDING,
          payload: {
            patient_name: patient.fullName,
            clinic_name: clinic.name,
            order_reference: report.order.orderReference,
            report_reference: report.reportReference,
            report_access_url: accessUrl,
            expires_at: expiresAt.toISOString(),
          },
        },
      });

      this.logger.log(
        `Enqueued LAB_REPORT_READY notification for patient ${patient.fullName} (${report.reportReference})`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to enqueue report ready notification: ${err.message}`);
    }
  }

  private async logAccess(
    reportId: string,
    patientId: string | null,
    tokenId: string | null,
    accessStatus: LabAccessStatus | string,
    clientInfo?: { ipAddress?: string; userAgent?: string },
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.laboratoryReportAccessLog.create({
        data: {
          reportId,
          patientId,
          tokenId,
          accessStatus,
          ipAddress: clientInfo?.ipAddress || null,
          userAgent: clientInfo?.userAgent || null,
          metadata: (metadata as any) ?? {},
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record access log: ${err.message}`);
    }
  }
}
