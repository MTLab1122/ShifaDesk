import { Test, TestingModule } from '@nestjs/testing';
import { SaasBillingService } from './services/saas-billing.service';
import { SaasPaymentService } from './services/saas-payment.service';
import { SubscriptionLifecycleService } from './services/subscription-lifecycle.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CardPaymentAdapter } from '../finance/adapters/card-payment.adapter';
import { SaasPaymentStatus, SaasInvoiceStatus, SaasPaymentMethod } from '@matabai/shared';

describe('SaasBillingService & SaasPaymentService', () => {
  let billingService: SaasBillingService;
  let paymentService: SaasPaymentService;
  let mockPrisma: any;
  let mockLifecycleService: any;
  let mockCardAdapter: any;

  beforeEach(async () => {
    mockPrisma = {
      subscriptionInvoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      subscriptionInvoiceItem: {
        create: jest.fn(),
      },
      subscriptionPayment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      platformAdminAuditLog: {
        create: jest.fn(),
      },
      organizationMembership: {
        findFirst: jest.fn().mockResolvedValue({ userProfileId: 'owner-1' }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockLifecycleService = {
      activateSubscription: jest.fn().mockResolvedValue({ id: 'sub-1', status: 'ACTIVE' }),
    };

    mockCardAdapter = {
      getStatus: jest.fn().mockReturnValue({ isConfigured: false, provider: 'SAFEPAY' }),
      initiateCheckout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaasBillingService,
        SaasPaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SubscriptionLifecycleService, useValue: mockLifecycleService },
        { provide: CardPaymentAdapter, useValue: mockCardAdapter },
      ],
    }).compile();

    billingService = module.get<SaasBillingService>(SaasBillingService);
    paymentService = module.get<SaasPaymentService>(SaasPaymentService);
  });

  it('should generate sequential invoice number SUB-YYYYMM-XXXX', async () => {
    mockPrisma.subscriptionInvoice.findFirst.mockResolvedValue({
      invoiceNumber: 'SUB-202611-0004',
    });

    const num = await billingService.generateInvoiceNumber();
    expect(num).toMatch(/^SUB-\d{6}-0005$/);
  });

  it('should create SaaS invoice with exact minor arithmetic in paisa', async () => {
    mockPrisma.subscriptionInvoice.findFirst.mockResolvedValue(null);
    mockPrisma.subscriptionInvoice.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'inv-created-1', ...data }),
    );

    const invoice = await billingService.createSubscriptionInvoice({
      organizationId: 'org-1',
      subscriptionId: 'sub-1',
      planVersionSnapshot: { name: 'Starter' },
      billingPeriodStart: new Date('2026-11-01'),
      billingPeriodEnd: new Date('2026-12-01'),
      subtotalPaisa: 699900,
      discountPaisa: 100000,
      taxPaisa: 0,
      description: 'Monthly Starter Subscription',
    });

    expect(invoice.subtotalPaisa).toBe(699900);
    expect(invoice.discountPaisa).toBe(100000);
    expect(invoice.totalPaisa).toBe(599900); // 6,999 - 1,000 = 5,999 PKR (599900 paisa)
    expect(invoice.outstandingPaisa).toBe(599900);
    expect(mockPrisma.subscriptionInvoiceItem.create).toHaveBeenCalled();
  });

  it('should submit manual bank transfer reference with PENDING status', async () => {
    mockPrisma.subscriptionInvoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      organizationId: 'org-1',
      status: SaasInvoiceStatus.ISSUED,
    });
    mockPrisma.subscriptionPayment.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'spay-1', ...data }),
    );

    const payment = await paymentService.submitManualPayment(
      {
        invoiceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        paymentMethod: SaasPaymentMethod.MANUAL_BANK_TRANSFER,
        paymentReference: 'TXN-MEEZAN-998877',
        amountPaisa: 599900,
      },
      { id: 'user-1', email: 'owner@clinic.pk' } as any,
    );

    expect(payment.status).toBe(SaasPaymentStatus.PENDING);
    expect(payment.paymentReference).toBe('TXN-MEEZAN-998877');
  });

  it('should verify manual payment, settle invoice, and trigger subscription activation', async () => {
    mockPrisma.subscriptionPayment.findUnique.mockResolvedValue({
      id: 'spay-1',
      paymentNumber: 'SPAY-202611-0001',
      amountPaisa: 599900,
      status: SaasPaymentStatus.PENDING,
      metadata: {},
      invoice: {
        id: 'inv-1',
        invoiceNumber: 'SUB-202611-0001',
        totalPaisa: 599900,
        amountPaidPaisa: 0,
        outstandingPaisa: 599900,
        subscriptionId: 'sub-target-1',
        organizationId: 'org-1',
      },
    });

    mockPrisma.subscriptionPayment.update.mockResolvedValue({
      id: 'spay-1',
      status: SaasPaymentStatus.COMPLETED,
    });
    mockPrisma.subscriptionInvoice.update.mockResolvedValue({
      id: 'inv-1',
      status: SaasInvoiceStatus.PAID,
      amountPaidPaisa: 599900,
      outstandingPaisa: 0,
    });

    const result = await paymentService.verifyPayment('spay-1', 'super-admin-user', 'Funds confirmed in Meezan Bank');
    expect(result.isFullyPaid).toBe(true);
    expect(mockLifecycleService.activateSubscription).toHaveBeenCalledWith('sub-target-1', 'inv-1', 'super-admin-user');
    expect(mockPrisma.platformAdminAuditLog.create).toHaveBeenCalled();
  });

  it('should mark unconfigured card payment gateway as BLOCKED without simulating payment', async () => {
    mockPrisma.subscriptionInvoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: SaasInvoiceStatus.ISSUED,
      outstandingPaisa: 599900,
    });

    const result = await paymentService.initiateCardCheckout('inv-1');
    expect(result.status).toBe('BLOCKED');
    expect(result.message).toContain('UNCONFIGURED');
  });
});
