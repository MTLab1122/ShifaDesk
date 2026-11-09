import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  PreviewNotificationTemplateDto,
} from '@matabai/validation';

export interface RenderedTemplate {
  subject?: string;
  messageBody: string;
  providerTemplateName?: string;
  language: string;
}

@Injectable()
export class NotificationTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  // Built-in multilingual fallback templates
  private readonly defaultTemplates: Record<string, Record<string, { body: string; subject?: string }>> = {
    APPOINTMENT_CONFIRMED: {
      EN: {
        subject: 'Appointment Confirmation - MatabAI',
        body: 'Dear {{patient_name}}, your appointment with Dr. {{doctor_name}} is confirmed for {{appointment_date}} at {{start_time}} at {{clinic_name}}. Please arrive 10 minutes early.',
      },
      UR: {
        subject: 'ملاقات کی تصدیق - مطب اے آئی',
        body: 'محترم {{patient_name}}، ڈاکٹر {{doctor_name}} کے ساتھ آپ کی ملاقات کی تصدیق ہو گئی ہے۔ تاریخ: {{appointment_date}}، وقت: {{start_time}} بمقام {{clinic_name}}۔ برائے مہربانی 10 منٹ قبل تشریف لائیں۔',
      },
      PS: {
        subject: 'د لیدنې تصدیق - مطب ای آی',
        body: 'ښاغلی/اغلې {{patient_name}}، له ډاکټر {{doctor_name}} سره ستاسو ملاقات تایید شو. نېټه: {{appointment_date}}، وخت: {{start_time}} په {{clinic_name}} کې. مهرباني وکړئ ۱۰ دقیقې مخکې حاضر شئ.',
      },
    },
    APPOINTMENT_RESCHEDULED: {
      EN: {
        subject: 'Appointment Rescheduled - MatabAI',
        body: 'Dear {{patient_name}}, your appointment with Dr. {{doctor_name}} has been rescheduled to {{appointment_date}} at {{start_time}} at {{clinic_name}}.',
      },
      UR: {
        subject: 'ملاقات کا وقت تبدیل - مطب اے آئی',
        body: 'محترم {{patient_name}}، ڈاکٹر {{doctor_name}} کے ساتھ آپ کی ملاقات کا نیا وقت: {{appointment_date}} بوقت {{start_time}} بمقام {{clinic_name}} مقرر کر دیا گیا ہے۔',
      },
      PS: {
        subject: 'د ملاقات نوی وخت - مطب ای آی',
        body: 'ښاغلی/اغلې {{patient_name}}، له ډاکټر {{doctor_name}} سره ستاسو ملاقات نېټه {{appointment_date}} او وخت {{start_time}} ته تبدیل شو.',
      },
    },
    APPOINTMENT_CANCELLED: {
      EN: {
        subject: 'Appointment Cancelled - MatabAI',
        body: 'Dear {{patient_name}}, your appointment with Dr. {{doctor_name}} on {{appointment_date}} has been cancelled. Reason: {{cancellation_reason}}.',
      },
      UR: {
        subject: 'ملاقات منسوخ - مطب اے آئی',
        body: 'محترم {{patient_name}}، ڈاکٹر {{doctor_name}} کے ساتھ آپ کی {{appointment_date}} کی ملاقات منسوخ کر دی گئی ہے۔ وجہ: {{cancellation_reason}}۔',
      },
      PS: {
        subject: 'د ملاقات لغوه کیدل - مطب ای آی',
        body: 'ښاغلی/اغلې {{patient_name}}، له ډاکټر {{doctor_name}} سره ستاسو ملاقات لغوه شو. علت: {{cancellation_reason}}.',
      },
    },
    APPOINTMENT_REMINDER: {
      EN: {
        subject: 'Upcoming Appointment Reminder - MatabAI',
        body: 'Reminder: Dear {{patient_name}}, you have an upcoming consultation with Dr. {{doctor_name}} on {{appointment_date}} at {{start_time}} at {{clinic_name}}.',
      },
      UR: {
        subject: 'یاد دہانی برائے ملاقات - مطب اے آئی',
        body: 'یاد دہانی: محترم {{patient_name}}، ڈاکٹر {{doctor_name}} کے ساتھ آپ کی ملاقات {{appointment_date}} بوقت {{start_time}} بمقام {{clinic_name}} ہے۔',
      },
      PS: {
        subject: 'د ملاقات یادونه - مطب ای آی',
        body: 'د یادونې وړ: ښاغلی/اغلې {{patient_name}}، ستاسو ملاقات له ډاکټر {{doctor_name}} سره په {{appointment_date}} نېټه په {{start_time}} بجو دی.',
      },
    },
    TOKEN_GENERATED: {
      EN: {
        subject: 'Token Generated - MatabAI Queue',
        body: 'Hello {{patient_name}}, your queue token is #{{token_number}} for Dr. {{doctor_name}}. Estimated waiting time: ~{{estimated_wait_time}} mins. There are {{patients_ahead}} patients ahead.',
      },
      UR: {
        subject: 'ٹوکن نمبر - مطب اے آئی',
        body: 'محترم {{patient_name}}، ڈاکٹر {{doctor_name}} کے لیے آپ کا ٹوکن نمبر #{{token_number}} ہے۔ متوقع انتظار: تقریبا {{estimated_wait_time}} منٹ۔ آپ سے پہلے {{patients_ahead}} مریض موجود ہیں۔',
      },
      PS: {
        subject: 'د نوبت شمېره - مطب ای آی',
        body: 'ښاغلی/اغلې {{patient_name}}، ستاسو د نوبت شمېره #{{token_number}} ده. د انتظار اټکلي وخت: تقریبا {{estimated_wait_time}} دقیقې.',
      },
    },
    TOKEN_CALLED: {
      EN: {
        subject: 'Your Turn: Token Called - MatabAI',
        body: 'Attention {{patient_name}}: Token #{{token_number}} is now being called! Please proceed to Consultation Room {{room_number}} for Dr. {{doctor_name}}.',
      },
      UR: {
        subject: 'آپ کی باری: ٹوکن طلب - مطب اے آئی',
        body: 'توجہ فرمائیں {{patient_name}}: ٹوکن نمبر #{{token_number}} بلایا گیا ہے! برائے مہربانی ڈاکٹر {{doctor_name}} کے کمرہ نمبر {{room_number}} میں تشریف لائیں۔',
      },
      PS: {
        subject: 'ستاسو نوبت راورسېد - مطب ای آی',
        body: 'پاملرنه وکړئ {{patient_name}}: نوبت #{{token_number}} وغوښتل شو! مهرباني وکړئ د ډاکټر {{doctor_name}} خونې {{room_number}} ته ننوځئ.',
      },
    },
    TOKEN_APPROACHING: {
      EN: {
        subject: 'Queue Update: Turn Approaching - MatabAI',
        body: 'Hello {{patient_name}}, your token #{{token_number}} will be called soon. There are only {{patients_ahead}} patient(s) ahead of you. Please be in the waiting area.',
      },
      UR: {
        subject: 'آپ کی باری قریب ہے - مطب اے آئی',
        body: 'محترم {{patient_name}}، آپ کا ٹوکن #{{token_number}} جلد بلایا جانے والا ہے۔ آپ سے آگے صرف {{patients_ahead}} مریض باقی ہیں۔ برائے مہربانی انتظار گاہ میں موجود رہیں۔',
      },
      PS: {
        subject: 'ستاسو نوبت نږدې دی - مطب ای آی',
        body: 'ښاغلی/اغلې {{patient_name}}، ستاسو د نوبت شمېره #{{token_number}} ژر رابلل کیږي. یوازې {{patients_ahead}} ناروغان پاتې دي.',
      },
    },
    QUEUE_DELAYED: {
      EN: {
        subject: 'Schedule Delay Notice - MatabAI',
        body: 'Notice: Dr. {{doctor_name}} is currently running approximately {{delay_minutes}} minutes behind schedule. Your estimated consultation time is now {{estimated_time}}. We apologize for the inconvenience.',
      },
      UR: {
        subject: 'اوقات میں تاخیر کی اطلاع - مطب اے آئی',
        body: 'اطلاع: ڈاکٹر {{doctor_name}} کے کلینک میں تقریبا {{delay_minutes}} منٹ کی تاخیر ہے۔ آپ کی مشاورت کا متوقع وقت اب {{estimated_time}} ہے۔ زحمت کے لیے معذرت خواہ ہیں۔',
      },
      PS: {
        subject: 'د ځنډ خبرتیا - مطب ای آی',
        body: 'خبرتیا: د ډاکټر {{doctor_name}} په لیدنو کې نږدې {{delay_minutes}} دقیقې ځنډ راغلی دی. ستاسو نوی اټکلي وخت {{estimated_time}} دی.',
      },
    },
    HUMAN_ASSISTANCE_REQUESTED: {
      EN: {
        subject: 'Receptionist Support Requested - MatabAI',
        body: 'Alert: Patient {{patient_name}} (Phone: {{patient_phone}}) requested human assistance regarding "{{inquiry_topic}}".',
      },
      UR: {
        subject: 'عملے کی مدد کی درخواست - مطب اے آئی',
        body: 'الرٹ: مریض {{patient_name}} (فون: {{patient_phone}}) نے مدد کی درخواست کی ہے۔ موضوع: "{{inquiry_topic}}"۔',
      },
      PS: {
        subject: 'د مرستې غوښتنه - مطب ای آی',
        body: 'خبرداری: ناروغ {{patient_name}} (ټلیفون: {{patient_phone}}) د مرستې غوښتنه کړې ده.',
      },
    },
    SYSTEM_ALERT: {
      EN: {
        subject: 'System Alert - MatabAI Operations',
        body: 'Operational Alert: {{alert_title}} - {{alert_message}}.',
      },
      UR: {
        subject: 'نظامی اطلاع - مطب اے آئی',
        body: 'آپریشنل الرٹ: {{alert_title}} - {{alert_message}}۔',
      },
      PS: {
        subject: 'سیستم خبرتیا - مطب ای آی',
        body: 'عملیاتي خبرداری: {{alert_title}} - {{alert_message}}.',
      },
    },
  };

  /**
   * Render template with variables and sanitize
   */
  render(
    templateBody: string,
    variables: Record<string, any> = {},
    subjectTemplate?: string | null,
  ): { body: string; subject?: string } {
    const sanitizeValue = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Strip potential clinical diagnosis words if mistakenly passed
      return str.replace(/<[^>]*>?/gm, '').trim();
    };

    let renderedBody = templateBody;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      renderedBody = renderedBody.replace(regex, sanitizeValue(value));
    }

    let renderedSubject = subjectTemplate || undefined;
    if (renderedSubject) {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        renderedSubject = renderedSubject.replace(regex, sanitizeValue(value));
      }
    }

    return { body: renderedBody, subject: renderedSubject };
  }

  /**
   * Resolve template for an event, language and channel.
   * Checks database first, falls back to default built-ins.
   */
  async resolveTemplate(
    organizationId: string,
    clinicId: string,
    eventType: string,
    channel: string,
    language: string = 'EN',
    templateId?: string | null,
  ): Promise<RenderedTemplate> {
    const upperLang = language.toUpperCase();

    // 1. If explicit templateId provided, look it up
    if (templateId) {
      const dbTemplate = await this.prisma.notificationTemplate.findUnique({
        where: { id: templateId },
      });
      if (dbTemplate && dbTemplate.enabled) {
        return {
          subject: dbTemplate.subject || undefined,
          messageBody: dbTemplate.messageBody,
          providerTemplateName: dbTemplate.providerTemplateName || undefined,
          language: dbTemplate.language,
        };
      }
    }

    // 2. Query matching template in DB
    const dbTemplate = await this.prisma.notificationTemplate.findFirst({
      where: {
        organizationId,
        eventType,
        channel,
        language: upperLang,
        enabled: true,
        OR: [{ clinicId }, { clinicId: null }],
      },
      orderBy: { clinicId: 'desc' }, // clinic-specific preferred over org-level
    });

    if (dbTemplate) {
      return {
        subject: dbTemplate.subject || undefined,
        messageBody: dbTemplate.messageBody,
        providerTemplateName: dbTemplate.providerTemplateName || undefined,
        language: dbTemplate.language,
      };
    }

    // 3. Fallback to default built-in template
    const eventDefaults = this.defaultTemplates[eventType];
    if (eventDefaults) {
      const langDefault = eventDefaults[upperLang] || eventDefaults['EN'];
      if (langDefault) {
        return {
          subject: langDefault.subject,
          messageBody: langDefault.body,
          providerTemplateName: eventType.toLowerCase(),
          language: upperLang,
        };
      }
    }

    // 4. Generic fallback
    return {
      subject: `Notification: ${eventType.replace(/_/g, ' ')}`,
      messageBody: `Notice regarding ${eventType.replace(/_/g, ' ').toLowerCase()}.`,
      providerTemplateName: 'generic_notification',
      language: upperLang,
    };
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  async findAll(organizationId: string, clinicId?: string) {
    return this.prisma.notificationTemplate.findMany({
      where: {
        organizationId,
        ...(clinicId ? { OR: [{ clinicId }, { clinicId: null }] } : {}),
      },
      orderBy: [{ eventType: 'asc' }, { language: 'asc' }],
    });
  }

  async findById(organizationId: string, id: string) {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!template) {
      throw new NotFoundException(`Notification template with id ${id} not found`);
    }
    return template;
  }

  async create(organizationId: string, dto: CreateNotificationTemplateDto) {
    return this.prisma.notificationTemplate.create({
      data: {
        organizationId,
        clinicId: dto.clinicId || null,
        name: dto.name,
        eventType: dto.eventType,
        channel: dto.channel,
        language: dto.language,
        subject: dto.subject || null,
        messageBody: dto.messageBody,
        providerTemplateName: dto.providerTemplateName || null,
        approvalStatus: dto.approvalStatus || 'APPROVED',
        variablesSchema: dto.variablesSchema || [],
        enabled: dto.enabled !== undefined ? dto.enabled : true,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateNotificationTemplateDto) {
    await this.findById(organizationId, id);
    return this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.eventType && { eventType: dto.eventType }),
        ...(dto.channel && { channel: dto.channel }),
        ...(dto.language && { language: dto.language }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.messageBody && { messageBody: dto.messageBody }),
        ...(dto.providerTemplateName !== undefined && { providerTemplateName: dto.providerTemplateName }),
        ...(dto.approvalStatus && { approvalStatus: dto.approvalStatus }),
        ...(dto.variablesSchema && { variablesSchema: dto.variablesSchema }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    });
  }

  async delete(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.notificationTemplate.delete({
      where: { id },
    });
  }

  async preview(organizationId: string, dto: PreviewNotificationTemplateDto) {
    let body = dto.messageBody;
    let subject: string | undefined;

    if (dto.templateId) {
      const template = await this.findById(organizationId, dto.templateId);
      body = body || template.messageBody;
      subject = template.subject || undefined;
    }

    if (!body) {
      throw new BadRequestException('Either templateId or messageBody must be provided for preview');
    }

    return this.render(body, dto.variables, subject);
  }
}
