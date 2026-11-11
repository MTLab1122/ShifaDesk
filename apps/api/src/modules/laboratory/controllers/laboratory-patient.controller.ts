import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../../common/database/prisma.service';
import { LaboratoryDeliveryService } from '../services/laboratory-delivery.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  verifyReportAccessSchema,
  VerifyReportAccessInput,
} from '@matabai/validation';

@Controller('patient/laboratory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaboratoryPatientController {
  constructor(private readonly prisma: PrismaService) {}

  private async getPatientIdForUser(user: AuthenticatedUser): Promise<string> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { userProfileId: user.id },
          { email: user.email },
        ],
      },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient record not found for current user');
    }

    return patient.id;
  }

  @Get('orders')
  @Roles(UserRole.PATIENT, UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getMyOrders(@CurrentUser() user: AuthenticatedUser) {
    const patientId = await this.getPatientIdForUser(user);

    return this.prisma.laboratoryOrder.findMany({
      where: { patientId },
      include: {
        clinic: { select: { id: true, name: true, phone: true } },
        orderingDoctor: { select: { id: true, fullName: true, specialty: true } },
        items: {
          select: {
            id: true,
            testNameSnapshot: true,
            testCodeSnapshot: true,
            priceSnapshot: true,
            status: true,
          },
        },
        reports: {
          where: { reportStatus: 'RELEASED' },
          select: {
            id: true,
            reportReference: true,
            version: true,
            fileName: true,
            fileSizeBytes: true,
            reportStatus: true,
            releasedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('reports')
  @Roles(UserRole.PATIENT, UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getMyReports(@CurrentUser() user: AuthenticatedUser) {
    const patientId = await this.getPatientIdForUser(user);

    return this.prisma.laboratoryReport.findMany({
      where: {
        order: { patientId },
        reportStatus: 'RELEASED',
      },
      include: {
        order: {
          select: {
            id: true,
            orderReference: true,
            clinic: { select: { name: true } },
            orderingDoctor: { select: { fullName: true } },
          },
        },
      },
      orderBy: { releasedAt: 'desc' },
    });
  }
}

/**
 * Public Diagnostic Report Access Controller
 * Secured via 256-bit unguessable tokens + patient identity verification
 */
@Controller('public/reports')
export class LaboratoryPublicAccessController {
  constructor(private readonly deliveryService: LaboratoryDeliveryService) {}

  @Post('access/:token/verify')
  @HttpCode(HttpStatus.OK)
  async verifyAccess(
    @Param('token') token: string,
    @Body() body: VerifyReportAccessInput,
    @Req() req: Request,
  ) {
    const validated = verifyReportAccessSchema.parse(body);
    const clientInfo = {
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const reportFile = await this.deliveryService.verifyPatientIdentityAndGetReport(
      token,
      validated,
      clientInfo,
    );

    return {
      verified: true,
      reportReference: reportFile.reportReference,
      fileName: reportFile.fileName,
      fileSizeBytes: reportFile.buffer.length,
    };
  }

  @Post('access/:token/stream')
  @HttpCode(HttpStatus.OK)
  async streamReportPost(
    @Param('token') token: string,
    @Body() body: VerifyReportAccessInput,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const validated = verifyReportAccessSchema.parse(body);
    const clientInfo = {
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const file = await this.deliveryService.verifyPatientIdentityAndGetReport(
      token,
      validated,
      clientInfo,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${file.fileName}"`,
      'Content-Length': file.buffer.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, private',
    });

    res.end(file.buffer);
  }

  @Get('access/:token/stream')
  async streamReportGet(
    @Param('token') token: string,
    @Query('phone') phoneNumber: string,
    @Query('dobYear') yearOfBirth: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const validated = verifyReportAccessSchema.parse({
      phoneNumber,
      yearOfBirth: yearOfBirth ? Number(yearOfBirth) : undefined,
    });

    const clientInfo = {
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const file = await this.deliveryService.verifyPatientIdentityAndGetReport(
      token,
      validated,
      clientInfo,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${file.fileName}"`,
      'Content-Length': file.buffer.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, private',
    });

    res.end(file.buffer);
  }
}
