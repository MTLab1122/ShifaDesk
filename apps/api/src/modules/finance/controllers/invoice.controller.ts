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
import { UserRole, Invoice as SharedInvoice } from '@matabai/shared';
import { InvoiceService } from '../services/invoice.service';
import { ReceiptService } from '../services/receipt.service';
import {
  createInvoiceSchema,
  cancelInvoiceSchema,
  queryInvoicesSchema,
} from '@matabai/validation';

@Controller('finance/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async queryInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = queryInvoicesSchema.parse(query);
    return this.invoiceService.queryInvoices(user.organizationId!, validated);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async createInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = createInvoiceSchema.parse(body);
    return this.invoiceService.createInvoice(user.organizationId!, validated, user.id);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async getInvoiceById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoiceService.getInvoiceById(user.organizationId!, id);
  }

  @Post(':id/issue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async issueInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoiceService.issueInvoice(user.organizationId!, id, user.id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async cancelInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const validated = cancelInvoiceSchema.parse(body);
    return this.invoiceService.cancelInvoice(user.organizationId!, id, validated, user.id);
  }

  @Get(':id/print/a4')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async printA4Invoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoiceService.getInvoiceById(user.organizationId!, id);
    const html = this.receiptService.generateA4InvoiceHtml(
      invoice as unknown as SharedInvoice,
      invoice.clinic.name,
      invoice.clinic.phone || '+92 51 111 222 333',
      invoice.clinic.address || 'Islamabad, Pakistan',
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get(':id/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST)
  async streamInvoicePdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoiceService.getInvoiceById(user.organizationId!, id);
    const pdfBuffer = this.receiptService.generateSyntheticInvoicePdf(
      invoice as unknown as SharedInvoice,
      invoice.clinic.name,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoice.invoiceReference}.pdf"`,
    );
    res.send(pdfBuffer);
  }
}
