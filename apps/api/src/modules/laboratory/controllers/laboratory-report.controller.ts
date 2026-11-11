import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { LaboratoryReportService } from '../services/laboratory-report.service';
import { LaboratoryDeliveryService } from '../services/laboratory-delivery.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  approveLabReportSchema,
  releaseLabReportSchema,
  revokeReportAccessSchema,
  queryLabReportsSchema,
  ApproveLabReportInput,
  ReleaseLabReportInput,
  RevokeReportAccessInput,
} from '@matabai/validation';

@Controller('laboratory/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaboratoryReportController {
  constructor(
    private readonly reportService: LaboratoryReportService,
    private readonly deliveryService: LaboratoryDeliveryService,
  ) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async listReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    const validated = queryLabReportsSchema.parse(query);
    return this.reportService.listReports(this.getOrgId(user), validated);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getReportById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.reportService.getReportById(this.getOrgId(user), id);
  }

  @Post('generate/:orderId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
  )
  @HttpCode(HttpStatus.CREATED)
  async generateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.reportService.generateReport(this.getOrgId(user), orderId, user.id);
  }

  @Post('upload/:orderId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
  )
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string },
    @Body('base64Content') base64Content?: string,
    @Body('fileName') bodyFileName?: string,
  ) {
    let buffer: Buffer;
    let fileName: string;

    if (file && file.buffer) {
      buffer = file.buffer;
      fileName = file.originalname;
    } else if (base64Content) {
      buffer = Buffer.from(base64Content, 'base64');
      fileName = bodyFileName || 'uploaded-report.pdf';
    } else {
      throw new BadRequestException('No PDF file payload provided');
    }

    return this.reportService.uploadReport(
      this.getOrgId(user),
      orderId,
      buffer,
      fileName,
      user.id,
    );
  }

  @Post(':id/approve')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async approveReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ApproveLabReportInput,
  ) {
    const validated = approveLabReportSchema.parse(body);
    return this.reportService.approveReport(
      this.getOrgId(user),
      id,
      validated.comments,
      user.id,
    );
  }

  @Post(':id/release')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  async releaseReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReleaseLabReportInput,
  ) {
    const validated = releaseLabReportSchema.parse(body);
    return this.reportService.releaseReport(
      this.getOrgId(user),
      id,
      validated.notes,
      validated.sendNotification,
      user.id,
    );
  }

  @Post(':id/access-token')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_STAFF,
    UserRole.RECEPTIONIST,
  )
  @HttpCode(HttpStatus.CREATED)
  async createAccessToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('expiresInHours') expiresInHours?: number,
  ) {
    return this.deliveryService.createAccessToken(
      this.getOrgId(user),
      id,
      expiresInHours || 168,
      user.id,
    );
  }

  @Post(':id/revoke-access')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  async revokeAccessToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RevokeReportAccessInput,
  ) {
    const validated = revokeReportAccessSchema.parse(body);
    return this.deliveryService.revokeAccessTokens(
      this.getOrgId(user),
      id,
      validated.revocationReason,
      user.id,
    );
  }

  @Post(':id/resend')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.LAB_STAFF,
  )
  @HttpCode(HttpStatus.OK)
  async resendNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.deliveryService.dispatchReportReadyNotification(
      this.getOrgId(user),
      id,
      user.id,
    );
    return { success: true, message: 'Delivery notification re-enqueued successfully' };
  }

  @Get(':id/download')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async downloadReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = await this.reportService.downloadReport(this.getOrgId(user), id);

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
