import { Test, TestingModule } from '@nestjs/testing';
import { FinancialAnalyticsService } from './services/financial-analytics.service';
import { LaboratoryAnalyticsService } from './services/laboratory-analytics.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('Financial & Laboratory Analytics', () => {
  let finService: FinancialAnalyticsService;
  let labService: LaboratoryAnalyticsService;
  let mockPrisma: any;

  const mockOrgId = 'org-fin-lab';
  const mockClinicId = 'clinic-fin-lab';

  beforeEach(async () => {
    mockPrisma = {
      invoice: {
        findMany: jest.fn(),
      },
      payment: {
        findMany: jest.fn(),
      },
      refund: {
        findMany: jest.fn(),
      },
      expense: {
        findMany: jest.fn(),
      },
      invoiceItem: {
        findMany: jest.fn(),
      },
      laboratoryOrder: {
        findMany: jest.fn(),
      },
      laboratorySample: {
        findMany: jest.fn(),
      },
      laboratoryReport: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialAnalyticsService,
        LaboratoryAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    finService = module.get<FinancialAnalyticsService>(FinancialAnalyticsService);
    labService = module.get<LaboratoryAnalyticsService>(LaboratoryAnalyticsService);
  });

  describe('FinancialAnalyticsService', () => {
    it('should accurately calculate financial metrics in paisa without treating invoices as cash', async () => {
      const now = new Date();

      mockPrisma.invoice.findMany.mockResolvedValue([
        { id: 'inv-1', totalMinor: 1000000, paidMinor: 1000000, outstandingMinor: 0, createdAt: now },
        { id: 'inv-2', totalMinor: 500000, paidMinor: 200000, outstandingMinor: 300000, createdAt: now },
      ]);

      mockPrisma.payment.findMany.mockResolvedValue([
        { amountMinor: 1000000, method: 'CASH', createdAt: now },
        { amountMinor: 200000, method: 'RAAST', createdAt: now },
      ]);

      mockPrisma.refund.findMany.mockResolvedValue([
        { amountMinor: 50000 },
      ]);

      mockPrisma.expense.findMany.mockResolvedValue([
        { amountMinor: 300000, category: { name: 'Medical Supplies' } },
        { amountMinor: 150000, category: { name: 'Utilities' } },
      ]);

      mockPrisma.invoiceItem.findMany.mockResolvedValue([
        { itemType: 'CONSULTATION', totalMinor: 800000 },
        { itemType: 'LAB_TEST', totalMinor: 700000 },
      ]);

      const fin = await finService.getFinancialAnalytics(mockOrgId, mockClinicId);

      // Total invoiced: 1,500,000 paisa
      expect(fin.totalInvoicedPaisa).toBe(1500000);

      // Total collected: 1,200,000 paisa (cash 1,000,000 + raast 200,000)
      expect(fin.totalCollectedPaisa).toBe(1200000);
      expect(fin.cashRegisterCollectionsPaisa).toBe(1000000);

      // Total refunds: 50,000 paisa
      expect(fin.totalRefundsPaisa).toBe(50000);

      // Total expenses: 450,000 paisa
      expect(fin.totalExpensesPaisa).toBe(450000);

      // Outstanding receivables = 1,500,000 - 1,200,000 - 50,000 = 250,000 paisa
      expect(fin.outstandingReceivablesPaisa).toBe(250000);

      // Net operating balance = collected (1,200,000) - refunds (50,000) - expenses (450,000) = 700,000 paisa
      expect(fin.netOperatingBalancePaisa).toBe(700000);

      // Breakdown by revenue stream
      expect(fin.revenueByConsultationPaisa).toBe(800000);
      expect(fin.revenueByLaboratoryPaisa).toBe(700000);
    });
  });

  describe('LaboratoryAnalyticsService', () => {
    it('should compute lab order volume, sample rejection rates, and turnaround hours', async () => {
      const orderCreatedAt = new Date('2026-11-18T08:00:00Z');
      const reportReleasedAt = new Date('2026-11-18T12:00:00Z'); // 4 hours turnaround

      mockPrisma.laboratoryOrder.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          orderStatus: 'DELIVERED',
          createdAt: orderCreatedAt,
          items: [
            { test: { category: { name: 'Hematology' } } },
          ],
          reports: [
            { reportStatus: 'RELEASED', releasedAt: reportReleasedAt },
          ],
        },
      ]);

      mockPrisma.laboratorySample.findMany.mockResolvedValue([
        { sampleStatus: 'ACCEPTED' },
        { sampleStatus: 'ACCEPTED' },
        { sampleStatus: 'REJECTED' },
        { sampleStatus: 'RECOLLECTION_REQUIRED' },
      ]);

      mockPrisma.laboratoryReport.findMany.mockResolvedValue([
        { reportStatus: 'RELEASED' },
        { reportStatus: 'PENDING_REVIEW' },
      ]);

      mockPrisma.invoiceItem.findMany.mockResolvedValue([
        { totalMinor: 250000 },
      ]);

      const lab = await labService.getLaboratoryAnalytics(mockOrgId, mockClinicId);

      expect(lab.totalOrders).toBe(1);
      expect(lab.ordersByStatus['DELIVERED']).toBe(1);
      expect(lab.ordersByCategory).toEqual([{ category: 'Hematology', count: 1 }]);

      // 4 samples: 1 rejected (25%), 1 recollection required (25%)
      expect(lab.sampleCollectionVolume).toBe(4);
      expect(lab.sampleRejectionRate).toBe(25);
      expect(lab.recollectionRate).toBe(25);

      // Turnaround time = 4 hours
      expect(lab.avgTurnaroundHours).toBe(4);
      expect(lab.reportsReleased).toBe(1);
      expect(lab.reportsPendingReview).toBe(1);
      expect(lab.revenuePaisa).toBe(250000);
    });
  });
});
