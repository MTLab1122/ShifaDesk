import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PatientClinicalHistoryService } from '../services/patient-clinical-history.service';
import { PatientMedicalHistoryService } from '../services/patient-medical-history.service';
import { ObservationService } from '../services/observation.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { saveMedicalHistorySchema } from '@matabai/validation';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientHistoryController {
  constructor(
    private readonly clinicalHistoryService: PatientClinicalHistoryService,
    private readonly medicalHistoryService: PatientMedicalHistoryService,
    private readonly observationService: ObservationService,
  ) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Get(':id/clinical-history')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getClinicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') patientId: string,
  ) {
    return this.clinicalHistoryService.getPatientClinicalHistory(
      patientId,
      this.getOrgId(user),
    );
  }

  @Get(':id/medical-history')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getMedicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') patientId: string,
  ) {
    return this.medicalHistoryService.getMedicalHistory(
      patientId,
      this.getOrgId(user),
    );
  }

  @Post(':id/medical-history')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async saveMedicalHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') patientId: string,
    @Body() body: unknown,
  ) {
    const validated = saveMedicalHistorySchema.parse(body);
    return this.medicalHistoryService.saveMedicalHistory(
      patientId,
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Get(':id/observations')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getPatientObservations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') patientId: string,
  ) {
    return this.observationService.getObservationsForPatient(
      patientId,
      this.getOrgId(user),
    );
  }
}
