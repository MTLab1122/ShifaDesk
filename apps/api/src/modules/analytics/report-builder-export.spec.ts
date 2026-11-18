import { Test, TestingModule } from '@nestjs/testing';
import { ReportBuilderService } from './services/report-builder.service';
import { ReportExportService } from './services/report-export.service';
import { ScheduledReportService } from './services/scheduled-report.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AnalyticsCategory, ReportExportFormat } from '@matabai/shared';

describe('Report Builder & Export & Scheduling', () => {
  let builderService: ReportBuilderService;
  let exportService: ReportExportService;
  let scheduledService: ScheduledReportService;
  let mockPrisma: any;

  const mockOrgId = 'org-rep-101';
  const mockUserId = 'usr-admin-1';

  beforeEach(async () => {
    mockPrisma = {
      savedReportConfiguration: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      scheduledReport: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      scheduledReportRun: {
        create: jest.fn(),
        update: jest.fn(),
      },
      analyticsExportLog: {
        create: jest.fn().mockResolvedValue({ id: 'export-log-1' }),
      },
      appointment: {
        findMany: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
      },
      laboratoryOrder: {
        findMany: jest.fn(),
      },
      clinicalEncounter: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportBuilderService,
        ReportExportService,
        ScheduledReportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    builderService = module.get<ReportBuilderService>(ReportBuilderService);
    exportService = module.get<ReportExportService>(ReportExportService);
    scheduledService = module.get<ScheduledReportService>(ScheduledReportService);
  });

  describe('ReportExportService Formula Injection Defense', () => {
    it('should sanitize cell values starting with =, +, -, @, \\t, \\r to prevent Excel macro execution', () => {
      expect(exportService.sanitizeFormulaInjection('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(exportService.sanitizeFormulaInjection('+100')).toBe("'+100");
      expect(exportService.sanitizeFormulaInjection('-50')).toBe("'-50");
      expect(exportService.sanitizeFormulaInjection('@cmd|/c calc.exe!A0')).toBe("'@cmd|/c calc.exe!A0");
      expect(exportService.sanitizeFormulaInjection('\tTabInjection')).toBe("'\tTabInjection");
      expect(exportService.sanitizeFormulaInjection('Safe Normal Text')).toBe('Safe Normal Text');
    });

    it('should generate valid sanitized CSV buffer with UTF-8 BOM', () => {
      const sampleResult = {
        columns: [
          { key: 'name', label: 'Doctor Name', type: 'string' as const },
          { key: 'count', label: 'Visits', type: 'number' as const },
        ],
        rows: [
          { name: '=cmd|calc', count: 12 },
          { name: 'Dr. Sarah', count: 25 },
        ],
        totalRows: 2,
        generatedAt: '2026-11-18T10:00:00Z',
      };

      const buffer = exportService.generateCsv(sampleResult, 'Doctor Activity Report');
      const csvString = buffer.toString('utf-8');

      // Must start with UTF-8 BOM
      expect(csvString.charCodeAt(0)).toBe(0xfeff);
      // Malicious value must be escaped with single quote
      expect(csvString).toContain("\"'=cmd|calc\"");
      expect(csvString).toContain('"Dr. Sarah"');
    });
  });

  describe('ReportBuilderService', () => {
    it('should create and list saved report configurations', async () => {
      const mockConfig = {
        id: 'cfg-1',
        organizationId: mockOrgId,
        clinicId: null,
        name: 'Weekly Financial Breakdown',
        description: 'Revenue by clinic',
        category: AnalyticsCategory.FINANCE,
        dimensions: ['clinic', 'date'],
        metrics: ['revenuePaisa', 'outstandingPaisa'],
        filtersJson: {},
        grouping: 'CLINIC',
        createdById: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.savedReportConfiguration.create.mockResolvedValue(mockConfig);
      mockPrisma.savedReportConfiguration.findMany.mockResolvedValue([mockConfig]);

      const created = await builderService.createConfiguration(mockOrgId, mockUserId, {
        name: 'Weekly Financial Breakdown',
        category: AnalyticsCategory.FINANCE,
        dimensions: ['clinic', 'date'],
        metrics: ['revenuePaisa', 'outstandingPaisa'],
      });

      expect(created.id).toBe('cfg-1');
      expect(created.name).toBe('Weekly Financial Breakdown');

      const list = await builderService.listConfigurations(mockOrgId);
      expect(list).toHaveLength(1);
      expect(list[0]?.dimensions).toEqual(['clinic', 'date']);
    });
  });

  describe('ScheduledReportService', () => {
    it('should execute scheduled report, generate file, and record run', async () => {
      const mockSched = {
        id: 'sched-1',
        organizationId: mockOrgId,
        clinicId: null,
        reportConfigurationId: 'cfg-1',
        name: 'Daily Appointments Summary',
        frequency: 'DAILY',
        recipients: ['admin@shifadesk.com'],
        exportFormat: ReportExportFormat.CSV,
        status: 'ACTIVE',
        lastRunAt: null,
        nextRunAt: new Date(),
        createdById: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        reportConfiguration: {
          id: 'cfg-1',
          organizationId: mockOrgId,
          clinicId: null,
          name: 'Appointments Config',
          category: AnalyticsCategory.APPOINTMENTS,
          dimensions: ['status'],
          metrics: ['totalAppointments'],
          filtersJson: {},
        },
      };

      mockPrisma.scheduledReport.findFirst.mockResolvedValue(mockSched);
      mockPrisma.scheduledReportRun.create.mockResolvedValue({ id: 'run-1' });
      mockPrisma.scheduledReportRun.update.mockResolvedValue({
        id: 'run-1',
        runStatus: 'SUCCESS',
        rowCount: 5,
      });
      mockPrisma.scheduledReport.update.mockResolvedValue(mockSched);

      // Mock appointment data returned by builder
      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          appointmentNumber: 'APT-100',
          appointmentDate: '2026-11-18',
          startTime: '09:00',
          status: 'COMPLETED',
          bookingSource: 'WALK_IN',
          doctor: { fullName: 'Dr. Sarah', specialty: 'General' },
          clinic: { name: 'Main' },
        },
      ]);

      const run = await scheduledService.executeScheduledReport('sched-1', mockOrgId);

      expect(run).toBeDefined();
      expect(mockPrisma.scheduledReportRun.create).toHaveBeenCalled();
      expect(mockPrisma.scheduledReportRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: expect.objectContaining({
            runStatus: 'SUCCESS',
          }),
        }),
      );
      expect(mockPrisma.scheduledReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-1' },
          data: expect.objectContaining({
            lastRunAt: expect.any(Date),
            nextRunAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
