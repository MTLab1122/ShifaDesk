import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { NotificationModule } from '../notification/notification.module';

// Services
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { RefundService } from './services/refund.service';
import { ExpenseService } from './services/expense.service';
import { CashRegisterService } from './services/cash-register.service';
import { ReconciliationService } from './services/reconciliation.service';
import { FinancialAnalyticsService } from './services/financial-analytics.service';
import { ReceiptService } from './services/receipt.service';
import { FinancialAuditService } from './services/financial-audit.service';

// Adapters
import { RaastPaymentAdapter } from './adapters/raast-payment.adapter';
import { CardPaymentAdapter } from './adapters/card-payment.adapter';
import { BankTransferAdapter } from './adapters/bank-transfer.adapter';

// Controllers
import { InvoiceController } from './controllers/invoice.controller';
import { PaymentController } from './controllers/payment.controller';
import { RefundController } from './controllers/refund.controller';
import { ExpenseController } from './controllers/expense.controller';
import { CashRegisterController } from './controllers/cash-register.controller';
import { FinancialAnalyticsController } from './controllers/financial-analytics.controller';
import { PatientFinanceController } from './controllers/patient-finance.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [
    InvoiceController,
    PaymentController,
    RefundController,
    ExpenseController,
    CashRegisterController,
    FinancialAnalyticsController,
    PatientFinanceController,
    PaymentWebhookController,
  ],
  providers: [
    InvoiceService,
    PaymentService,
    RefundService,
    ExpenseService,
    CashRegisterService,
    ReconciliationService,
    FinancialAnalyticsService,
    ReceiptService,
    FinancialAuditService,
    RaastPaymentAdapter,
    CardPaymentAdapter,
    BankTransferAdapter,
  ],
  exports: [
    InvoiceService,
    PaymentService,
    RefundService,
    ExpenseService,
    CashRegisterService,
    ReceiptService,
    FinancialAnalyticsService,
  ],
})
export class FinanceModule {}
