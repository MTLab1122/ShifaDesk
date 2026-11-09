import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { MetaApiClient } from './meta-api.client';
import { WhatsAppEncryptionService } from './whatsapp-encryption.service';

export interface SendTextMessageParams {
  clinicId: string;
  to: string;
  message: string;
  conversationId?: string;
}

export interface SendTemplateMessageParams {
  clinicId: string;
  to: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
  conversationId?: string;
}

@Injectable()
export class WhatsAppOutboundService {
  private readonly logger = new Logger(WhatsAppOutboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaClient: MetaApiClient,
    private readonly encryptionService: WhatsAppEncryptionService,
  ) {}

  /**
   * Check whether the conversation is currently within the 24-hour customer service window
   */
  isWithin24HourWindow(lastCustomerMessageAt?: Date | null): boolean {
    if (!lastCustomerMessageAt) return false;
    const now = new Date().getTime();
    const messageTime = new Date(lastCustomerMessageAt).getTime();
    const diffHours = (now - messageTime) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  /**
   * Send a free-form text message (strictly requires 24-hour active window & opt-in)
   */
  async sendTextMessage(params: SendTextMessageParams) {
    const { clinicId, to, message, conversationId } = params;
    const cleanTo = to.replace(/[^0-9]/g, '');

    // 1. Verify Clinic Integration
    const integration = await this.prisma.whatsappIntegration.findUnique({
      where: { clinicId },
    });

    if (!integration || integration.status !== 'CONNECTED') {
      throw new BadRequestException('Clinic WhatsApp integration is not connected or active');
    }

    // 2. Verify or resolve Contact & Consent
    const contact = await this.prisma.whatsappContact.findUnique({
      where: { clinicId_waId: { clinicId, waId: cleanTo } },
    });

    if (contact && contact.consentStatus === 'OPTED_OUT') {
      throw new BadRequestException('Recipient has opted out of WhatsApp messages. Delivery blocked.');
    }

    // 3. Resolve Conversation & Verify 24-Hour Window
    let conversation = null;
    if (conversationId) {
      conversation = await this.prisma.whatsappConversation.findUnique({
        where: { id: conversationId },
      });
    } else if (contact) {
      conversation = await this.prisma.whatsappConversation.findFirst({
        where: { clinicId, contactId: contact.id },
        orderBy: { updatedAt: 'desc' },
      });
    }

    const inWindow = this.isWithin24HourWindow(conversation?.lastCustomerMessageAt);
    if (!inWindow) {
      throw new BadRequestException(
        '24-hour customer service window has expired. Only approved Meta WhatsApp templates can be sent outside the window.',
      );
    }

    // 4. Decrypt Access Token & Dispatch via Meta Graph API
    const accessToken = this.encryptionService.decrypt(integration.accessTokenEncrypted);
    const metaResponse = await this.metaClient.sendTextMessage(
      integration.phoneNumberId,
      accessToken,
      cleanTo,
      message,
    );

    const providerMessageId = metaResponse.messages?.[0]?.id || `out-${Date.now()}`;
    const now = new Date();

    // 5. Ensure Contact exists
    const contactRecord =
      contact ||
      (await this.prisma.whatsappContact.create({
        data: {
          organizationId: integration.organizationId,
          clinicId,
          waId: cleanTo,
          consentStatus: 'UNKNOWN',
          lastOutboundAt: now,
        },
      }));

    // 6. Ensure Conversation exists
    const activeConversation =
      conversation ||
      (await this.prisma.whatsappConversation.create({
        data: {
          organizationId: integration.organizationId,
          clinicId,
          contactId: contactRecord.id,
          status: 'OPEN',
          lastMessagePreview: message.slice(0, 255),
          unreadCount: 0,
        },
      }));

    // 7. Persist Outbound Message
    const savedMessage = await this.prisma.whatsappMessage.create({
      data: {
        organizationId: integration.organizationId,
        clinicId,
        conversationId: activeConversation.id,
        contactId: contactRecord.id,
        providerMessageId,
        direction: 'OUTBOUND',
        messageType: 'text',
        body: message,
        status: 'SENT',
        sentAt: now,
      },
    });

    // 8. Update conversation & contact timestamps
    await this.prisma.whatsappConversation.update({
      where: { id: activeConversation.id },
      data: {
        lastMessagePreview: message.slice(0, 255),
        unreadCount: 0,
      },
    });

    await this.prisma.whatsappContact.update({
      where: { id: contactRecord.id },
      data: { lastOutboundAt: now },
    });

    this.logger.log(`Outbound text message sent to ${cleanTo}: ${providerMessageId}`);
    return savedMessage;
  }

  /**
   * Send an approved template message (allowed outside the 24-hour window)
   */
  async sendTemplateMessage(params: SendTemplateMessageParams) {
    const { clinicId, to, templateName, languageCode = 'en_US', parameters = [], conversationId } = params;
    const cleanTo = to.replace(/[^0-9]/g, '');

    // 1. Verify Clinic Integration
    const integration = await this.prisma.whatsappIntegration.findUnique({
      where: { clinicId },
    });

    if (!integration || integration.status !== 'CONNECTED') {
      throw new BadRequestException('Clinic WhatsApp integration is not connected or active');
    }

    // 2. Verify or resolve Contact & Consent
    let contact = await this.prisma.whatsappContact.findUnique({
      where: { clinicId_waId: { clinicId, waId: cleanTo } },
    });

    if (contact && contact.consentStatus === 'OPTED_OUT') {
      throw new BadRequestException('Recipient has opted out of WhatsApp messages. Delivery blocked.');
    }

    // 3. Decrypt Access Token & Dispatch via Meta API
    const accessToken = this.encryptionService.decrypt(integration.accessTokenEncrypted);
    const metaResponse = await this.metaClient.sendTemplateMessage(
      integration.phoneNumberId,
      accessToken,
      cleanTo,
      templateName,
      languageCode,
      parameters,
    );

    const providerMessageId = metaResponse.messages?.[0]?.id || `tpl-${Date.now()}`;
    const now = new Date();

    // 4. Ensure Contact exists
    if (!contact) {
      contact = await this.prisma.whatsappContact.create({
        data: {
          organizationId: integration.organizationId,
          clinicId,
          waId: cleanTo,
          consentStatus: 'UNKNOWN',
          lastOutboundAt: now,
        },
      });
    }

    // 5. Ensure Conversation exists
    let conversation = null;
    if (conversationId) {
      conversation = await this.prisma.whatsappConversation.findUnique({
        where: { id: conversationId },
      });
    }

    if (!conversation) {
      conversation = await this.prisma.whatsappConversation.findFirst({
        where: { clinicId, contactId: contact.id },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (!conversation) {
      conversation = await this.prisma.whatsappConversation.create({
        data: {
          organizationId: integration.organizationId,
          clinicId,
          contactId: contact.id,
          status: 'OPEN',
          lastMessagePreview: `Template: ${templateName}`,
          unreadCount: 0,
        },
      });
    }

    // 6. Persist Outbound Template Message
    const savedMessage = await this.prisma.whatsappMessage.create({
      data: {
        organizationId: integration.organizationId,
        clinicId,
        conversationId: conversation.id,
        contactId: contact.id,
        providerMessageId,
        direction: 'OUTBOUND',
        messageType: 'template',
        templateName,
        templateParams: { parameters },
        body: `[Template: ${templateName}]`,
        status: 'SENT',
        sentAt: now,
      },
    });

    // 7. Update conversation & contact timestamps
    await this.prisma.whatsappConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessagePreview: `Template: ${templateName}`,
      },
    });

    await this.prisma.whatsappContact.update({
      where: { id: contact.id },
      data: { lastOutboundAt: now },
    });

    return savedMessage;
  }
}
