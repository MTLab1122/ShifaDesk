import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { VoiceCallSessionService } from './voice-call-session.service';
import { VoiceHandoverService } from './voice-handover.service';
import { MultilingualNluService } from '../ai-conversation/multilingual-nlu.service';
import { AiToolsService } from '../ai-conversation/ai-tools.service';
import { NotificationSchedulerService } from '../notification/notification-scheduler.service';
import {
  CallStatus,
  CallDirection,
  VoiceSpeakerType,
  NotificationEventType,
  AiIntent,
} from '@matabai/shared';
import * as crypto from 'crypto';

@Injectable()
export class VoiceSimulatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: VoiceCallSessionService,
    private readonly handoverService: VoiceHandoverService,
    private readonly nluService: MultilingualNluService,
    private readonly aiToolsService: AiToolsService,
    private readonly notificationScheduler: NotificationSchedulerService
  ) {}

  /**
   * Simulates a voice conversational turn for interactive testing in the dashboard
   */
  async simulateTurn(params: {
    clinicId: string;
    callerPhone?: string;
    message: string;
    language?: 'ur' | 'ps' | 'en';
    sessionId?: string;
    dtmfDigit?: string;
    organizationId?: string;
  }) {
    const callerPhone = params.callerPhone || '+923001234567';
    let language = params.language || 'ur';
    let session: any;

    // 1. Resolve or create simulated session
    if (params.sessionId) {
      session = await this.sessionService.getSession(params.sessionId);
      if (session.selectedLanguage) {
        language = session.selectedLanguage as any;
      }
    } else {
      const simCallSid = `sim_${crypto.randomUUID()}`;
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: params.clinicId },
      });

      session = await this.sessionService.findOrCreateSession({
        providerCallId: simCallSid,
        callerPhone,
        calledPhone: clinic?.phone || '+92511234567',
        clinicId: params.clinicId,
        organizationId: clinic?.organizationId,
        direction: CallDirection.INBOUND,
      });

      await this.sessionService.setLanguage(session.id, language);
    }

    // Handle DTMF language selection if supplied
    if (params.dtmfDigit) {
      if (params.dtmfDigit === '1') language = 'ur';
      if (params.dtmfDigit === '2') language = 'ps';
      if (params.dtmfDigit === '3') language = 'en';
      await this.sessionService.setLanguage(session.id, language);
    }

    const callerInput = params.message.trim();

    // 2. Add caller message to transcript
    await this.sessionService.addMessage(
      session.id,
      VoiceSpeakerType.CALLER,
      callerInput,
      language
    );

    // 3. Direct keypad 0 or handover check
    if (params.dtmfDigit === '0') {
      await this.handoverService.initiateHandover({
        callSessionId: session.id,
        reason: 'Caller pressed 0 for receptionist (Simulated)',
      });

      const handoverReply =
        language === 'ur'
          ? 'آپ کی کال استقبالیہ سے ملائی جا رہی ہے۔ برائے مہربانی انتظار فرمائیں۔'
          : language === 'ps'
          ? 'ستاسو اړیکه استوګنځي سره نښلول کیږي. مهرباني وکړئ انتظار وکړئ.'
          : 'Transferring your call to our receptionist. Please hold.';

      await this.sessionService.addMessage(
        session.id,
        VoiceSpeakerType.ASSISTANT,
        handoverReply,
        language
      );

      const updated = await this.sessionService.getSession(session.id);
      return {
        sessionId: session.id,
        message: handoverReply,
        language,
        intent: 'human_handover',
        actionTaken: 'HANDOVER_INITIATED',
        transcript: updated.messages,
      };
    }

    // 4. Intent Classification via MultilingualNluService
    const nluResult = this.nluService.analyzeInput(callerInput);
    const intent = nluResult.intent;

    // Safety 1: Emergency & Urgent Care
    if (intent === AiIntent.EMERGENCY_OR_URGENT_CONCERN) {
      const emergencyReply =
        language === 'ur'
          ? 'اگر یہ کوئی ہنگامی صورتحال ہے تو برائے مہربانی فوری طور پر ریسکیو 1122 پر کال کریں یا قریبی ہسپتال کے ایمرجنسی وارڈ تشریف لے جائیں۔'
          : language === 'ps'
          ? 'که دا بیړنی حالت وي، مهرباني وکړئ سمدستي 1122 ته زنګ ووهئ یا نږدې روغتون ته لاړ شئ.'
          : 'If this is a medical emergency, please immediately call Rescue 1122 or proceed to the nearest hospital emergency room.';

      await this.sessionService.addMessage(
        session.id,
        VoiceSpeakerType.ASSISTANT,
        emergencyReply,
        language
      );

      await this.sessionService.endSession(session.id, CallStatus.COMPLETED);

      const updated = await this.sessionService.getSession(session.id);
      return {
        sessionId: session.id,
        message: emergencyReply,
        language,
        intent: 'emergency_escalation',
        actionTaken: 'RESCUE_1122_ESCALATION',
        transcript: updated.messages,
      };
    }

    // Safety 2: Medical Advice Refusal
    if (intent === AiIntent.MEDICAL_REQUEST) {
      const refusalReply =
        language === 'ur'
          ? 'بحیثیت انتظامی اسسٹنٹ، میں کوئی طبی مشورہ، نسخہ، یا علاج تجویز نہیں کر سکتا۔ کیا آپ ڈاکٹر کے ساتھ اپائنٹمنٹ بک کرنا چاہتے ہیں؟'
          : language === 'ps'
          ? 'زه یوازې یو اداري مرستیال یم او هیڅ طبي مشوره، درمل یا نسخه نه شم درکولای. ایا غواړئ د ډاکټر سره ملاقات تنظیم کړئ؟'
          : 'As an administrative assistant, I cannot provide medical advice, prescriptions, or diagnosis. Would you like to schedule an appointment with a doctor?';

      await this.sessionService.addMessage(
        session.id,
        VoiceSpeakerType.ASSISTANT,
        refusalReply,
        language
      );

      const updated = await this.sessionService.getSession(session.id);
      return {
        sessionId: session.id,
        message: refusalReply,
        language,
        intent: 'medical_advice_refusal',
        actionTaken: 'ADVICE_REFUSED',
        transcript: updated.messages,
      };
    }

    // Safety 3: Human Handover Request
    if (intent === AiIntent.HUMAN_HANDOVER) {
      await this.handoverService.initiateHandover({
        callSessionId: session.id,
        reason: 'Caller requested human receptionist (Simulated)',
      });

      const handoverReply =
        language === 'ur'
          ? 'آپ کی کال استقبالیہ سے ملائی جا رہی ہے۔ برائے مہربانی ہولڈ فرمائیں۔'
          : language === 'ps'
          ? 'ستاسو اړیکه استوګنځي سره نښلول کیږي. مهرباني وکړئ انتظار وکړئ.'
          : 'Transferring your call to our receptionist. Please hold.';

      await this.sessionService.addMessage(
        session.id,
        VoiceSpeakerType.ASSISTANT,
        handoverReply,
        language
      );

      const updated = await this.sessionService.getSession(session.id);
      return {
        sessionId: session.id,
        message: handoverReply,
        language,
        intent: 'human_handover',
        actionTaken: 'HANDOVER_INITIATED',
        transcript: updated.messages,
      };
    }

    // 5. Server Tools Execution
    let assistantReply = '';
    let actionTaken = 'NONE';

    switch (intent) {
      case AiIntent.CLINIC_INFORMATION:
      case AiIntent.LOCATION_INFORMATION:
      case AiIntent.CONTACT_INFORMATION:
      case AiIntent.WORKING_HOURS:
      case AiIntent.FAQ: {
        const info = await this.aiToolsService.getClinicInformation(session.id, session.clinicId);
        assistantReply =
          language === 'ur'
            ? `${info.name || 'مطب اے آئی کلینک'} میں خوش آمدید۔ پتہ: ${info.address || 'مرکزی برانچ'}۔ اوقات کار پیر تا ہفتہ صبح 9 تا شام 8 بجے ہیں۔`
            : `Welcome to ${info.name || 'MatabAI Clinic'}. Hours: Mon-Sat 9 AM to 8 PM. Located at ${info.address || 'Main Branch'}.`;
        actionTaken = 'CLINIC_INFO_RETRIEVED';
        break;
      }

      case AiIntent.DOCTOR_LOOKUP:
      case AiIntent.SPECIALTY_LOOKUP:
      case AiIntent.APPOINTMENT_AVAILABILITY: {
        const docs = await this.aiToolsService.searchDoctors(
          session.id,
          session.clinicId,
          nluResult.entities?.specialty,
          nluResult.entities?.doctorName
        );
        if (docs && docs.length > 0 && docs[0]) {
          const doc = docs[0];
          assistantReply =
            language === 'ur'
              ? `ڈاکٹر ${doc.fullName} (${doc.specialty}) دستیاب ہیں۔ فیس ${doc.consultationFee} روپے ہے۔ کیا آپ ان کے ساتھ اپائنٹمنٹ بک کرنا چاہتے ہیں؟`
              : `Dr. ${doc.fullName} (${doc.specialty}) is available. Fee is PKR ${doc.consultationFee}. Would you like to book an appointment?`;
        } else {
          assistantReply =
            language === 'ur'
              ? 'ہمارے پاس جنرل فزیشن اور ماہر امراض اطفال دستیاب ہیں۔'
              : 'General Physicians and Pediatricians are available.';
        }
        actionTaken = 'DOCTORS_SEARCHED';
        break;
      }

      case AiIntent.QUEUE_STATUS:
      case AiIntent.TOKEN_LOOKUP: {
        const queue = await this.aiToolsService.getQueueStatus(session.id, session.clinicId);
        assistantReply =
          language === 'ur'
            ? `او پی ڈی میں موجودہ ٹوکن نمبر ${queue.currentServingToken || 'A001'} چل رہا ہے۔ قطار میں ${queue.waitingCount || 0} مریض منتظر ہیں۔`
            : `Current serving token is number ${queue.currentServingToken || 'A001'} with ${queue.waitingCount || 0} patients waiting in the queue.`;
        actionTaken = 'QUEUE_STATUS_RETRIEVED';
        break;
      }

      case AiIntent.APPOINTMENT_BOOKING:
      case AiIntent.APPOINTMENT_CONFIRMATION: {
        const docs = await this.aiToolsService.searchDoctors(session.id, session.clinicId);
        const doc = docs?.[0];
        if (doc && session.patientId) {
          const todayStr = new Date().toISOString().split('T')[0] || '';
          const booking = await this.aiToolsService.createAppointment(session.id, {
            clinicId: session.clinicId,
            doctorId: doc.id,
            patientId: session.patientId,
            date: todayStr,
            startTime: '16:00',
            endTime: '16:15',
            reasonForVisit: 'Voice simulator booking',
          });

          if (booking && booking.id) {
            try {
              await this.notificationScheduler.scheduleAppointmentNotifications(
                booking.id,
                NotificationEventType.APPOINTMENT_BOOKED
              );
            } catch {}

            assistantReply =
              language === 'ur'
                ? `آپ کی اپائنٹمنٹ ڈاکٹر ${doc.fullName} کے ساتھ کامیابی سے بک ہو گئی ہے۔ تصدیقی میسج ارسال کر دیا گیا ہے۔`
                : `Your appointment with Dr. ${doc.fullName} has been successfully booked. Confirmation sent.`;
            actionTaken = 'APPOINTMENT_BOOKED';
          }
        } else {
          assistantReply =
            language === 'ur'
              ? 'ڈاکٹر کے ساتھ اپائنٹمنٹ بک کرنے کے لیے برائے مہربانی اپنا نام یا مطلوبہ شعبہ بتائیں۔'
              : 'Please specify your preferred doctor or specialty to book an appointment.';
        }
        break;
      }

      default: {
        assistantReply =
          language === 'ur'
            ? 'آپ کا شکریہ۔ آپ ڈاکٹر کی تفصیلات، اپائنٹمنٹ، یا ٹوکن کی معلومات دریافت کر سکتے ہیں۔'
            : 'Thank you. You can ask for doctor details, appointments, or token status.';
      }
    }

    // 6. Add assistant reply to transcript
    await this.sessionService.addMessage(
      session.id,
      VoiceSpeakerType.ASSISTANT,
      assistantReply,
      language
    );

    const updatedSession = await this.sessionService.getSession(session.id);

    return {
      sessionId: session.id,
      message: assistantReply,
      language,
      intent,
      actionTaken,
      transcript: updatedSession.messages,
    };
  }
}
