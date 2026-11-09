import { Injectable, Logger, Inject, Optional, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AIConversationManagerService } from '../ai-conversation/ai-conversation-manager.service';

export const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'END'];
export const OPT_IN_KEYWORDS = ['START', 'UNSTOP', 'YES'];
export const HANDOVER_KEYWORDS = ['HUMAN', 'AGENT', 'RECEPTIONIST', 'OPERATOR', 'HELP', 'DOCTOR PLEASE'];

@Injectable()
export class WhatsAppInboundService {
  private readonly logger = new Logger(WhatsAppInboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => AIConversationManagerService))
    private readonly aiConversationManager?: AIConversationManagerService,
  ) {}

  /**
   * Main entry point for processing incoming WhatsApp webhook events
   */
  async processWebhookEvent(payload: any, eventId: string): Promise<void> {
    // 1. Deduplication check
    const existingEvent = await this.prisma.whatsappWebhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent && existingEvent.processingStatus === 'PROCESSED') {
      this.logger.debug(`Webhook event ${eventId} already processed; skipping.`);
      return;
    }

    // Record or update webhook event ledger
    await this.prisma.whatsappWebhookEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        eventType: payload?.entry?.[0]?.changes?.[0]?.field || 'messages',
        payload: payload || {},
        processingStatus: 'PROCESSING',
      },
      update: {
        processingStatus: 'PROCESSING',
      },
    });

    try {
      const entries = payload?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          if (change.field === 'messages') {
            await this.processMessageChange(change.value);
          }
        }
      }

      await this.prisma.whatsappWebhookEvent.update({
        where: { eventId },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to process webhook event ${eventId}: ${err.message}`, err.stack);
      await this.prisma.whatsappWebhookEvent.update({
        where: { eventId },
        data: {
          processingStatus: 'FAILED',
          errorMessage: err.message,
        },
      });
      throw err;
    }
  }

  /**
   * Processes a single change payload from Meta Cloud API
   */
  private async processMessageChange(changeValue: any): Promise<void> {
    if (!changeValue) return;

    const phoneNumberId = changeValue.metadata?.phone_number_id;
    if (!phoneNumberId) {
      this.logger.warn('Webhook changeValue missing phone_number_id metadata');
      return;
    }

    // Resolve integration and multi-tenant clinic
    const integration = await this.prisma.whatsappIntegration.findUnique({
      where: { phoneNumberId },
    });

    if (!integration) {
      this.logger.warn(`No WhatsApp integration registered for phoneNumberId: ${phoneNumberId}`);
      return;
    }

    const { organizationId, clinicId } = integration;

    // Process Inbound Messages
    if (Array.isArray(changeValue.messages) && changeValue.messages.length > 0) {
      const contacts = changeValue.contacts || [];
      for (const msg of changeValue.messages) {
        await this.handleInboundMessage(organizationId, clinicId, msg, contacts);
      }
    }

    // Process Status Updates (sent, delivered, read, failed)
    if (Array.isArray(changeValue.statuses) && changeValue.statuses.length > 0) {
      for (const status of changeValue.statuses) {
        await this.handleStatusUpdate(status);
      }
    }
  }

  /**
   * Handles incoming patient message, contacts, opt-out, handover, and conversations
   */
  private async handleInboundMessage(
    organizationId: string,
    clinicId: string,
    message: any,
    contactsMeta: any[],
  ): Promise<void> {
    const rawFrom = message.from;
    if (!rawFrom) return;

    const waId = rawFrom.replace(/[^0-9]/g, '');
    const metaContact = contactsMeta.find((c) => c.wa_id === waId || c.wa_id === rawFrom);
    const profileName = metaContact?.profile?.name || null;

    // Extract text body
    let body = '';
    if (message.type === 'text') {
      body = message.text?.body || '';
    } else if (message.type === 'button') {
      body = message.button?.text || '';
    } else if (message.type === 'interactive') {
      body =
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        '';
    } else {
      body = message.caption || `[${message.type || 'media'}]`;
    }

    const trimmedUpper = body.trim().toUpperCase();

    // 1. Resolve or create WhatsappContact
    let contact = await this.prisma.whatsappContact.findUnique({
      where: {
        clinicId_waId: { clinicId, waId },
      },
    });

    // Auto-match patient record if patient not yet linked
    let matchedPatientId: string | null = contact?.patientId || null;
    if (!matchedPatientId) {
      const patient = await this.prisma.patient.findFirst({
        where: {
          clinicId,
          phone: { contains: waId.slice(-10) }, // match last 10 digits for local/intl formats
        },
      });
      if (patient) {
        matchedPatientId = patient.id;
      }
    }

    // Detect Opt-Out / Opt-In keywords
    let consentStatus = contact?.consentStatus || 'UNKNOWN';
    let optOutReason = contact?.optOutReason || null;
    let consentUpdatedAt = contact?.consentUpdatedAt || null;

    if (OPT_OUT_KEYWORDS.includes(trimmedUpper)) {
      consentStatus = 'OPTED_OUT';
      optOutReason = 'PATIENT_KEYWORD_OPT_OUT';
      consentUpdatedAt = new Date();
      this.logger.log(`Contact ${waId} opted out via keyword "${trimmedUpper}"`);
    } else if (OPT_IN_KEYWORDS.includes(trimmedUpper)) {
      consentStatus = 'OPTED_IN';
      optOutReason = null;
      consentUpdatedAt = new Date();
      this.logger.log(`Contact ${waId} opted in via keyword "${trimmedUpper}"`);
    }

    if (!contact) {
      contact = await this.prisma.whatsappContact.create({
        data: {
          organizationId,
          clinicId,
          patientId: matchedPatientId,
          waId,
          profileName,
          consentStatus,
          optOutReason,
          consentUpdatedAt,
          lastInboundAt: new Date(),
        },
      });
    } else {
      contact = await this.prisma.whatsappContact.update({
        where: { id: contact.id },
        data: {
          profileName: profileName || contact.profileName,
          patientId: matchedPatientId || contact.patientId,
          consentStatus,
          optOutReason,
          consentUpdatedAt,
          lastInboundAt: new Date(),
        },
      });
    }

    // 2. Check for human handover request
    const isHandoverRequested = HANDOVER_KEYWORDS.some((kw) =>
      trimmedUpper.includes(kw),
    );

    // 3. Resolve active conversation
    let conversation = await this.prisma.whatsappConversation.findFirst({
      where: {
        clinicId,
        contactId: contact.id,
        status: { in: ['OPEN', 'HUMAN_HANDOVER'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();

    if (!conversation) {
      conversation = await this.prisma.whatsappConversation.create({
        data: {
          organizationId,
          clinicId,
          contactId: contact.id,
          status: isHandoverRequested ? 'HUMAN_HANDOVER' : 'OPEN',
          handoverReason: isHandoverRequested ? 'PATIENT_KEYWORD_REQUEST' : null,
          handoverAt: isHandoverRequested ? now : null,
          lastCustomerMessageAt: now,
          lastMessagePreview: body.slice(0, 255),
          unreadCount: 1,
        },
      });
    } else {
      const newStatus = isHandoverRequested ? 'HUMAN_HANDOVER' : conversation.status;
      conversation = await this.prisma.whatsappConversation.update({
        where: { id: conversation.id },
        data: {
          status: newStatus,
          handoverReason: isHandoverRequested
            ? 'PATIENT_KEYWORD_REQUEST'
            : conversation.handoverReason,
          handoverAt: isHandoverRequested ? now : conversation.handoverAt,
          lastCustomerMessageAt: now,
          lastMessagePreview: body.slice(0, 255),
          unreadCount: conversation.unreadCount + 1,
        },
      });
    }

    // 4. Persist Inbound Message
    const providerMessageId = message.id;
    await this.prisma.whatsappMessage.upsert({
      where: { providerMessageId },
      create: {
        organizationId,
        clinicId,
        conversationId: conversation.id,
        contactId: contact.id,
        providerMessageId,
        direction: 'INBOUND',
        messageType: message.type || 'text',
        body,
        status: 'DELIVERED',
        rawPayload: message,
      },
      update: {
        status: 'DELIVERED',
        body,
      },
    });

    this.logger.debug(
      `Inbound message ${providerMessageId} from ${waId} saved into conversation ${conversation.id}`,
    );

    // 5. Trigger AI Multilingual Receptionist if eligible
    if (
      this.aiConversationManager &&
      conversation.status !== 'HUMAN_HANDOVER' &&
      contact.consentStatus !== 'OPTED_OUT' &&
      !isHandoverRequested
    ) {
      try {
        await this.aiConversationManager.handleInboundInteraction({
          organizationId,
          clinicId,
          conversationId: conversation.id,
          contactId: contact.id,
          inboundMessageId: providerMessageId,
          messageBody: body,
        });
      } catch (aiErr: any) {
        this.logger.error(`AI interaction failed for message ${providerMessageId}: ${aiErr.message}`);
      }
    }
  }

  /**
   * Handles delivery status receipts from Meta (sent, delivered, read, failed)
   */
  private async handleStatusUpdate(statusObj: any): Promise<void> {
    const providerMessageId = statusObj.id;
    if (!providerMessageId) return;

    const message = await this.prisma.whatsappMessage.findUnique({
      where: { providerMessageId },
    });

    if (!message) {
      this.logger.debug(`Status receipt for untracked providerMessageId: ${providerMessageId}`);
      return;
    }

    const metaStatus = (statusObj.status || '').toLowerCase();
    const timestamp = statusObj.timestamp ? new Date(Number(statusObj.timestamp) * 1000) : new Date();

    const updateData: any = {};

    if (metaStatus === 'sent') {
      updateData.status = 'SENT';
      updateData.sentAt = timestamp;
    } else if (metaStatus === 'delivered') {
      updateData.status = 'DELIVERED';
      updateData.deliveredAt = timestamp;
    } else if (metaStatus === 'read') {
      updateData.status = 'READ';
      updateData.readAt = timestamp;
    } else if (metaStatus === 'failed') {
      updateData.status = 'FAILED';
      updateData.errorCode = String(statusObj.errors?.[0]?.code || 'UNKNOWN');
      updateData.errorMessage = statusObj.errors?.[0]?.message || 'Message delivery failed';
    }

    await this.prisma.whatsappMessage.update({
      where: { id: message.id },
      data: updateData,
    });

    this.logger.debug(`Message ${providerMessageId} updated to status: ${updateData.status}`);
  }
}

