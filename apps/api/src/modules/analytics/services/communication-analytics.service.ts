import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { CommunicationAnalytics, AIUsageAnalytics } from '@matabai/shared';
import { AnalyticsTimeHelper } from './analytics-time.helper';

@Injectable()
export class CommunicationAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getCommunicationAnalytics(
    organizationId: string,
    clinicId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CommunicationAnalytics> {
    const dateRange = AnalyticsTimeHelper.resolveDateRange(period, startDate, endDate);

    const orgClinicFilter: any = { organizationId };
    if (clinicId) orgClinicFilter.clinicId = clinicId;

    const dateFilter = { gte: dateRange.startDate, lte: dateRange.endDate };

    // Parallel fetch for WhatsApp messages, WhatsApp conversations, Voice calls
    const [messages, conversations, voiceCalls] = await Promise.all([
      this.prisma.whatsappMessage.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: dateFilter,
        },
        select: {
          direction: true,
          status: true,
        },
      }),
      this.prisma.whatsappConversation.count({
        where: {
          ...orgClinicFilter,
          createdAt: dateFilter,
        },
      }),
      this.prisma.voiceCallSession.findMany({
        where: {
          ...orgClinicFilter,
          startedAt: dateFilter,
        },
        select: {
          callStatus: true,
          durationSeconds: true,
          handoverStatus: true,
          selectedLanguage: true,
          detectedLanguage: true,
        },
      }),
    ]);

    // WhatsApp aggregation
    let inboundMessages = 0;
    let outboundMessages = 0;
    let deliveredOrRead = 0;
    let failedMessages = 0;

    for (const msg of messages) {
      if (msg.direction === 'INBOUND') {
        inboundMessages++;
      } else {
        outboundMessages++;
        if (msg.status === 'DELIVERED' || msg.status === 'READ') {
          deliveredOrRead++;
        } else if (msg.status === 'FAILED') {
          failedMessages++;
        }
      }
    }

    const deliverySuccessRate =
      outboundMessages > 0 ? Math.round((deliveredOrRead / outboundMessages) * 1000) / 10 : 0;

    // Handover count from AI interaction logs
    const humanHandovers = await this.prisma.aiInteractionLog.count({
      where: {
        ...orgClinicFilter,
        outcome: 'HANDOVER',
        createdAt: dateFilter,
      },
    });

    // Voice aggregation
    const totalCalls = voiceCalls.length;
    let answeredCalls = 0;
    let missedCalls = 0;
    let completedCalls = 0;
    let transferredCalls = 0;
    let totalDurationSeconds = 0;
    const languageDistribution: Record<string, number> = {};

    for (const call of voiceCalls) {
      if (call.callStatus === 'COMPLETED' || call.callStatus === 'IN_PROGRESS') {
        answeredCalls++;
      }
      if (call.callStatus === 'BUSY' || call.callStatus === 'NO_ANSWER' || call.callStatus === 'FAILED') {
        missedCalls++;
      }
      if (call.callStatus === 'COMPLETED') {
        completedCalls++;
      }
      if (call.handoverStatus === 'TRANSFERRED') {
        transferredCalls++;
      }
      totalDurationSeconds += call.durationSeconds;

      const lang = call.selectedLanguage || call.detectedLanguage || 'en';
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
    }

    const avgDurationSeconds =
      completedCalls > 0 ? Math.round(totalDurationSeconds / completedCalls) : 0;

    return {
      whatsapp: {
        inboundMessages,
        outboundMessages,
        deliverySuccessRate,
        failedMessages,
        conversations,
        humanHandovers,
      },
      voice: {
        totalCalls,
        answeredCalls,
        missedCalls,
        completedCalls,
        transferredCalls,
        avgDurationSeconds,
        languageDistribution,
      },
    };
  }

  public async getAIUsageAnalytics(
    organizationId: string,
    clinicId?: string,
    period?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AIUsageAnalytics> {
    const dateRange = AnalyticsTimeHelper.resolveDateRange(period, startDate, endDate);

    const orgClinicFilter: any = { organizationId };
    if (clinicId) orgClinicFilter.clinicId = clinicId;

    const dateFilter = { gte: dateRange.startDate, lte: dateRange.endDate };

    const [interactions, toolLogs] = await Promise.all([
      this.prisma.aiInteractionLog.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: dateFilter,
        },
        select: {
          detectedIntent: true,
          outcome: true,
          inputTokens: true,
          outputTokens: true,
          estimatedCost: true,
        },
      }),
      this.prisma.aiToolExecutionLog.findMany({
        where: {
          ...orgClinicFilter,
          createdAt: dateFilter,
        },
        select: {
          toolName: true,
          executionStatus: true,
        },
      }),
    ]);

    const totalInteractions = interactions.length;
    const intentDistribution: Record<string, number> = {};
    let handoverCount = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let estimatedCostPkr = 0;

    for (const inter of interactions) {
      const intent = inter.detectedIntent || 'UNKNOWN';
      intentDistribution[intent] = (intentDistribution[intent] || 0) + 1;

      if (inter.outcome === 'HANDOVER') {
        handoverCount++;
      }

      totalInputTokens += inter.inputTokens || 0;
      totalOutputTokens += inter.outputTokens || 0;
      estimatedCostPkr += inter.estimatedCost || 0;
    }

    const handoverRate =
      totalInteractions > 0 ? Math.round((handoverCount / totalInteractions) * 1000) / 10 : 0;

    const toolExecutionsCount = toolLogs.length;
    let toolSuccessCount = 0;
    let appointmentBookingsAttempted = 0;
    let appointmentBookingsCompleted = 0;

    for (const tool of toolLogs) {
      if (tool.executionStatus === 'SUCCESS') {
        toolSuccessCount++;
      }
      if (tool.toolName.toLowerCase().includes('appointment') || tool.toolName.toLowerCase().includes('book')) {
        appointmentBookingsAttempted++;
        if (tool.executionStatus === 'SUCCESS') {
          appointmentBookingsCompleted++;
        }
      }
    }

    const toolExecutionSuccessRate =
      toolExecutionsCount > 0 ? Math.round((toolSuccessCount / toolExecutionsCount) * 1000) / 10 : 0;

    return {
      totalInteractions,
      intentDistribution,
      toolExecutionsCount,
      toolExecutionSuccessRate,
      appointmentBookingsAttempted,
      appointmentBookingsCompleted,
      handoverCount,
      handoverRate,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      estimatedCostPkr: Math.round(estimatedCostPkr * 100) / 100,
    };
  }
}
