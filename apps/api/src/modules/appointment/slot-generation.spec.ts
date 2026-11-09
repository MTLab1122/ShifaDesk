import { Test, TestingModule } from '@nestjs/testing';
import { SlotGenerationService } from './slot-generation.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('Phase 4: Slot Generation Engine Unit Tests', () => {
  let service: SlotGenerationService;

  const mockDoctor = {
    id: 'doc-1',
    organizationId: 'org-1',
    clinicId: 'clinic-1',
    status: 'ACTIVE',
  };

  const mockClinic = {
    id: 'clinic-1',
    organizationId: 'org-1',
    timezone: 'Asia/Karachi',
    status: 'ACTIVE',
  };

  // Monday = dayOfWeek 1
  // We'll test with future date "2030-01-07" which is a Monday
  const futureMonday = '2030-01-07';

  const mockWorkingHours = [
    {
      id: 'wh-1',
      doctorId: 'doc-1',
      clinicId: 'clinic-1',
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '11:00',
      slotDurationMinutes: 30,
      breakStartTime: null,
      breakEndTime: null,
      isActive: true,
    },
  ];

  const mockPrisma = {
    doctor: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'doc-1') return Promise.resolve(mockDoctor);
        return Promise.resolve(null);
      }),
    },
    clinic: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'clinic-1') return Promise.resolve(mockClinic);
        return Promise.resolve(null);
      }),
    },
    doctorClinicAssignment: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    doctorScheduleException: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    doctorWorkingHours: {
      findMany: jest.fn().mockResolvedValue(mockWorkingHours),
    },
    appointment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotGenerationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SlotGenerationService>(SlotGenerationService);
    jest.clearAllMocks();
  });

  it('1. generates valid consultation slots for normal working hours', async () => {
    const slots = await service.generateSlots('clinic-1', 'doc-1', futureMonday);
    // 09:00 - 11:00 with 30m slot duration -> 4 slots
    expect(slots).toHaveLength(4);
    expect(slots[0]).toEqual({
      date: futureMonday,
      startTime: '09:00',
      endTime: '09:30',
      timezone: 'Asia/Karachi',
      isAvailable: true,
    });
    expect(slots[3]).toEqual({
      date: futureMonday,
      startTime: '10:30',
      endTime: '11:00',
      timezone: 'Asia/Karachi',
      isAvailable: true,
    });
  });

  it('2. supports multiple working periods in a single day', async () => {
    mockPrisma.doctorWorkingHours.findMany.mockResolvedValueOnce([
      {
        id: 'wh-morning',
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        slotDurationMinutes: 30,
        breakStartTime: null,
        breakEndTime: null,
        isActive: true,
      },
      {
        id: 'wh-afternoon',
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        dayOfWeek: 1,
        startTime: '14:00',
        endTime: '15:00',
        slotDurationMinutes: 30,
        breakStartTime: null,
        breakEndTime: null,
        isActive: true,
      },
    ]);

    const slots = await service.generateSlots('clinic-1', 'doc-1', futureMonday);
    expect(slots).toHaveLength(4);
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '09:30', '14:00', '14:30']);
  });

  it('3. excludes break periods from bookable slots', async () => {
    mockPrisma.doctorWorkingHours.findMany.mockResolvedValueOnce([
      {
        id: 'wh-break',
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '12:00',
        slotDurationMinutes: 30,
        breakStartTime: '10:00',
        breakEndTime: '11:00', // 10:00 - 11:00 is lunch/break
        isActive: true,
      },
    ]);

    const slots = await service.generateSlots('clinic-1', 'doc-1', futureMonday);
    // Total 6 potential slots (09:00, 09:30, 10:00, 10:30, 11:00, 11:30) minus 2 break slots = 4
    expect(slots).toHaveLength(4);
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '09:30', '11:00', '11:30']);
  });

  it('4. returns empty slots when doctor has UNAVAILABLE exception (leave/holiday)', async () => {
    mockPrisma.doctorScheduleException.findUnique.mockResolvedValueOnce({
      id: 'exc-1',
      doctorId: 'doc-1',
      clinicId: 'clinic-1',
      exceptionDate: futureMonday,
      exceptionType: 'UNAVAILABLE',
      reason: 'Doctor annual conference leave',
    });

    const slots = await service.generateSlots('clinic-1', 'doc-1', futureMonday);
    expect(slots).toEqual([]);
  });

  it('5. applies CUSTOM_HOURS exception overriding normal schedule', async () => {
    mockPrisma.doctorScheduleException.findUnique.mockResolvedValueOnce({
      id: 'exc-custom',
      doctorId: 'doc-1',
      clinicId: 'clinic-1',
      exceptionDate: futureMonday,
      exceptionType: 'CUSTOM_HOURS',
      startTime: '15:00',
      endTime: '16:00',
      reason: 'Special evening OPD',
    });

    const slots = await service.generateSlots('clinic-1', 'doc-1', futureMonday);
    // 15:00 - 16:00 with default 20m slots -> 3 slots: 15:00, 15:20, 15:40
    expect(slots).toHaveLength(3);
    expect(slots[0]?.startTime).toBe('15:00');
    expect(slots[2]?.startTime).toBe('15:40');
  });

  it('6. excludes already booked non-cancelled appointment slots', async () => {
    mockPrisma.appointment.findMany.mockResolvedValueOnce([
      {
        startTime: '09:30',
        endTime: '10:00',
      },
    ]);

    const slots = await service.generateSlots('clinic-1', 'doc-1', futureMonday);
    // 4 slots minus 09:30 booked slot -> 3 slots
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '10:00', '10:30']);
  });

  it('7. returns empty array for past dates', async () => {
    const slots = await service.generateSlots('clinic-1', 'doc-1', '2020-01-01');
    expect(slots).toEqual([]);
  });

  it('8. returns empty array for inactive doctor or inactive clinic', async () => {
    mockPrisma.doctor.findUnique.mockResolvedValueOnce({
      ...mockDoctor,
      status: 'INACTIVE',
    });

    const slots = await service.generateSlots('clinic-1', 'doc-1', futureMonday);
    expect(slots).toEqual([]);
  });
});
