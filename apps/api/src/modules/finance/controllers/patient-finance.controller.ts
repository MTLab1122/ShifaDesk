import {
  Controller,
  Get,
  Param,
  UseGuards,
  Res,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole, Invoice as SharedInvoice, Payment as SharedPayment } from '@matabai/shared';
import { PrismaService } from '../../../common/database/prisma.service';
import { ReceiptService } from '../services/receipt.service';

@Controller('patient/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientFinanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Get('invoices')
  @Roles(UserRole.PATIENT, UserRole.SUPER_ADMIN)
  async getPatientInvoices(@CurrentUser() user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findFirst({
      where: { userProfileId: user.id },
    });

    if (!patient) {
      return [];
    }

    return this.prisma.invoice.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: {
        clinic: true,
        items: true,
        payments: true,
      },
    });
  }

  @Get('invoices/:id')
  @Roles(UserRole.PATIENT, UserRole.SUPER_ADMIN)
  async getPatientInvoiceById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { userProfileId: user.id },
    });

    if (!patient) {
      throw new NotFoundException('Patient record not found');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, patientId: patient.id },
      include: {
        clinic: true,
        items: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  @Get('payments')
  @Roles(UserRole.PATIENT, UserRole.SUPER_ADMIN)
  async getPatientPayments(@CurrentUser() user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findFirst({
      where: { userProfileId: user.id },
    });

    if (!patient) {
      return [];
    }

    return this.prisma.payment.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: { select: { invoiceReference: true, totalMinor: true } },
      },
    });
  }

  @Get('invoices/:id/pdf')
  @Roles(UserRole.PATIENT, UserRole.SUPER_ADMIN)
  async downloadInvoicePdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { userProfileId: user.id },
    });

    if (!patient) {
      throw new NotFoundException('Patient record not found');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, patientId: patient.id },
      include: {
        clinic: true,
        items: true,
        patient: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

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

  @Get('receipts/:paymentId')
  @Roles(UserRole.PATIENT, UserRole.SUPER_ADMIN)
  async downloadReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Res() res: Response,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { userProfileId: user.id },
    });

    if (!patient) {
      throw new NotFoundException('Patient record not found');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, patientId: patient.id },
      include: {
        invoice: { include: { clinic: true, items: true, patient: true } },
        collectedBy: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

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
