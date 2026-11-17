import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole, Invoice as SharedInvoice, Payment as SharedPayment } from '@matabai/shared';
import { PaymentService } from '../services/payment.service';
import { ReceiptService } from '../services/receipt.service';
import { RaastPaymentAdapter } from '../adapters/raast-payment.adapter';
import { CardPaymentAdapter } from '../adapters/card-payment.adapter';
import { BankTransferAdapter } from '../adapters/bank-transfer.adapter';
import { collectPaymentSchema, queryPaymentsSchema } from '@matabai/validation';

@Controller('finance/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly receiptService: ReceiptService,
    private readonly raastAdapter: RaastPaymentAdapter,
    private readonly cardAdapter: CardPaymentAdapter,
    private readonly bankAdapter: BankTransferAdapter,
  ) {}

  @Get('methods/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  getPaymentMethodsStatus() {
    return {
      cash: { enabled: true, mode: 'INSTANT_CASH_DRAWER' },
      bankTransfer: {
        enabled: true,
        details: this.bankAdapter.getClinicBankDetails(),
      },
      raast: this.raastAdapter.getStatus(),
      card: this.cardAdapter.getStatus(),
    };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async queryPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = queryPaymentsSchema.parse(query);
    return this.paymentService.queryPayments(user.organizationId!, validated);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async collectPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = collectPaymentSchema.parse(body);
    return this.paymentService.collectPayment(user.organizationId!, validated, user.id);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async getPaymentById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.getPaymentById(user.organizationId!, id);
  }

  @Get(':id/receipt')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async printThermalReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const payment = await this.paymentService.getPaymentById(user.organizationId!, id);
    const html = this.receiptService.generateThermalReceiptHtml(
      payment.invoice as unknown as SharedInvoice,
      payment as unknown as SharedPayment,
      payment.invoice.clinic.name,
      payment.invoice.clinic.phone || '+92 51 111 222 333',
      payment.invoice.clinic.address || 'Islamabad, Pakistan',
      payment.collectedBy?.fullName,
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
