import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { WhatsAppOutboundService } from './whatsapp-outbound.service';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';

export interface QueryConversationsParams {
  clinicId: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class WhatsAppConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboundService: WhatsAppOutboundService,
  ) {}

  /**
   * List conversations for a clinic with filters and pagination
   */
  async findConversations(_user: AuthenticatedUser, params: QueryConversationsParams) {
    const { clinicId, status, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { clinicId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { lastMessagePreview: { contains: search, mode: 'insensitive' } },
        { contact: { waId: { contains: search } } },
        { contact: { profileName: { contains: search, mode: 'insensitive' } } },
        { contact: { patient: { fullName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.whatsappConversation.findMany({
        where,
        include: {
          contact: {
            include: {
              patient: {
                select: { id: true, fullName: true, patientNumber: true, phone: true },
              },
            },
          },
          assignedUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsappConversation.count({ where }),
    ]);

    const enrichedItems = items.map((conv) => ({
      ...conv,
      isWithin24HourWindow: this.outboundService.isWithin24HourWindow(conv.lastCustomerMessageAt),
    }));

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single conversation details with complete message thread
   */
  async getConversationById(_user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: {
          include: {
            patient: true,
          },
        },
        assignedUser: {
          select: { id: true, fullName: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('WhatsApp conversation not found');
    }

    return {
      ...conversation,
      isWithin24HourWindow: this.outboundService.isWithin24HourWindow(conversation.lastCustomerMessageAt),
    };
  }

  /**
   * Staff reply to patient conversation
   */
  async replyToConversation(
    _user: AuthenticatedUser,
    conversationId: string,
    message: string,
  ) {
    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Outbound text message within 24-hr window
    return this.outboundService.sendTextMessage({
      clinicId: conversation.clinicId,
      to: conversation.contact.waId,
      message,
      conversationId: conversation.id,
    });
  }

  /**
   * Receptionist claims conversation from Human Handover queue
   */
  async claimConversation(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: {
        assignedUserId: user.id,
      },
      include: {
        assignedUser: { select: { id: true, fullName: true, email: true } },
        contact: true,
      },
    });
  }

  /**
   * Mark conversation resolved
   */
  async resolveConversation(_user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        unreadCount: 0,
      },
    });
  }

  /**
   * Reopen a resolved or closed conversation
   */
  async reopenConversation(_user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.whatsappConversation.update({
      where: { id: conversationId },
      data: {
        status: 'OPEN',
        resolvedAt: null,
      },
    });
  }

  /**
   * Manually update patient WhatsApp opt-in/opt-out consent
   */
  async updateContactConsent(
    _user: AuthenticatedUser,
    contactId: string,
    consentStatus: 'UNKNOWN' | 'OPTED_IN' | 'OPTED_OUT',
    optOutReason?: string,
  ) {
    const contact = await this.prisma.whatsappContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('WhatsApp contact not found');
    }

    return this.prisma.whatsappContact.update({
      where: { id: contactId },
      data: {
        consentStatus,
        optOutReason: consentStatus === 'OPTED_OUT' ? optOutReason || 'STAFF_MANUAL_OPT_OUT' : null,
        consentUpdatedAt: new Date(),
      },
    });
  }
}
