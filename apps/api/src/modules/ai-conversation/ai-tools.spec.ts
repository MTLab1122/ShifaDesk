import { AiToolsService } from './ai-tools.service';

describe('AiToolsService - 11 Allowlisted Server Tools', () => {
  let toolsService: AiToolsService;
  let mockPrisma: any;
  let mockSlotService: any;
  let mockAppointmentService: any;

  beforeEach(() => {
    mockPrisma = {
      clinic: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'clinic-1',
          name: 'Shifa Central Clinic',
          address: 'Main Blue Area, Islamabad',
          phone: '051-111-222',
          email: 'info@shifa.pk',
          timezone: 'Asia/Karachi',
          organizationId: 'org-1',
        }),
      },
      doctor: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'doc-1', fullName: 'Dr. Sarah Khan', specialty: 'Cardiology', qualification: 'MBBS, FCPS', consultationFee: 2000 },
        ]),
      },
      appointment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'apt-1',
          patientId: 'pat-1',
          clinicId: 'clinic-1',
          organizationId: 'org-1',
          status: 'CONFIRMED',
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'apt-1', appointmentNumber: 'APT-2026-0001', appointmentDate: '2026-11-15' },
        ]),
      },
      queueToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tok-1',
          tokenDisplay: 'A005',
          status: 'WAITING',
          queueSession: { doctor: { fullName: 'Dr. Sarah Khan' } },
        }),
      },
      clinicQueueSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'sess-1',
          currentTokenNumber: 3,
          tokens: [{ id: 'tok-2' }, { id: 'tok-3' }],
          doctor: { fullName: 'Dr. Sarah Khan' },
        }),
      },
      clinicFaq: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'faq-1',
            questionEn: 'What are clinic timings?',
            answerEn: 'Open Monday to Saturday 9am to 9pm',
            questionUr: 'کلینک کے اوقات کیا ہیں؟',
            answerUr: 'پیر تا ہفتہ صبح 9 سے رات 9 بجے تک',
          },
        ]),
      },
      whatsappConversation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'conv-1', organizationId: 'org-1', clinicId: 'clinic-1' }),
        update: jest.fn().mockResolvedValue({ id: 'conv-1', status: 'HUMAN_HANDOVER' }),
      },
      aiToolExecutionLog: {
        create: jest.fn().mockResolvedValue({ id: 'tool-log-1' }),
      },
    };

    mockSlotService = {
      generateSlots: jest.fn().mockResolvedValue([
        { startTime: '10:00', endTime: '10:15', isAvailable: true },
        { startTime: '10:15', endTime: '10:30', isAvailable: false },
      ]),
    };

    mockAppointmentService = {
      create: jest.fn().mockResolvedValue({
        id: 'apt-created-1',
        appointmentNumber: 'APT-2026-0042',
        appointmentDate: '2026-11-15',
        startTime: '10:00',
        endTime: '10:15',
      }),
      reschedule: jest.fn().mockResolvedValue({
        id: 'apt-1',
        appointmentDate: '2026-11-16',
        startTime: '11:00',
      }),
      cancel: jest.fn().mockResolvedValue({
        success: true,
        message: 'Appointment cancelled successfully. Slot has been released.',
        appointment: {
          id: 'apt-1',
          status: 'CANCELLED',
        },
      }),
    };

    toolsService = new AiToolsService(mockPrisma, mockSlotService, mockAppointmentService);
  });

  it('Tool 1: getClinicInformation should return clinic and log execution', async () => {
    const clinic = await toolsService.getClinicInformation('conv-1', 'clinic-1');
    expect(clinic.name).toBe('Shifa Central Clinic');
    expect(mockPrisma.aiToolExecutionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          toolName: 'get_clinic_information',
          executionStatus: 'SUCCESS',
        }),
      }),
    );
  });

  it('Tool 2: searchDoctors should filter doctors and log execution', async () => {
    const docs = await toolsService.searchDoctors('conv-1', 'clinic-1', 'Cardiology');
    expect(docs).toHaveLength(1);
    expect(docs[0]!.fullName).toBe('Dr. Sarah Khan');
  });

  it('Tool 3: getDoctorAvailability should return available slots', async () => {
    const avail = await toolsService.getDoctorAvailability('conv-1', 'clinic-1', 'doc-1', '2026-11-15');
    expect(avail.totalAvailable).toBe(1);
    expect(avail.slots[0]!.startTime).toBe('10:00');
  });

  it('Tool 4: createAppointment should book slot and log execution', async () => {
    const apt = await toolsService.createAppointment('conv-1', {
      clinicId: 'clinic-1',
      doctorId: 'doc-1',
      patientId: 'pat-1',
      date: '2026-11-15',
      startTime: '10:00',
      endTime: '10:15',
    });
    expect(apt.appointmentNumber).toBe('APT-2026-0042');
    expect(mockAppointmentService.create).toHaveBeenCalled();
  });

  it('Tool 5: getPatientAppointments should return list of patient appointments', async () => {
    const list = await toolsService.getPatientAppointments('conv-1', 'pat-1', 'clinic-1');
    expect(list).toHaveLength(1);
  });

  it('Tool 6: rescheduleAppointment should update appointment', async () => {
    const res = await toolsService.rescheduleAppointment('conv-1', 'apt-1', '2026-11-16', '11:00', '11:15');
    expect(res.appointmentDate).toBe('2026-11-16');
  });

  it('Tool 7: cancelAppointment should cancel appointment', async () => {
    const res = await toolsService.cancelAppointment('conv-1', 'apt-1', 'Patient request');
    expect(res.appointment.status).toBe('CANCELLED');
  });

  it('Tool 8: getPatientToken should return active token for patient', async () => {
    const token = await toolsService.getPatientToken('conv-1', 'pat-1', 'clinic-1');
    expect(token?.tokenDisplay).toBe('A005');
  });

  it('Tool 9: getQueueStatus should return active queue session info', async () => {
    const status = await toolsService.getQueueStatus('conv-1', 'clinic-1');
    expect(status.activeSession).toBe(true);
    expect(status.currentServingToken).toBe('A003');
    expect(status.waitingCount).toBe(2);
  });

  it('Tool 10: searchClinicFaq should return localized FAQ answer', async () => {
    const faq = await toolsService.searchClinicFaq('conv-1', 'timings', 'clinic-1', 'ur');
    expect(faq?.answer).toContain('صبح 9 سے رات 9 بجے تک');
  });

  it('Tool 11: requestHumanHandover should update conversation to HUMAN_HANDOVER', async () => {
    const res = await toolsService.requestHumanHandover('conv-1', 'Patient requested agent');
    expect(res.success).toBe(true);
    expect(mockPrisma.whatsappConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'HUMAN_HANDOVER',
        }),
      }),
    );
  });
});
