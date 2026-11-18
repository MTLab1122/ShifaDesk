import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { analyticsFilterSchema } from '@matabai/validation';

import { DashboardService } from '../services/dashboard.service';
import { AppointmentAnalyticsService } from '../services/appointment-analytics.service';
import { QueueAnalyticsService } from '../services/queue-analytics.service';
import { PatientAnalyticsService } from '../services/patient-analytics.service';
import { DoctorStaffAnalyticsService } from '../services/doctor-staff-analytics.service';
import { LaboratoryAnalyticsService } from '../services/laboratory-analytics.service';
import { FinancialAnalyticsService } from '../services/financial-analytics.service';
import { CommunicationAnalyticsService } from '../services/communication-analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly appointmentService: AppointmentAnalyticsService,
    private readonly queueService: QueueAnalyticsService,
    private readonly patientService: PatientAnalyticsService,
    private readonly staffService: DoctorStaffAnalyticsService,
    private readonly labService: LaboratoryAnalyticsService,
    private readonly financeService: FinancialAnalyticsService,
    private readonly commService: CommunicationAnalyticsService,
  ) {}

  @Get('dashboard')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.ACCOUNTANT,
    UserRole.LAB_MANAGER,
  )
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
    @Req() req: Request,
  ) {
    const validated = analyticsFilterSchema.parse(query);
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.dashboardService.getExecutiveMetrics(
      user.organizationId!,
      validated.clinicId || undefined,
      validated.period,
      validated.startDate,
      validated.endDate,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Get('appointments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST)
  async getAppointments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = analyticsFilterSchema.parse(query);
    return this.appointmentService.getAppointmentAnalytics(
      user.organizationId!,
      validated.clinicId || undefined,
      validated.doctorId || undefined,
      validated.period,
      validated.startDate,
      validated.endDate,
    );
  }

  @Get('queue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST)
  async getQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = analyticsFilterSchema.parse(query);
    return this.queueService.getQueueAnalytics(
      user.organizationId!,
      validated.clinicId || undefined,
      validated.doctorId || undefined,
      validated.period,
      validated.startDate,
      validated.endDate,
    );
  }

  @Get('patients')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST)
  async getPatients(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = analyticsFilterSchema.parse(query);
    return this.patientService.getPatientAnalytics(
      user.organizationId!,
      validated.clinicId || undefined,
      validated.period,
      validated.startDate,
      validated.endDate,
    );
  }

  @Get('staff')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR)
  async getStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = analyticsFilterSchema.parse(query);
    return this.staffService.getStaffAnalytics(
      user.organizationId!,
      validated.clinicId || undefined,
      validated.period,
      validated.startDate,
      validated.endDate,
    );
  }

  @Get('laboratory')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_STAFF,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_MANAGER,
  )
  async getLaboratory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = analyticsFilterSchema.parse(query);
    return this.labService.getLaboratoryAnalytics(
      user.organizationId!,
      validated.clinicId || undefined,
      validated.period,
      validated.startDate,
      validated.endDate,
    );
  }

  @Get('finance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT)
  async getFinance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = analyticsFilterSchema.parse(query);
    return this.financeService.getFinancialAnalytics(
      user.organizationId!,
      validated.clinicId || undefined,
      validated.period,
      validated.startDate,
      validated.endDate,
    );
  }

  @Get('communications')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getCommunications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = analyticsFilterSchema.parse(query);
    return this.commService.getCommunicationAnalytics(
      user.organizationId!,
      validated.clinicId || undefined,
      validated.period,
      validated.startDate,
      validated.endDate,
    );
  }

  @Get('ai-usage')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getAIUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const validated = analyticsFilterSchema.parse(query);
    return this.commService.getAIUsageAnalytics(
      user.organizationId!,
      validated.clinicId || undefined,
      validated.period,
      validated.startDate,
      validated.endDate,
    );
  }
}
