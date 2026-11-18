import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAnalyticsService } from './services/communication-analytics.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('Communication & AI Usage Analytics', () => {
  let commService: CommunicationAnalyticsService;
  let mockPrisma: any;

  const mockOrgId = 'org-comm-ai';
  const mockClinicId = 'clinic-comm-ai';

  beforeEach(async () => {
    mockPrisma = {
      whatsappMessage: {
        findMany: jest.fn(),
      },
      whatsappConversation: {
        count: jest.fn(),
      },
      voiceCallSession: {
        findMany: jest.fn(),
      },
      aiInteractionLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      aiToolExecutionLog: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    commService = module.get<CommunicationAnalyticsService>(CommunicationAnalyticsService);
  });

  describe('getCommunicationAnalytics', () => {
    it('should calculate WhatsApp delivery success rate and voice call metrics', async () => {
      mockPrisma.whatsappMessage.findMany.mockResolvedValue([
        { direction: 'INBOUND', status: 'RECEIVED' },
        { direction: 'OUTBOUND', status: 'DELIVERED' },
        { direction: 'OUTBOUND', status: 'READ' },
        { direction: 'OUTBOUND', status: 'FAILED' },
      ]);
      mockPrisma.whatsappConversation.count.mockResolvedValue(12);
      mockPrisma.aiInteractionLog.count.mockResolvedValue(2);

      mockPrisma.voiceCallSession.findMany.mockResolvedValue([
        {
          callStatus: 'COMPLETED',
          durationSeconds: 120,
          handoverStatus: 'NONE',
          selectedLanguage: 'ur',
          detectedLanguage: 'ur',
        },
        {
          callStatus: 'COMPLETED',
          durationSeconds: 60,
          handoverStatus: 'TRANSFERRED',
          selectedLanguage: 'en',
          detectedLanguage: 'en',
        },
        {
          callStatus: 'NO_ANSWER',
          durationSeconds: 0,
          handoverStatus: 'NONE',
          selectedLanguage: 'ur',
          detectedLanguage: 'ur',
        },
      ]);

      const result = await commService.getCommunicationAnalytics(mockOrgId, mockClinicId);

      // WhatsApp metrics: 1 inbound, 3 outbound (2 delivered/read, 1 failed) -> 66.7% success
      expect(result.whatsapp.inboundMessages).toBe(1);
      expect(result.whatsapp.outboundMessages).toBe(3);
      expect(result.whatsapp.deliverySuccessRate).toBe(66.7);
      expect(result.whatsapp.failedMessages).toBe(1);
      expect(result.whatsapp.conversations).toBe(12);
      expect(result.whatsapp.humanHandovers).toBe(2);

      // Voice metrics: 3 calls (2 completed, 1 missed, 1 transferred)
      expect(result.voice.totalCalls).toBe(3);
      expect(result.voice.completedCalls).toBe(2);
      expect(result.voice.missedCalls).toBe(1);
      expect(result.voice.transferredCalls).toBe(1);
      // Avg duration of completed calls: (120 + 60) / 2 = 90 seconds
      expect(result.voice.avgDurationSeconds).toBe(90);
      expect(result.voice.languageDistribution).toEqual({ ur: 2, en: 1 });
    });
  });

  describe('getAIUsageAnalytics', () => {
    it('should compute AI interaction volume, tool success rates, and token costs', async () => {
      mockPrisma.aiInteractionLog.findMany.mockResolvedValue([
        {
          detectedIntent: 'BOOK_APPOINTMENT',
          outcome: 'TOOL_EXECUTED',
          inputTokens: 150,
          outputTokens: 50,
          estimatedCost: 0.15,
        },
        {
          detectedIntent: 'FAQ_CLINIC_TIMINGS',
          outcome: 'RESPONDED',
          inputTokens: 100,
          outputTokens: 40,
          estimatedCost: 0.10,
        },
        {
          detectedIntent: 'COMPLAINT',
          outcome: 'HANDOVER',
          inputTokens: 200,
          outputTokens: 80,
          estimatedCost: 0.25,
        },
      ]);

      mockPrisma.aiToolExecutionLog.findMany.mockResolvedValue([
        { toolName: 'bookAppointment', executionStatus: 'SUCCESS' },
        { toolName: 'checkDoctorAvailability', executionStatus: 'SUCCESS' },
        { toolName: 'bookAppointment', executionStatus: 'FAILED' },
      ]);

      const ai = await commService.getAIUsageAnalytics(mockOrgId, mockClinicId);

      expect(ai.totalInteractions).toBe(3);
      expect(ai.intentDistribution['BOOK_APPOINTMENT']).toBe(1);
      expect(ai.intentDistribution['FAQ_CLINIC_TIMINGS']).toBe(1);
      expect(ai.intentDistribution['COMPLAINT']).toBe(1);

      // Handover: 1 out of 3 = 33.3%
      expect(ai.handoverCount).toBe(1);
      expect(ai.handoverRate).toBe(33.3);

      // Tool executions: 3 total, 2 success = 66.7%
      expect(ai.toolExecutionsCount).toBe(3);
      expect(ai.toolExecutionSuccessRate).toBe(66.7);
      expect(ai.appointmentBookingsAttempted).toBe(2);
      expect(ai.appointmentBookingsCompleted).toBe(1);

      // Tokens & Cost
      expect(ai.totalInputTokens).toBe(450);
      expect(ai.totalOutputTokens).toBe(170);
      expect(ai.totalTokens).toBe(620);
      expect(ai.estimatedCostPkr).toBe(0.5);
    });
  });
});
