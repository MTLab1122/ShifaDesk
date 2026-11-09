import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { WhatsAppOutboundService } from './whatsapp-outbound.service';

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboundService: WhatsAppOutboundService,
  ) {}

  /**
   * Dispatch Appointment Confirmation via WhatsApp Template
   */
  async notifyAppointmentConfirmed(appointmentId: string): Promise<boolean> {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          clinic: true,
          doctor: true,
          patient: true,
        },
      });

      if (!appointment || !appointment.patient.phone) {
        return false;
      }

      await this.outboundService.sendTemplateMessage({
        clinicId: appointment.clinicId,
        to: appointment.patient.phone,
        templateName: 'appointment_confirmation',
        languageCode: 'en_US',
        parameters: [
          appointment.patient.fullName,
          appointment.doctor.fullName,
          appointment.appointmentDate,
          appointment.startTime,
          'A001',
        ],
      });

      this.logger.log(`Appointment confirmation sent to ${appointment.patient.phone}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`WhatsApp appointment confirmation skipped or failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Dispatch Queue Token Called notification when doctor summons patient
   */
  async notifyQueueTokenCalled(tokenId: string, roomNumber: string = '1'): Promise<boolean> {
    try {
      const token = await this.prisma.queueToken.findUnique({
        where: { id: tokenId },
        include: {
          clinic: true,
          patient: true,
          queueSession: {
            include: { doctor: true },
          },
        },
      });

      if (!token || !token.patient.phone) {
        return false;
      }

      const doctorName = token.queueSession.doctor?.fullName || 'the Doctor';

      await this.outboundService.sendTemplateMessage({
        clinicId: token.clinicId,
        to: token.patient.phone,
        templateName: 'queue_token_called',
        languageCode: 'en_US',
        parameters: [token.tokenDisplay, roomNumber, doctorName],
      });

      this.logger.log(`Queue token call notification sent for token ${token.tokenDisplay}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`WhatsApp queue call notification skipped or failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Dispatch Delay Notice to all waiting patients in a queue session
   */
  async notifyQueueDelay(sessionId: string, delayMinutes: number): Promise<number> {
    try {
      const session = await this.prisma.clinicQueueSession.findUnique({
        where: { id: sessionId },
        include: {
          doctor: true,
          tokens: {
            where: { status: 'WAITING' },
            include: { patient: true },
          },
        },
      });

      if (!session || session.tokens.length === 0) {
        return 0;
      }

      const doctorName = session.doctor?.fullName || 'the Doctor';
      let successCount = 0;

      for (const token of session.tokens) {
        if (!token.patient.phone) continue;
        try {
          await this.outboundService.sendTemplateMessage({
            clinicId: session.clinicId,
            to: token.patient.phone,
            templateName: 'queue_delay_notice',
            languageCode: 'en_US',
            parameters: [
              doctorName,
              String(delayMinutes),
              String(token.estimatedWaitMinutes || delayMinutes),
            ],
          });
          successCount++;
        } catch (subErr: any) {
          this.logger.debug(`Failed to send delay notice to token ${token.tokenDisplay}: ${subErr.message}`);
        }
      }

      this.logger.log(`WhatsApp delay notice sent to ${successCount} waiting patients`);
      return successCount;
    } catch (err: any) {
      this.logger.warn(`WhatsApp delay notice broadcast failed: ${err.message}`);
      return 0;
    }
  }
}
