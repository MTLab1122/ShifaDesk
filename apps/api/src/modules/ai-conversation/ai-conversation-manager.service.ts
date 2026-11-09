import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { MultilingualNluService } from './multilingual-nlu.service';
import { AiToolsService } from './ai-tools.service';
import { AiConfigService } from './ai-config.service';
import { WhatsAppOutboundService } from '../whatsapp/whatsapp-outbound.service';
import { AiIntent, AiOutcome } from '@matabai/shared';

// Localized emergency advisories
const EMERGENCY_ADVISORIES: Record<string, string> = {
  en: '⚠️ MEDICAL EMERGENCY NOTICE: If you or someone else is experiencing severe symptoms (such as chest pain, severe bleeding, or difficulty breathing), please immediately visit the nearest emergency department or call emergency ambulance Rescue 1122. I have alerted our clinic staff.',
  ur: '⚠️ ہنگامی طبی انتباہ: اگر آپ یا کوئی اور شدید علامات (جیسے سینے میں شدید درد، خون بہنا یا سانس لینے میں دشواری) محسوس کر رہے ہیں، تو براہ کرم فوری طور پر قریبی ایمرجنسی ہسپتال جائیں یا ریسکیو 1122 پر کال کریں۔ میں نے ہمارے عملے کو بھی مطلع کر دیا ہے۔',
  ps: '⚠️ بیړنی طبي خبرداری: که تاسو یا کوم بل کس د سینې درد، ساه لنډۍ یا ډیره وینه بهیدل لرئ، سمدستي نږدې بیړني روغتون یا ژغورنې 1122 ته زنګ ووهئ. ما د کلینیک کارمندانو ته هم خبر ورکړ.',
  'ur-Latn': '⚠️ EMERGENCY NOTICE: Agar aapko seene mein shadeed dard, saans lene mein dushwari ya shadeed khoon behne jesi emergency hai, to barah-e-karam foran qareebi hospital emergency jayein ya Rescue 1122 par call karein. Humne clinic staff ko bhi mutala kar dia hai.',
  'ps-Latn': '⚠️ BERANAI NOTICE: Keka tanso ya bal sok da seene dard, wena bahedal ya sah bandedal lari, no samdasti qareebi emergency hospital te laar shai ya 1122 ta zang wuwhai.',
};

// Localized medical advice refusals
const MEDICAL_REFUSALS: Record<string, string> = {
  en: 'I am ShifaDesk\'s virtual administrative receptionist. As an AI assistant, I am not permitted to provide medical diagnoses, prescribe medications, or interpret lab reports.\n\nWould you like me to book a consultation with one of our certified doctors, or would you prefer to speak with our human receptionist?',
  ur: 'میں شفا ڈیسک کا انتظامی ورچوئل اسسٹنٹ ہوں۔ ایک اے آئی اسسٹنٹ کی حیثیت سے، مجھے طبی تشخیص، نسخہ تجویز کرنے یا لیب رپورٹس کا تجزیہ کرنے کی اجازت نہیں ہے۔\n\nکیا آپ ہمارے کسی ماہر ڈاکٹر سے ملاقات (اپائنٹمنٹ) بک کروانا چاہتے ہیں، یا ہمارے ریسپشنسٹ سے بات کرنا چاہیں گے؟',
  ps: 'زه د شفا ډیسک اداري مرستیال یم. د یو AI اسسټنټ په توګه، زه د طبي تشخیص، نسخې یا طبي راپورونو د تحلیل کولو اجازه نلرم.\n\nایا غواړئ چې زموږ د ډاکټر سره لیدنه وټاکئ، یا زموږ د کارمند سره خبرې وکړئ؟',
  'ur-Latn': 'Main ShifaDesk ka administrative assistant hoon. AI assistant hone k naate main koi medical mashwara, dawai ya test report check nahi kar sakta.\n\nKya aap hamare specialist doctor se appointment book karna chahte hain, ya receptionist se baat karna pasand karein ge?',
  'ps-Latn': 'Za da ShifaDesk idari marastyal yam. Za tibbi mashwara ya nuskha nisham darkawalay.\n\nAya taso doctor appointment jorawil ghwari ka receptionist sara khabare?',
};

// Localized human handover messages
const HANDOVER_MESSAGES: Record<string, string> = {
  en: 'I have transferred our conversation to our clinic human receptionist. A staff member will be with you shortly. Thank you for your patience!',
  ur: 'میں نے آپ کی گفتگو ہمارے کلینیک ریسپشنسٹ کے حوالے کر دی ہے۔ ہمارے عملے کا ایک رکن جلد ہی آپ کو جواب دے گا۔ آپ کے صبر کا شکریہ!',
  ps: 'ما ستاسو خبرې زموږ د کلینیک کارمند ته انتقال کړې. زموږ کارمند به ډیر ژر تاسو ته ځواب درکړي. مننه!',
  'ur-Latn': 'Maine aapki chat hamare clinic receptionist ko forward kardi hai. Staff ka numaenda jald hi aapse raabta karega. Shukriya!',
  'ps-Latn': 'Ma staso khabare clinic receptionist ta transfer kare de. Da idare sarray ba der zhar staso jawab darkari.',
};

@Injectable()
export class AIConversationManagerService {
  private readonly logger = new Logger(AIConversationManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nluService: MultilingualNluService,
    private readonly toolsService: AiToolsService,
    private readonly configService: AiConfigService,
    @Inject(forwardRef(() => WhatsAppOutboundService))
    private readonly outboundService: WhatsAppOutboundService,
  ) {}

  /**
   * Main entry point when an inbound customer message arrives
   */
  async handleInboundInteraction(params: {
    organizationId: string;
    clinicId: string;
    conversationId: string;
    contactId?: string;
    inboundMessageId?: string;
    messageBody: string;
  }): Promise<{ response: string; intent: string; outcome: string }> {
    const startTime = Date.now();
    const { organizationId, clinicId, conversationId, inboundMessageId, messageBody } = params;

    // 1. Load or initialize AI Assistant Settings for this clinic
    let settings = await this.prisma.aiAssistantSettings.findUnique({
      where: { clinicId },
    });

    if (!settings) {
      settings = await this.prisma.aiAssistantSettings.create({
        data: {
          organizationId,
          clinicId,
          assistantName: 'ShifaDesk Multilingual Receptionist',
          enabled: true,
          defaultLanguage: 'UR',
          supportedLanguages: ['EN', 'UR', 'PS'],
        },
      });
    }

    // If AI is disabled for this clinic, do not respond
    if (!settings.enabled) {
      this.logger.debug(`AI Receptionist is disabled for clinic ${clinicId}`);
      return { response: '', intent: 'DISABLED', outcome: 'DISABLED' };
    }

    // 2. Fetch Contact and Conversation
    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // If human handover is already active or contact is opted out, bypass AI
    if (conversation.status === 'HUMAN_HANDOVER') {
      this.logger.debug(`Conversation ${conversationId} is in HUMAN_HANDOVER; AI will not interfere.`);
      return { response: '', intent: 'HUMAN_HANDOVER', outcome: 'BYPASSED' };
    }

    if (conversation.contact?.consentStatus === 'OPTED_OUT') {
      this.logger.debug(`Contact ${conversation.contact.waId} is OPTED_OUT; skipping AI response.`);
      return { response: '', intent: 'OPTED_OUT', outcome: 'OPTED_OUT' };
    }

    // 3. Load or initialize conversational state
    let state = await this.prisma.aiConversationState.findUnique({
      where: { conversationId },
    });

    if (!state) {
      state = await this.prisma.aiConversationState.create({
        data: {
          organizationId,
          clinicId,
          conversationId,
          detectedLanguage: 'en',
          conversationContext: {},
        },
      });
    }

    const context = (state.conversationContext as Record<string, any>) || {};

    // 4. Run Multilingual NLU
    const nluResult = this.nluService.analyzeInput(messageBody, context);
    const lang = nluResult.detectedLanguage;
    const intent = nluResult.intent;

    let responseText = '';
    let outcome: AiOutcome = AiOutcome.RESPONDED;

    // =========================================================================
    // SAFETY RULE 1: EMERGENCY OR URGENT CLINICAL CONCERN
    // =========================================================================
    if (intent === AiIntent.EMERGENCY_OR_URGENT_CONCERN) {
      this.logger.warn(`Emergency condition detected in conversation ${conversationId}: "${messageBody}"`);
      responseText = EMERGENCY_ADVISORIES[lang] || EMERGENCY_ADVISORIES['en'] || '';
      outcome = AiOutcome.HANDOVER;

      // Escalate to human receptionist immediately
      await this.prisma.whatsappConversation.update({
        where: { id: conversationId },
        data: {
          status: 'HUMAN_HANDOVER',
          handoverReason: 'EMERGENCY_OR_URGENT_CONCERN',
          handoverAt: new Date(),
        },
      });

      await this.prisma.aiConversationState.update({
        where: { conversationId },
        data: {
          detectedLanguage: lang,
          currentIntent: intent,
          handoverRequired: true,
          conversationContext: {}, // reset workflow
          lastProcessedMessageId: inboundMessageId || null,
          lastActivityAt: new Date(),
        },
      });

      await this.deliverAndLog({
        organizationId,
        clinicId,
        conversationId,
        to: conversation.contact?.waId || '',
        inboundMessageId,
        responseText,
        intent,
        lang,
        outcome,
        startTime,
      });

      return { response: responseText, intent, outcome };
    }

    // =========================================================================
    // SAFETY RULE 2: MEDICAL ADVICE / DIAGNOSTIC INTERPRETATION REFUSAL
    // =========================================================================
    if (intent === AiIntent.MEDICAL_REQUEST) {
      this.logger.log(`Medical advice refusal triggered in conversation ${conversationId}`);
      responseText = MEDICAL_REFUSALS[lang] || MEDICAL_REFUSALS['en'] || '';
      outcome = AiOutcome.RESPONDED;

      await this.deliverAndLog({
        organizationId,
        clinicId,
        conversationId,
        to: conversation.contact?.waId || '',
        inboundMessageId,
        responseText,
        intent,
        lang,
        outcome,
        startTime,
      });

      return { response: responseText, intent, outcome };
    }

    // =========================================================================
    // SAFETY RULE 3: HUMAN HANDOVER REQUEST
    // =========================================================================
    if (intent === AiIntent.HUMAN_HANDOVER) {
      await this.toolsService.requestHumanHandover(conversationId, 'Patient requested human receptionist');
      responseText = HANDOVER_MESSAGES[lang] || HANDOVER_MESSAGES['en'] || '';
      outcome = AiOutcome.HANDOVER;

      await this.prisma.aiConversationState.update({
        where: { conversationId },
        data: {
          detectedLanguage: lang,
          currentIntent: intent,
          handoverRequired: true,
          conversationContext: {},
          lastProcessedMessageId: inboundMessageId || null,
          lastActivityAt: new Date(),
        },
      });

      await this.deliverAndLog({
        organizationId,
        clinicId,
        conversationId,
        to: conversation.contact?.waId || '',
        inboundMessageId,
        responseText,
        intent,
        lang,
        outcome,
        startTime,
      });

      return { response: responseText, intent, outcome };
    }

    // =========================================================================
    // WORKFLOW 1: MULTI-TURN APPOINTMENT BOOKING
    // =========================================================================
    if (
      intent === AiIntent.APPOINTMENT_BOOKING ||
      intent === AiIntent.APPOINTMENT_AVAILABILITY ||
      intent === AiIntent.APPOINTMENT_CONFIRMATION ||
      context.activeStep
    ) {
      const bookingResult = await this.handleBookingWorkflow({
        organizationId,
        clinicId,
        conversationId,
        patientId: conversation.contact?.patientId || null,
        nluResult,
        context,
        rawMessage: messageBody,
      });

      responseText = bookingResult.responseText;
      outcome = bookingResult.outcome;

      await this.prisma.aiConversationState.update({
        where: { conversationId },
        data: {
          detectedLanguage: lang,
          currentIntent: intent,
          currentStep: bookingResult.updatedContext.activeStep || null,
          conversationContext: bookingResult.updatedContext,
          lastProcessedMessageId: inboundMessageId || null,
          lastActivityAt: new Date(),
        },
      });

      await this.deliverAndLog({
        organizationId,
        clinicId,
        conversationId,
        to: conversation.contact?.waId || '',
        inboundMessageId,
        responseText,
        intent,
        lang,
        outcome,
        startTime,
      });

      return { response: responseText, intent, outcome };
    }

    // =========================================================================
    // WORKFLOW 2: QUEUE & DIGITAL TOKEN STATUS
    // =========================================================================
    if (intent === AiIntent.TOKEN_LOOKUP || intent === AiIntent.QUEUE_STATUS) {
      let tokenInfo: any = null;
      if (conversation.contact?.patientId) {
        tokenInfo = await this.toolsService.getPatientToken(conversationId, conversation.contact.patientId, clinicId);
      }
      const queueInfo = await this.toolsService.getQueueStatus(conversationId, clinicId);

      if (tokenInfo) {
        if (lang === 'ur') {
          responseText = `🎫 آپ کا ٹوکن نمبر: ${tokenInfo.tokenDisplay}\nڈاکٹر: ${tokenInfo.queueSession?.doctor?.fullName || 'او پی ڈی'}\nحالت: ${tokenInfo.status}\nفی الوقت بلایا گیا ٹوکن: ${queueInfo.currentServingToken || 'کوئی نہیں'}\nانتظار میں کل مریض: ${queueInfo.waitingCount ?? 0}`;
        } else if (lang === 'ps') {
          responseText = `🎫 ستاسو د ټوکن شمیره: ${tokenInfo.tokenDisplay}\nډاکټر: ${tokenInfo.queueSession?.doctor?.fullName || 'OPD'}\nحالت: ${tokenInfo.status}\nاوسنی ټوکن: ${queueInfo.currentServingToken || 'هیڅ نشته'}\nانتظار کونکي ناروغان: ${queueInfo.waitingCount ?? 0}`;
        } else {
          responseText = `🎫 Your Token: ${tokenInfo.tokenDisplay}\nDoctor: ${tokenInfo.queueSession?.doctor?.fullName || 'OPD Doctor'}\nStatus: ${tokenInfo.status}\nCurrently Serving: ${queueInfo.currentServingToken || 'None'}\nPatients Waiting: ${queueInfo.waitingCount ?? 0}`;
        }
      } else {
        if (lang === 'ur') {
          responseText = `🏥 کلینک قطار کی صورتحال:\nفی الوقت بلایا گیا ٹوکن: ${queueInfo.currentServingToken || 'کوئی نہیں'}\nانتظار میں کل مریض: ${queueInfo.waitingCount ?? 0}\n\nاگر آپ کے پاس پہلے سے ٹوکن ہے، تو برائے مہربانی اپنا ٹوکن نمبر بتائیں۔`;
        } else if (lang === 'ps') {
          responseText = `🏥 د کلینیک قطار حالت:\nاوسنی ټوکن: ${queueInfo.currentServingToken || 'هیڅ نشته'}\nانتظار کونکي: ${queueInfo.waitingCount ?? 0}\n\nکه تاسو ټوکن لرئ، مهرباني وکړئ شمېره واستوئ.`;
        } else {
          responseText = `🏥 Clinic Queue Status:\nCurrently Serving: ${queueInfo.currentServingToken || 'None'}\nPatients in Queue: ${queueInfo.waitingCount ?? 0}\n\nIf you hold a token, please send your token number.`;
        }
      }

      await this.deliverAndLog({
        organizationId,
        clinicId,
        conversationId,
        to: conversation.contact?.waId || '',
        inboundMessageId,
        responseText,
        intent,
        lang,
        outcome: AiOutcome.RESPONDED,
        startTime,
      });

      return { response: responseText, intent, outcome: AiOutcome.RESPONDED };
    }

    // =========================================================================
    // WORKFLOW 3: CLINIC FAQ / TIMINGS / LOCATION / FEES
    // =========================================================================
    const faqResult = await this.toolsService.searchClinicFaq(conversationId, messageBody, clinicId, lang);
    if (faqResult) {
      responseText = faqResult.answer;
    } else {
      const clinic = await this.toolsService.getClinicInformation(conversationId, clinicId);
      if (lang === 'ur') {
        responseText = `سلام! میں ${clinic.name} کا ورچوئل اسسٹنٹ ہوں۔\nپتہ: ${clinic.address || 'مین کلینک روڈ'}\nفون: ${clinic.phone || '051-0000000'}\n\nآپ مجھ سے ڈاکٹر کا وقت معلوم کر سکتے ہیں، اپائنٹمنٹ بک کر سکتے ہیں، یا اپنا ٹوکن چیک کر سکتے ہیں۔`;
      } else if (lang === 'ps') {
        responseText = `سلام! زه د ${clinic.name} مرستیال یم.\nپته: ${clinic.address || 'مرکزي روغتون'}\nټلیفون: ${clinic.phone || '051-0000000'}\n\nتاسو کولی شئ د ډاکټر د لیدنې وخت وټاکئ یا خپل ټوکن وګورئ.`;
      } else {
        responseText = `Hello! I am the virtual receptionist for ${clinic.name}.\nAddress: ${clinic.address || 'Main Clinic Road'}\nPhone: ${clinic.phone || '051-0000000'}\n\nHow may I help you today? You can book an appointment, check doctor availability, or inquire about your queue token.`;
      }
    }

    await this.deliverAndLog({
      organizationId,
      clinicId,
      conversationId,
      to: conversation.contact?.waId || '',
      inboundMessageId,
      responseText,
      intent,
      lang,
      outcome: AiOutcome.RESPONDED,
      startTime,
    });

    return { response: responseText, intent, outcome: AiOutcome.RESPONDED };
  }

  /**
   * Multi-turn conversational booking orchestrator
   */
  private async handleBookingWorkflow(params: {
    organizationId: string;
    clinicId: string;
    conversationId: string;
    patientId: string | null;
    nluResult: any;
    context: Record<string, any>;
    rawMessage: string;
  }): Promise<{ responseText: string; outcome: AiOutcome; updatedContext: Record<string, any> }> {
    const { organizationId, clinicId, conversationId, patientId, nluResult, context, rawMessage } = params;
    const lang = nluResult.detectedLanguage;
    const entities = nluResult.entities || {};

    const updated = { ...context };

    // Update context with any newly extracted entities
    if (entities.doctorName) updated.doctorName = entities.doctorName;
    if (entities.specialty) updated.specialty = entities.specialty;
    if (entities.date) updated.date = entities.date;
    if (entities.time) updated.time = entities.time;

    // STEP: PENDING CONFIRMATION
    if (updated.pendingConfirmation) {
      if (entities.actionConfirmation === true || nluResult.intent === AiIntent.APPOINTMENT_CONFIRMATION) {
        // Patient confirmed! Execute booking
        if (!patientId) {
          // If no linked patient, create a walk-in patient profile
          const contact = await this.prisma.whatsappContact.findFirst({
            where: { clinicId },
          });
          const createdPatient = await this.prisma.patient.create({
            data: {
              organizationId,
              clinicId,
              patientNumber: `PAT-${Date.now().toString().slice(-6)}`,
              fullName: contact?.profileName || 'WhatsApp Patient',
              phone: contact?.waId || '03000000000',
              gender: 'OTHER',
            },
          });
          updated.patientId = createdPatient.id;
        } else {
          updated.patientId = patientId;
        }

        try {
          const appointment = await this.toolsService.createAppointment(conversationId, {
            clinicId,
            doctorId: updated.doctorId,
            patientId: updated.patientId,
            date: updated.date,
            startTime: updated.time,
            endTime: updated.endTime || this.calculateEndTime(updated.time),
            reasonForVisit: 'Booked via WhatsApp AI Multilingual Receptionist',
          });

          let confirmMsg = '';
          if (lang === 'ur') {
            confirmMsg = `✅ آپ کی اپائنٹمنٹ کامیابی کے ساتھ بک ہو گئی ہے!\n\n📋 اپائنٹمنٹ نمبر: ${appointment.appointmentNumber}\n👨‍⚕️ ڈاکٹر: ${updated.doctorName || 'ڈاکٹر'}\n📅 تاریخ: ${updated.date}\n⏰ وقت: ${updated.time}\n\nبرائے مہربانی وقت سے 10 منٹ پہلے کلینک تشریف لائیں۔ شکریہ!`;
          } else if (lang === 'ps') {
            confirmMsg = `✅ ستاسو لیدنه په بریا سره تایید شوه!\n\n📋 د لیدنې شمېره: ${appointment.appointmentNumber}\n👨‍⚕️ ډاکټر: ${updated.doctorName || 'ډاکټر'}\n📅 نېټه: ${updated.date}\n⏰ وخت: ${updated.time}\n\nمهرباني وکړئ د ټاکل شوي وخت څخه 10 دقیقې مخکې تشریف راوړئ. مننه!`;
          } else {
            confirmMsg = `✅ Your appointment has been successfully booked!\n\n📋 Appointment #: ${appointment.appointmentNumber}\n👨‍⚕️ Doctor: ${updated.doctorName || 'Doctor'}\n📅 Date: ${updated.date}\n⏰ Time: ${updated.time}\n\nPlease arrive 10 minutes prior to your scheduled time. Thank you!`;
          }

          return {
            responseText: confirmMsg,
            outcome: AiOutcome.TOOL_EXECUTED,
            updatedContext: {}, // reset workflow
          };
        } catch (err: any) {
          this.logger.error(`Failed to create appointment via tool: ${err.message}`);
          const errMsg =
            lang === 'ur'
              ? 'معذرت، یہ وقت اب دستیاب نہیں رہا۔ برائے مہربانی کوئی دوسرا وقت منتخب کریں۔'
              : lang === 'ps'
              ? 'بښنه غواړو، دا وخت نور شتون نلري. مهرباني وکړئ بل وخت وټاکئ.'
              : 'Sorry, that time slot was just booked by another patient. Please choose another time.';
          delete updated.time;
          delete updated.pendingConfirmation;
          updated.activeStep = 'SELECT_SLOT';
          return { responseText: errMsg, outcome: AiOutcome.ERROR, updatedContext: updated };
        }
      } else if (rawMessage.toLowerCase().includes('no') || rawMessage.includes('نہیں') || rawMessage.includes('نه')) {
        // Patient denied / cancelled
        const cancelMsg =
          lang === 'ur'
            ? 'بکنگ منسوخ کر دی گئی ہے۔ میں آپ کی مزید کیا مدد کر سکتا ہوں؟'
            : lang === 'ps'
            ? 'لیدنه لغوه شوه. زه نور څنګه ستاسو سره مرسته کولی شم؟'
            : 'Booking draft cancelled. How else may I assist you today?';
        return { responseText: cancelMsg, outcome: AiOutcome.RESPONDED, updatedContext: {} };
      } else {
        const reConfirmMsg =
          lang === 'ur'
            ? 'برائے مہربانی بکنگ کی تصدیق کے لیے "YES" (ہاں) یا منسوخ کرنے کے لیے "NO" (نہیں) لکھ کر بھیجیں۔'
            : lang === 'ps'
            ? 'مهرباني وکړئ د تصدیق لپاره "YES" یا د لغوه کولو لپاره "NO" ولیکئ.'
            : 'Please reply "YES" to confirm your appointment booking, or "NO" to cancel.';
        return { responseText: reConfirmMsg, outcome: AiOutcome.RESPONDED, updatedContext: updated };
      }
    }

    // STEP 1: RESOLVE DOCTOR
    if (!updated.doctorId) {
      const doctors = await this.toolsService.searchDoctors(
        conversationId,
        clinicId,
        updated.specialty,
        updated.doctorName,
      );

      if (doctors.length === 0) {
        const noDocMsg =
          lang === 'ur'
            ? 'معذرت، مطلوبہ شعبے میں کوئی فعال ڈاکٹر نہیں ملا۔ ہمارے پاس جنرل فزیشن دستیاب ہیں۔'
            : lang === 'ps'
            ? 'بښنه غواړو، ډاکټر ونه موندل شو.'
            : 'No doctors found matching your request. Would you like to see our general physician?';
        return { responseText: noDocMsg, outcome: AiOutcome.RESPONDED, updatedContext: updated };
      }

      if (doctors.length === 1 || updated.doctorName) {
        const selectedDoc = doctors[0];
        if (selectedDoc) {
          updated.doctorId = selectedDoc.id;
          updated.doctorName = selectedDoc.fullName;
        }
      } else {
        // Ask patient to choose a doctor
        const docList = doctors.map((d, idx) => `${idx + 1}. Dr. ${d.fullName} (${d.specialty})`).join('\n');
        let promptDoc = '';
        if (lang === 'ur') {
          promptDoc = `برائے مہربانی درج ذیل ڈاکٹروں میں سے ایک کا انتخاب کریں:\n\n${docList}\n\nڈاکٹر کا نام یا نمبر لکھ کر بھیجیں۔`;
        } else if (lang === 'ps') {
          promptDoc = `مهرباني وکړئ یو ډاکټر وټاکئ:\n\n${docList}`;
        } else {
          promptDoc = `Please select from our available doctors:\n\n${docList}\n\nReply with the doctor's name or number.`;
        }
        updated.activeStep = 'SELECT_DOCTOR';
        return { responseText: promptDoc, outcome: AiOutcome.RESPONDED, updatedContext: updated };
      }
    }

    const docDisplayName = (updated.doctorName || 'Doctor').startsWith('Dr.')
      ? updated.doctorName
      : `Dr. ${updated.doctorName || 'Doctor'}`;

    // STEP 2: RESOLVE DATE
    if (!updated.date) {
      let promptDate = '';
      if (lang === 'ur') {
        promptDate = `${docDisplayName} کے لیے آپ کس تاریخ کو تشریف لانا چاہیں گے؟ (مثلاً آج، کل، یا تاریخ YYYY-MM-DD)`;
      } else if (lang === 'ps') {
        promptDate = `د ${docDisplayName} لپاره کومه نېټه غواړئ؟ (مثلاً نن، سبا، یا نېټه)`;
      } else {
        promptDate = `Which date would you prefer for ${docDisplayName}? (e.g., today, tomorrow, or YYYY-MM-DD)`;
      }
      updated.activeStep = 'SELECT_DATE';
      return { responseText: promptDate, outcome: AiOutcome.RESPONDED, updatedContext: updated };
    }

    // STEP 3: RESOLVE TIME SLOT
    if (!updated.time) {
      const avail = await this.toolsService.getDoctorAvailability(
        conversationId,
        clinicId,
        updated.doctorId,
        updated.date,
      );

      if (!avail.slots || avail.slots.length === 0) {
        let noSlotMsg = '';
        if (lang === 'ur') {
          noSlotMsg = `${docDisplayName} کی ${updated.date} کو کوئی نشست خالی نہیں ہے۔ کیا آپ کسی اور دن وقت لینا چاہیں گے؟`;
        } else if (lang === 'ps') {
          noSlotMsg = `په ${updated.date} کې د ${docDisplayName} خالي وخت نشته. مهرباني وکړئ بله نېټه وټاکئ.`;
        } else {
          noSlotMsg = `${docDisplayName} has no available slots on ${updated.date}. Would you like to check another date?`;
        }
        delete updated.date;
        updated.activeStep = 'SELECT_DATE';
        return { responseText: noSlotMsg, outcome: AiOutcome.RESPONDED, updatedContext: updated };
      }

      const slotTimes = avail.slots.slice(0, 6).map((s: any) => `⏰ ${s.startTime}`).join('\n');
      let promptSlot = '';
      if (lang === 'ur') {
        promptSlot = `${updated.date} کو دستیاب اوقات درج ذیل ہیں:\n\n${slotTimes}\n\nبرائے مہربانی اپنا پسندیدہ وقت بتائیں۔`;
      } else if (lang === 'ps') {
        promptSlot = `په ${updated.date} کې د شته وختونو لړۍ:\n\n${slotTimes}\n\nمهرباني وکړئ خپل وخت وټاکئ.`;
      } else {
        promptSlot = `Available appointment slots on ${updated.date}:\n\n${slotTimes}\n\nPlease reply with your preferred time slot.`;
      }
      updated.activeStep = 'SELECT_SLOT';
      return { responseText: promptSlot, outcome: AiOutcome.RESPONDED, updatedContext: updated };
    }

    // STEP 4: EXPLICIT CONFIRMATION SUMMARY
    updated.endTime = this.calculateEndTime(updated.time);
    updated.pendingConfirmation = true;
    updated.activeStep = 'AWAITING_CONFIRMATION';

    let confirmPrompt = '';
    if (lang === 'ur') {
      confirmPrompt = `برائے مہربانی اپنی اپائنٹمنٹ کی تفصیلات چیک کریں:\n\n👨‍⚕️ ڈاکٹر: ${docDisplayName}\n📅 تاریخ: ${updated.date}\n⏰ وقت: ${updated.time}\n\nکیا آپ اس بکنگ کی تصدیق کرتے ہیں؟ برائے مہربانی "YES" (ہاں) یا "NO" (نہیں) لکھ کر جواب دیں۔`;
    } else if (lang === 'ps') {
      confirmPrompt = `مهرباني وکړئ د لیدنې معلومات وګورئ:\n\n👨‍⚕️ ډاکټر: ${docDisplayName}\n📅 نېټه: ${updated.date}\n⏰ وخت: ${updated.time}\n\nایا تایید کوئ؟ مهرباني وکړئ "YES" یا "NO" واستوئ.`;
    } else {
      confirmPrompt = `Please verify your appointment details:\n\n👨‍⚕️ Doctor: ${docDisplayName}\n📅 Date: ${updated.date}\n⏰ Time: ${updated.time}\n\nWould you like to confirm this booking? Please reply "YES" to confirm or "NO" to cancel.`;
    }

    return { responseText: confirmPrompt, outcome: AiOutcome.RESPONDED, updatedContext: updated };
  }

  /**
   * Helper to calculate a 15-minute slot end time
   */
  private calculateEndTime(startTime: string): string {
    const parts = (startTime || '10:00').split(':');
    const h = Number(parts[0] ?? '10');
    const m = Number(parts[1] ?? '00');
    let newM = m + 15;
    let newH = h;
    if (newM >= 60) {
      newM -= 60;
      newH += 1;
    }
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  }

  /**
   * Deliver outbound WhatsApp message and create audit interaction log
   */
  private async deliverAndLog(params: {
    organizationId: string;
    clinicId: string;
    conversationId: string;
    to: string;
    inboundMessageId?: string;
    responseText: string;
    intent: string;
    lang: string;
    outcome: AiOutcome;
    startTime: number;
  }): Promise<void> {
    const { organizationId, clinicId, conversationId, to, inboundMessageId, responseText, intent, lang, outcome, startTime } = params;

    // 1. Send outbound WhatsApp message if recipient is present
    if (to && responseText) {
      try {
        await this.outboundService.sendTextMessage({
          clinicId,
          to,
          message: responseText,
          conversationId,
        });
      } catch (err: any) {
        this.logger.error(`Outbound message delivery failed for ${to}: ${err.message}`);
      }
    }

    // 2. Persist audit interaction log
    const latencyMs = Date.now() - startTime;
    const config = this.configService.getConfig();
    const estCost = this.configService.estimateCost(100, 100);

    await this.prisma.aiInteractionLog.create({
      data: {
        organizationId,
        clinicId,
        conversationId,
        inboundMessageId: inboundMessageId || null,
        detectedLanguage: lang,
        detectedIntent: intent,
        provider: config.provider,
        model: config.model,
        outcome,
        latencyMs,
        inputTokens: 100,
        outputTokens: 100,
        estimatedCost: estCost,
      },
    });
  }
}
