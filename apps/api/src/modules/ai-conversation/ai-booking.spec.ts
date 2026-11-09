import { MultilingualNluService } from './multilingual-nlu.service';
import { AIConversationManagerService } from './ai-conversation-manager.service';
import { AiOutcome } from '@matabai/shared';

describe('AI Multi-Turn Appointment Booking Engine', () => {
  let nluService: MultilingualNluService;
  let manager: AIConversationManagerService;
  let mockPrisma: any;
  let mockTools: any;
  let mockConfig: any;
  let mockOutbound: any;

  beforeEach(() => {
    nluService = new MultilingualNluService();

    mockPrisma = {
      aiAssistantSettings: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'settings-1',
          clinicId: 'clinic-1',
          enabled: true,
          defaultLanguage: 'EN',
          supportedLanguages: ['EN', 'UR', 'PS'],
        }),
      },
      whatsappConversation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conv-1',
          clinicId: 'clinic-1',
          status: 'OPEN',
          contact: { id: 'contact-1', waId: '923001234567', patientId: 'patient-1', consentStatus: 'OPTED_IN' },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      aiConversationState: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'state-1',
          conversationId: 'conv-1',
          conversationContext: {},
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      aiInteractionLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
      patient: {
        create: jest.fn().mockResolvedValue({ id: 'new-pat-1' }),
      },
    };

    mockTools = {
      searchDoctors: jest.fn().mockResolvedValue([
        { id: 'doc-1', fullName: 'Dr. Sarah Khan', specialty: 'Cardiology' },
      ]),
      getDoctorAvailability: jest.fn().mockResolvedValue({
        doctorId: 'doc-1',
        date: '2026-11-15',
        totalAvailable: 2,
        slots: [
          { startTime: '10:00', endTime: '10:15', isAvailable: true },
          { startTime: '10:30', endTime: '10:45', isAvailable: true },
        ],
      }),
      createAppointment: jest.fn().mockResolvedValue({
        id: 'apt-1',
        appointmentNumber: 'APT-2026-0099',
        appointmentDate: '2026-11-15',
        startTime: '10:00',
        endTime: '10:15',
      }),
    };

    mockConfig = {
      getConfig: jest.fn().mockReturnValue({ provider: 'offline_rule_engine', model: 'mock' }),
      estimateCost: jest.fn().mockReturnValue(0.0001),
    };

    mockOutbound = {
      sendTextMessage: jest.fn().mockResolvedValue({ id: 'out-1' }),
    };

    manager = new AIConversationManagerService(
      mockPrisma,
      nluService,
      mockTools,
      mockConfig,
      mockOutbound,
    );
  });

  it('Turn 1: should resolve doctor and ask for preferred date', async () => {
    const result = await manager.handleInboundInteraction({
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      conversationId: 'conv-1',
      messageBody: 'I would like to book an appointment with Dr. Sarah Khan',
    });

    expect(result.response).toContain('Which date would you prefer for Dr. Sarah Khan?');
    expect(mockPrisma.aiConversationState.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStep: 'SELECT_DATE',
          conversationContext: expect.objectContaining({
            doctorId: 'doc-1',
            doctorName: 'Dr. Sarah Khan',
          }),
        }),
      }),
    );
  });

  it('Turn 2: should present available time slots when date is provided', async () => {
    // Simulate state already having doctorId & doctorName
    mockPrisma.aiConversationState.findUnique.mockResolvedValueOnce({
      id: 'state-1',
      conversationId: 'conv-1',
      conversationContext: {
        doctorId: 'doc-1',
        doctorName: 'Dr. Sarah Khan',
        activeStep: 'SELECT_DATE',
      },
    });

    const result = await manager.handleInboundInteraction({
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      conversationId: 'conv-1',
      messageBody: '2026-11-15 please',
    });

    expect(result.response).toContain('Available appointment slots on 2026-11-15:');
    expect(result.response).toContain('10:00');
    expect(mockPrisma.aiConversationState.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStep: 'SELECT_SLOT',
        }),
      }),
    );
  });

  it('Turn 3: should require EXPLICIT confirmation when slot is selected', async () => {
    mockPrisma.aiConversationState.findUnique.mockResolvedValueOnce({
      id: 'state-1',
      conversationId: 'conv-1',
      conversationContext: {
        doctorId: 'doc-1',
        doctorName: 'Dr. Sarah Khan',
        date: '2026-11-15',
        activeStep: 'SELECT_SLOT',
      },
    });

    const result = await manager.handleInboundInteraction({
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      conversationId: 'conv-1',
      messageBody: '10:00 am',
    });

    // Verify summary is shown and booking is NOT yet executed
    expect(result.response).toContain('Please verify your appointment details:');
    expect(result.response).toContain('Doctor: Dr. Sarah Khan');
    expect(result.response).toContain('Date: 2026-11-15');
    expect(result.response).toContain('Time: 10:00');
    expect(result.response).toContain('Please reply "YES" to confirm or "NO" to cancel');
    expect(mockTools.createAppointment).not.toHaveBeenCalled();

    expect(mockPrisma.aiConversationState.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentStep: 'AWAITING_CONFIRMATION',
          conversationContext: expect.objectContaining({
            pendingConfirmation: true,
          }),
        }),
      }),
    );
  });

  it('Turn 4a: should book appointment on explicit confirmation ("yes")', async () => {
    mockPrisma.aiConversationState.findUnique.mockResolvedValueOnce({
      id: 'state-1',
      conversationId: 'conv-1',
      conversationContext: {
        doctorId: 'doc-1',
        doctorName: 'Dr. Sarah Khan',
        date: '2026-11-15',
        time: '10:00',
        endTime: '10:15',
        pendingConfirmation: true,
        activeStep: 'AWAITING_CONFIRMATION',
      },
    });

    const result = await manager.handleInboundInteraction({
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      conversationId: 'conv-1',
      messageBody: 'YES',
    });

    expect(mockTools.createAppointment).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({
        doctorId: 'doc-1',
        date: '2026-11-15',
        startTime: '10:00',
      }),
    );
    expect(result.outcome).toBe(AiOutcome.TOOL_EXECUTED);
    expect(result.response).toContain('Appointment #: APT-2026-0099');
    expect(result.response).toContain('successfully booked');
  });

  it('Turn 4b: should cancel draft when user denies ("no")', async () => {
    mockPrisma.aiConversationState.findUnique.mockResolvedValueOnce({
      id: 'state-1',
      conversationId: 'conv-1',
      conversationContext: {
        doctorId: 'doc-1',
        doctorName: 'Dr. Sarah Khan',
        date: '2026-11-15',
        time: '10:00',
        pendingConfirmation: true,
        activeStep: 'AWAITING_CONFIRMATION',
      },
    });

    const result = await manager.handleInboundInteraction({
      organizationId: 'org-1',
      clinicId: 'clinic-1',
      conversationId: 'conv-1',
      messageBody: 'No cancel it',
    });

    expect(mockTools.createAppointment).not.toHaveBeenCalled();
    expect(result.response).toContain('Booking draft cancelled');
  });
});
