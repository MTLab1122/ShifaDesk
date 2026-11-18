import {
  Controller,
  Get,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { PatientClinicalHistoryService } from '../services/patient-clinical-history.service';
import { PrescriptionService } from '../services/prescription.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';

@Controller('patient/clinical')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientClinicalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicalHistoryService: PatientClinicalHistoryService,
    private readonly prescriptionService: PrescriptionService,
  ) {}

  private async getPatientRecord(user: AuthenticatedUser) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { userProfileId: user.id },
          { email: user.email },
        ],
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient record not found for the authenticated user');
    }

    return patient;
  }

  @Get('encounters')
  @Roles(UserRole.PATIENT, UserRole.SUPER_ADMIN)
  async getMyEncounters(@CurrentUser() user: AuthenticatedUser) {
    const patient = await this.getPatientRecord(user);
    return this.clinicalHistoryService.getPatientFacingEncounters(
      patient.id,
      patient.organizationId,
    );
  }

  @Get('prescriptions')
  @Roles(UserRole.PATIENT, UserRole.SUPER_ADMIN)
  async getMyPrescriptions(@CurrentUser() user: AuthenticatedUser) {
    const patient = await this.getPatientRecord(user);
    return this.prescriptionService.queryPrescriptions(patient.organizationId, {
      patientId: patient.id,
      page: 1,
      limit: 100,
      sortOrder: 'desc',
    });
  }
}
