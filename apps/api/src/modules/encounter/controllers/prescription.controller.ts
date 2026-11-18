import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrescriptionService } from '../services/prescription.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createPrescriptionSchema,
  amendPrescriptionSchema,
  cancelPrescriptionSchema,
  queryPrescriptionsSchema,
} from '@matabai/validation';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async createPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = createPrescriptionSchema.parse(body);
    return this.prescriptionService.createPrescription(
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.LAB_STAFF,
    UserRole.ACCOUNTANT,
  )
  async queryPrescriptions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: unknown,
  ) {
    const validated = queryPrescriptionsSchema.parse(query);
    return this.prescriptionService.queryPrescriptions(this.getOrgId(user), validated);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.LAB_STAFF,
    UserRole.ACCOUNTANT,
  )
  async getPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.prescriptionService.getPrescription(id, this.getOrgId(user));
  }

  @Post(':id/amend')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async amendPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const validated = amendPrescriptionSchema.parse(body);
    return this.prescriptionService.amendPrescription(
      id,
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Post(':id/cancel')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async cancelPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const validated = cancelPrescriptionSchema.parse(body);
    return this.prescriptionService.cancelPrescription(
      id,
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Get(':id/print')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.PATIENT,
  )
  async printPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.prescriptionService.generatePrescriptionHtml(
      id,
      this.getOrgId(user),
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Get(':id/html')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.PATIENT,
  )
  async getPrescriptionHtml(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const html = await this.prescriptionService.generatePrescriptionHtml(
      id,
      this.getOrgId(user),
    );
    return { html };
  }
}
