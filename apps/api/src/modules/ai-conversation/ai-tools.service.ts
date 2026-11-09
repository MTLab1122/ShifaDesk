import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { SlotGenerationService } from '../appointment/slot-generation.service';
import { AppointmentService } from '../appointment/appointment.service';
import { UserRole } from '@matabai/shared';

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slotService: SlotGenerationService,
    private readonly appointmentService: AppointmentService,
  ) {}

  /**
   * Tool 1: get_clinic_information
   */
  async getClinicInformation(conversationId: string, clinicId: string) {
    const start = Date.now();
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          timezone: true,
          status: true,
        },
      });

      if (!clinic) throw new NotFoundException('Clinic not found');

      await this.logToolExecution(conversationId, 'get_clinic_information', 'SUCCESS', Date.now() - start);
      return clinic;
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'get_clinic_information', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 2: search_doctors
   */
  async searchDoctors(conversationId: string, clinicId: string, specialty?: string, doctorName?: string) {
    const start = Date.now();
    try {
      const where: any = {
        clinicId,
        status: 'ACTIVE',
      };

      if (specialty) {
        where.specialty = { contains: specialty, mode: 'insensitive' };
      }
      if (doctorName) {
        where.fullName = { contains: doctorName, mode: 'insensitive' };
      }

      const doctors = await this.prisma.doctor.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          specialty: true,
          qualification: true,
          consultationFee: true,
        },
        take: 10,
      });

      await this.logToolExecution(conversationId, 'search_doctors', 'SUCCESS', Date.now() - start);
      return doctors;
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'search_doctors', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 3: get_doctor_availability
   */
  async getDoctorAvailability(conversationId: string, clinicId: string, doctorId: string, date: string) {
    const start = Date.now();
    try {
      const slots = await this.slotService.generateSlots(clinicId, doctorId, date);
      const available = slots.filter((s) => s.isAvailable);

      await this.logToolExecution(conversationId, 'get_doctor_availability', 'SUCCESS', Date.now() - start);
      return {
        doctorId,
        date,
        totalAvailable: available.length,
        slots: available.slice(0, 10), // Limit output to top 10 choices for conversational clarity
      };
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'get_doctor_availability', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 4: create_appointment
   */
  async createAppointment(
    conversationId: string,
    params: {
      clinicId: string;
      doctorId: string;
      patientId: string;
      date: string;
      startTime: string;
      endTime: string;
      reasonForVisit?: string;
    },
  ) {
    const start = Date.now();
    try {
      // Re-verify availability to prevent race conditions
      const slots = await this.slotService.generateSlots(params.clinicId, params.doctorId, params.date);
      const slotMatches = slots.some((s) => s.startTime === params.startTime && s.isAvailable);
      if (!slotMatches) {
        throw new BadRequestException('Selected time slot is no longer available');
      }

      const clinic = await this.prisma.clinic.findUnique({
        where: { id: params.clinicId },
      });
      if (!clinic) throw new NotFoundException('Clinic not found');

      // System user representation for automated AI booking
      const systemUser: any = {
        id: params.patientId,
        authUserId: 'ai-receptionist-bot',
        role: UserRole.RECEPTIONIST,
        organizationId: clinic.organizationId,
        clinicId: params.clinicId,
      };

      const appointment = await this.appointmentService.create(
        {
          clinicId: params.clinicId,
          doctorId: params.doctorId,
          patientId: params.patientId,
          appointmentDate: params.date,
          startTime: params.startTime,
          endTime: params.endTime,
          bookingSource: 'WHATSAPP',
          reasonForVisit: params.reasonForVisit || 'WhatsApp AI Receptionist booking',
        },
        systemUser,
      );

      await this.logToolExecution(conversationId, 'create_appointment', 'SUCCESS', Date.now() - start);
      return appointment;
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'create_appointment', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 5: get_patient_appointments
   */
  async getPatientAppointments(conversationId: string, patientId: string, clinicId?: string) {
    const start = Date.now();
    try {
      const where: any = {
        patientId,
        status: { in: ['CONFIRMED', 'PENDING'] },
      };
      if (clinicId) where.clinicId = clinicId;

      const appointments = await this.prisma.appointment.findMany({
        where,
        include: {
          doctor: { select: { fullName: true, specialty: true } },
          clinic: { select: { name: true } },
        },
        orderBy: { appointmentDate: 'asc' },
        take: 5,
      });

      await this.logToolExecution(conversationId, 'get_patient_appointments', 'SUCCESS', Date.now() - start);
      return appointments;
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'get_patient_appointments', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 6: reschedule_appointment
   */
  async rescheduleAppointment(
    conversationId: string,
    appointmentId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    reason?: string,
  ) {
    const start = Date.now();
    try {
      const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment) throw new NotFoundException('Appointment not found');

      const systemUser: any = {
        id: appointment.patientId,
        authUserId: 'ai-receptionist-bot',
        role: UserRole.RECEPTIONIST,
        organizationId: appointment.organizationId,
        clinicId: appointment.clinicId,
      };

      const result = await this.appointmentService.reschedule(
        appointmentId,
        {
          appointmentDate: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          reason: reason || 'Patient requested reschedule via WhatsApp AI Receptionist',
        },
        systemUser,
      );

      await this.logToolExecution(conversationId, 'reschedule_appointment', 'SUCCESS', Date.now() - start);
      return result;
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'reschedule_appointment', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 7: cancel_appointment
   */
  async cancelAppointment(conversationId: string, appointmentId: string, reason: string) {
    const start = Date.now();
    try {
      const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment) throw new NotFoundException('Appointment not found');

      const systemUser: any = {
        id: appointment.patientId,
        authUserId: 'ai-receptionist-bot',
        role: UserRole.RECEPTIONIST,
        organizationId: appointment.organizationId,
        clinicId: appointment.clinicId,
      };

      const result = await this.appointmentService.cancel(
        appointmentId,
        { reason },
        systemUser,
      );
      await this.logToolExecution(conversationId, 'cancel_appointment', 'SUCCESS', Date.now() - start);
      return result;
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'cancel_appointment', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 8: get_patient_token
   */
  async getPatientToken(conversationId: string, patientId: string, clinicId?: string) {
    const start = Date.now();
    try {
      const where: any = {
        patientId,
        status: { in: ['WAITING', 'CALLED', 'SERVING'] },
      };
      if (clinicId) where.clinicId = clinicId;

      const token = await this.prisma.queueToken.findFirst({
        where,
        include: {
          queueSession: {
            include: { doctor: { select: { fullName: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      await this.logToolExecution(conversationId, 'get_patient_token', 'SUCCESS', Date.now() - start);
      return token;
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'get_patient_token', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 9: get_queue_status
   */
  async getQueueStatus(conversationId: string, clinicId: string, doctorId?: string) {
    const start = Date.now();
    try {
      const today = new Date().toISOString().split('T')[0];
      const where: any = {
        clinicId,
        sessionDate: today,
        status: 'ACTIVE',
      };
      if (doctorId) where.doctorId = doctorId;

      const session = await this.prisma.clinicQueueSession.findFirst({
        where,
        include: {
          tokens: {
            where: { status: 'WAITING' },
            select: { id: true },
          },
          doctor: { select: { fullName: true } },
        },
      });

      if (!session) {
        await this.logToolExecution(conversationId, 'get_queue_status', 'SUCCESS', Date.now() - start);
        return { activeSession: false, message: 'No active queue session at this time' };
      }

      await this.logToolExecution(conversationId, 'get_queue_status', 'SUCCESS', Date.now() - start);
      return {
        activeSession: true,
        currentServingToken: session.currentTokenNumber ? `A${String(session.currentTokenNumber).padStart(3, '0')}` : 'None',
        waitingCount: session.tokens.length,
        doctorName: session.doctor?.fullName || 'OPD Doctor',
      };
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'get_queue_status', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 10: search_clinic_faq
   */
  async searchClinicFaq(conversationId: string, question: string, clinicId?: string, language: string = 'en') {
    const start = Date.now();
    try {
      const where: any = { isActive: true };
      if (clinicId) where.clinicId = clinicId;

      const faqs = await this.prisma.clinicFaq.findMany({
        where,
        take: 5,
      });

      const qLower = question.toLowerCase();
      const matched = faqs.find(
        (f) =>
          f.questionEn.toLowerCase().includes(qLower) ||
          (f.questionUr && f.questionUr.toLowerCase().includes(qLower)) ||
          (f.questionPs && f.questionPs.toLowerCase().includes(qLower)),
      ) || faqs[0];

      await this.logToolExecution(conversationId, 'search_clinic_faq', 'SUCCESS', Date.now() - start);

      if (!matched) return null;

      // Localized response
      if (language.startsWith('ur') && matched.answerUr) {
        return { question: matched.questionUr, answer: matched.answerUr };
      }
      if (language.startsWith('ps') && matched.answerPs) {
        return { question: matched.questionPs, answer: matched.answerPs };
      }
      return { question: matched.questionEn, answer: matched.answerEn };
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'search_clinic_faq', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  /**
   * Tool 11: request_human_handover
   */
  async requestHumanHandover(conversationId: string, reason: string) {
    const start = Date.now();
    try {
      const updated = await this.prisma.whatsappConversation.update({
        where: { id: conversationId },
        data: {
          status: 'HUMAN_HANDOVER',
          handoverReason: reason,
          handoverAt: new Date(),
        },
      });

      await this.logToolExecution(conversationId, 'request_human_handover', 'SUCCESS', Date.now() - start);
      return { success: true, handoverTriggered: true, conversationId: updated.id, status: updated.status };
    } catch (err: any) {
      await this.logToolExecution(conversationId, 'request_human_handover', 'FAILED', Date.now() - start, err.message);
      throw err;
    }
  }

  private async logToolExecution(
    conversationId: string,
    toolName: string,
    executionStatus: 'SUCCESS' | 'FAILED' | 'REJECTED',
    durationMs: number,
    error?: string,
  ) {
    try {
      const conversation = await this.prisma.whatsappConversation.findUnique({
        where: { id: conversationId },
        select: { organizationId: true, clinicId: true },
      });

      if (!conversation) return;

      await this.prisma.aiToolExecutionLog.create({
        data: {
          organizationId: conversation.organizationId,
          clinicId: conversation.clinicId,
          conversationId,
          toolName,
          executionStatus,
          errorCode: error ? error.slice(0, 100) : null,
          executionDurationMs: durationMs,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record tool execution log: ${err.message}`);
    }
  }
}
