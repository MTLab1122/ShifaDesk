import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoiceCallSessionService } from './voice-call-session.service';
import { VoiceHandoverService } from './voice-handover.service';
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';
import { MultilingualNluService } from '../ai-conversation/multilingual-nlu.service';
import { AiToolsService } from '../ai-conversation/ai-tools.service';
import { NotificationSchedulerService } from '../notification/notification-scheduler.service';
import {
  TelephonyEventType,
  VoiceSpeakerType,
  NotificationEventType,
  AiIntent,
} from '@matabai/shared';

@Injectable()
export class VoiceAiReceptionistService {
  private readonly logger = new Logger(VoiceAiReceptionistService.name);

  constructor(
    private readonly sessionService: VoiceCallSessionService,
    private readonly handoverService: VoiceHandoverService,
    private readonly twilioAdapter: TwilioVoiceAdapter,
    private readonly nluService: MultilingualNluService,
    private readonly aiToolsService: AiToolsService,
    private readonly notificationScheduler: NotificationSchedulerService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Main speech dialogue processing turn for incoming voice audio transcripts
   */
  async processVoiceDialogue(params: {
    CallSid: string;
    SpeechResult?: string;
    Digits?: string;
    retry?: boolean;
  }): Promise<string> {
    const session = await this.sessionService.getSession(params.CallSid);
    const language = (session.selectedLanguage as 'ur' | 'ps' | 'en') || 'ur';
    const callerSpeech = (params.SpeechResult || params.Digits || '').trim();

    const baseUrl =
      this.configService.get<string>('VOICE_WEBHOOK_BASE_URL') ||
      'http://localhost:4000/api/v1';
    const gatherActionUrl = `${baseUrl}/webhooks/voice/gather?step=dialogue&callSid=${params.CallSid}`;

    // Handle silence / uncaptured speech
    if (!callerSpeech) {
      const silencePrompt =
        language === 'ur'
          ? 'ہمیں آپ کی آواز موصول نہیں ہوئی۔ برائے مہربانی دوبارہ فرمائیں، یا استقبالیہ سے بات کرنے کے لیے 0 دبائیں۔'
          : language === 'ps'
          ? 'موږ ستاسو غږ ونه اورېد. مهرباني وکړئ بیا ووایاست، یا د استوګنځي لپاره 0 ووهئ.'
          : 'We did not hear any speech. Please speak again, or press 0 to speak with the receptionist.';

      await this.sessionService.recordEvent(
        session.id,
        TelephonyEventType.SPEECH_RECOGNIZED,
        { captured: false }
      );

      return this.twilioAdapter.generateSpeechGather({
        promptText: silencePrompt,
        language,
        actionUrl: gatherActionUrl,
      });
    }

    // 1. Log caller speech message
    await this.sessionService.addMessage(
      session.id,
      VoiceSpeakerType.CALLER,
      callerSpeech,
      language
    );

    await this.sessionService.recordEvent(
      session.id,
      TelephonyEventType.SPEECH_RECOGNIZED,
      { text: callerSpeech, language }
    );

    // 2. Direct keypad zero -> Transfer
    if (params.Digits === '0') {
      return this.handoverService.initiateHandover({
        callSessionId: session.id,
        reason: 'Caller pressed 0 for receptionist',
      });
    }

    // 3. NLU Intent Classification
    const nluResult = this.nluService.analyzeInput(callerSpeech);
    const intent = nluResult.intent;

    // Safety 1: Emergency & Urgent Care
    if (intent === AiIntent.EMERGENCY_OR_URGENT_CONCERN) {
      const emergencyResponse =
        language === 'ur'
          ? 'اگر یہ کوئی ہنگامی صورتحال ہے تو برائے مہربانی فوری طور پر ریسکیو 1122 پر کال کریں یا قریبی ہسپتال کے ایمرجنسی وارڈ تشریف لے جائیں۔'
          : language === 'ps'
          ? 'که دا بیړنی حالت وي، مهرباني وکړئ سمدستي 1122 ته زنګ ووهئ یا نږدې روغتون ته لاړ شئ.'
          : 'If this is a medical emergency, please immediately call Rescue 1122 or proceed to the nearest hospital emergency room.';

      await this.sessionService.addMessage(
        session.id,
        VoiceSpeakerType.ASSISTANT,
        emergencyResponse,
        language
      );

      return this.twilioAdapter.generateSayAndHangup({
        text: emergencyResponse,
        language,
      });
    }

    // Safety 2: Medical Advice Refusal
    if (intent === AiIntent.MEDICAL_REQUEST) {
      const refusalResponse =
        language === 'ur'
          ? 'بحیثیت انتظامی اسسٹنٹ، میں کوئی طبی مشورہ، نسخہ، یا علاج تجویز نہیں کر سکتا۔ کیا آپ ڈاکٹر کے ساتھ اپائنٹمنٹ بک کرنا چاہتے ہیں؟'
          : language === 'ps'
          ? 'زه یوازې یو اداري مرستیال یم او هیڅ طبي مشوره، درمل یا نسخه نه شم درکولای. ایا غواړئ د ډاکټر سره ملاقات تنظیم کړئ؟'
          : 'As an administrative assistant, I cannot provide medical advice, prescriptions, or diagnosis. Would you like to schedule an appointment with a doctor?';

      await this.sessionService.addMessage(
        session.id,
        VoiceSpeakerType.ASSISTANT,
        refusalResponse,
        language
      );

      return this.twilioAdapter.generateSpeechGather({
        promptText: refusalResponse,
        language,
        actionUrl: gatherActionUrl,
      });
    }

    // Safety 3: Human Handover Request
    if (intent === AiIntent.HUMAN_HANDOVER) {
      return this.handoverService.initiateHandover({
        callSessionId: session.id,
        reason: 'Caller requested human receptionist',
      });
    }

    // 4. Server Tools Execution
    let responseSpeech = '';

    try {
      switch (intent) {
        case AiIntent.CLINIC_INFORMATION:
        case AiIntent.LOCATION_INFORMATION:
        case AiIntent.CONTACT_INFORMATION:
        case AiIntent.WORKING_HOURS:
        case AiIntent.FAQ: {
          const clinicInfo = await this.aiToolsService.getClinicInformation(session.id, session.clinicId);
          if (clinicInfo) {
            responseSpeech =
              language === 'ur'
                ? `${clinicInfo.name} میں خوش آمدید۔ ہمارا پتہ ہے: ${clinicInfo.address || 'مرکزی برانچ'}۔ اوقات کار پیر تا ہفتہ صبح 9 سے شام 8 بجے ہیں۔ کیا میں مزید کوئی مدد کروں؟`
                : language === 'ps'
                ? `ښه راغلاست ${clinicInfo.name} ته. زموږ پته: ${clinicInfo.address || 'مرکزي څانګه'}. د کار وختونه سهار له ۹ څخه تر ماښام ۸ پورې دي.`
                : `Welcome to ${clinicInfo.name}. Located at ${clinicInfo.address || 'Main Branch'}. We are open Monday to Saturday, 9 AM to 8 PM. How else may I assist you?`;
          } else {
            responseSpeech =
              language === 'ur'
                ? 'کلینک پیر تا ہفتہ صبح 9 سے شام 8 بجے تک کھلا رہتا ہے۔'
                : 'Our clinic is open Monday to Saturday, 9 AM to 8 PM.';
          }
          break;
        }

        case AiIntent.DOCTOR_LOOKUP:
        case AiIntent.SPECIALTY_LOOKUP:
        case AiIntent.APPOINTMENT_AVAILABILITY: {
          const doctors = await this.aiToolsService.searchDoctors(
            session.id,
            session.clinicId,
            nluResult.entities?.specialty,
            nluResult.entities?.doctorName
          );

          if (doctors && doctors.length > 0 && doctors[0]) {
            const doc = doctors[0];
            responseSpeech =
              language === 'ur'
                ? `ڈاکٹر ${doc.fullName} (${doc.specialty}) دستیاب ہیں۔ فیس ${doc.consultationFee} روپے ہے۔ کیا آپ ان کے ساتھ اپائنٹمنٹ بک کرنا چاہتے ہیں؟`
                : language === 'ps'
                ? `ډاکټر ${doc.fullName} (${doc.specialty}) شتون لري. ایا غواړئ د دوی سره وخت ونیسئ؟`
                : `Dr. ${doc.fullName}, specialist in ${doc.specialty}, is available. Fee is PKR ${doc.consultationFee}. Would you like to book an appointment?`;
          } else {
            responseSpeech =
              language === 'ur'
                ? 'ہمارے پاس جنرل فزیشن، امراض قلب، اور اطفال کے ماہر ڈاکٹرز دستیاب ہیں۔ آپ کس شعبے میں دکھانا چاہتے ہیں؟'
                : 'We have specialists in General Medicine, Cardiology, and Pediatrics available. Which department are you looking for?';
          }
          break;
        }

        case AiIntent.QUEUE_STATUS:
        case AiIntent.TOKEN_LOOKUP: {
          const queueResult = await this.aiToolsService.getQueueStatus(session.id, session.clinicId);

          if (queueResult.activeSession) {
            const current = queueResult.currentServingToken || 'None';
            const waiting = queueResult.waitingCount || 0;

            responseSpeech =
              language === 'ur'
                ? `او پی ڈی میں اس وقت ٹوکن نمبر ${current} چل رہا ہے۔ قطار میں ${waiting} مریض منتظر ہیں۔`
                : language === 'ps'
                ? `اوس مهال ټوکن نمبر ${current} روان دی. په قطار کې ${waiting} ناروغان انتظار باسي.`
                : `Current serving token is number ${current}. There are ${waiting} patients waiting in the queue.`;
          } else {
            responseSpeech =
              language === 'ur'
                ? 'او پی ڈی قطار فعال ہے۔ برائے مہربانی کلینک کاؤنٹر پر تشریف لا کر ٹوکن حاصل فرمائیں۔'
                : 'OPD queue is currently active. Please visit the clinic reception desk to collect your token.';
          }
          break;
        }

        case AiIntent.APPOINTMENT_BOOKING:
        case AiIntent.APPOINTMENT_CONFIRMATION: {
          const doctors = await this.aiToolsService.searchDoctors(session.id, session.clinicId);
          const doctor = doctors?.[0];

          if (doctor && session.patientId) {
            const todayStr = new Date().toISOString().split('T')[0] || '';
            const booking = await this.aiToolsService.createAppointment(session.id, {
              clinicId: session.clinicId,
              doctorId: doctor.id,
              patientId: session.patientId,
              date: todayStr,
              startTime: '16:00',
              endTime: '16:15',
              reasonForVisit: 'Voice telephone booking',
            });

            if (booking && booking.id) {
              try {
                await this.notificationScheduler.scheduleAppointmentNotifications(
                  booking.id,
                  NotificationEventType.APPOINTMENT_BOOKED
                );
              } catch (schedErr: any) {
                this.logger.warn(`Failed to schedule voice booking notification: ${schedErr.message}`);
              }

              responseSpeech =
                language === 'ur'
                  ? `آپ کی اپائنٹمنٹ ڈاکٹر ${doctor.fullName} کے ساتھ درج کر لی گئی ہے۔ تصدیقی پیغام آپ کے فون پر ارسال کر دیا گیا ہے۔`
                  : language === 'ps'
                  ? `ستاسو ملاقات د ډاکټر ${doctor.fullName} سره تایید شوه. د تایید پیغام ستاسو موبایل ته واستول شو.`
                  : `Your appointment with Dr. ${doctor.fullName} has been booked. A confirmation message has been sent to your phone.`;
            } else {
              responseSpeech =
                language === 'ur'
                  ? `ہم ڈاکٹر ${doctor.fullName} کے لیے اپائنٹمنٹ تیار کر رہے ہیں۔ کیا آپ تصدیق کرتے ہیں؟`
                  : `We can schedule you with Dr. ${doctor.fullName}. Would you like to confirm?`;
            }
          } else {
            responseSpeech =
              language === 'ur'
                ? 'اپائنٹمنٹ بک کرنے کے لیے برائے مہربانی مطلوبہ ڈاکٹر یا شعبہ بیان فرمائیں۔'
                : 'To book an appointment, please mention your preferred doctor or specialty.';
          }
          break;
        }

        default: {
          responseSpeech =
            language === 'ur'
              ? 'میں نے آپ کی بات نوٹ کر لی ہے۔ آپ ڈاکٹر کا وقت، نئی اپائنٹمنٹ، ٹوکن، یا استقبالیہ سے بات کرنے کے لیے کہہ سکتے ہیں۔'
              : language === 'ps'
              ? 'ما ستاسو خبره واورېده. تاسو د ډاکټرانو وخت، نوی ملاقات، یا د استوګنځي سره خبرې کولای شئ.'
              : 'I have noted your request. You can ask for doctor schedules, book an appointment, check queue tokens, or ask to speak with the receptionist.';
        }
      }
    } catch (err: any) {
      this.logger.error(`Error executing voice intent: ${err.message}`);
      return this.handoverService.initiateHandover({
        callSessionId: session.id,
        reason: `AI execution failure: ${err.message}`,
      });
    }

    // 5. Record assistant voice reply message
    await this.sessionService.addMessage(
      session.id,
      VoiceSpeakerType.ASSISTANT,
      responseSpeech,
      language
    );

    // 6. Continue speech gather
    return this.twilioAdapter.generateSpeechGather({
      promptText: responseSpeech,
      language,
      actionUrl: gatherActionUrl,
      speechTimeoutSeconds: 5,
    });
  }
}
