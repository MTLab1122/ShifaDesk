import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';

// Services
import { DashboardService } from './services/dashboard.service';
import { AppointmentAnalyticsService } from './services/appointment-analytics.service';
import { QueueAnalyticsService } from './services/queue-analytics.service';
import { PatientAnalyticsService } from './services/patient-analytics.service';
import { DoctorStaffAnalyticsService } from './services/doctor-staff-analytics.service';
import { LaboratoryAnalyticsService } from './services/laboratory-analytics.service';
import { FinancialAnalyticsService } from './services/financial-analytics.service';
import { CommunicationAnalyticsService } from './services/communication-analytics.service';
import { ReportBuilderService } from './services/report-builder.service';
import { ReportExportService } from './services/report-export.service';
import { ScheduledReportService } from './services/scheduled-report.service';

// Controllers
import { AnalyticsController } from './controllers/analytics.controller';
import { ReportController } from './controllers/report.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController, ReportController],
  providers: [
    DashboardService,
    AppointmentAnalyticsService,
    QueueAnalyticsService,
    PatientAnalyticsService,
    DoctorStaffAnalyticsService,
    LaboratoryAnalyticsService,
    FinancialAnalyticsService,
    CommunicationAnalyticsService,
    ReportBuilderService,
    ReportExportService,
    ScheduledReportService,
  ],
  exports: [
    DashboardService,
    AppointmentAnalyticsService,
    QueueAnalyticsService,
    PatientAnalyticsService,
    DoctorStaffAnalyticsService,
    LaboratoryAnalyticsService,
    FinancialAnalyticsService,
    CommunicationAnalyticsService,
    ReportBuilderService,
    ReportExportService,
    ScheduledReportService,
  ],
})
export class AnalyticsModule {}
