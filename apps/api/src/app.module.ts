import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './common/config/env.config';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './modules/health/health.module';

// Phase 2 Functional Modules
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { ClinicModule } from './modules/clinic/clinic.module';
import { UserModule } from './modules/user/user.module';
import { MembershipModule } from './modules/membership/membership.module';
import { AuditModule } from './modules/audit/audit.module';

// Phase 3 Functional Clinical & Staff Modules
import { DoctorModule } from './modules/doctor/doctor.module';
import { StaffModule } from './modules/staff/staff.module';
import { PatientModule } from './modules/patient/patient.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { QueueModule } from './modules/queue/queue.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AIConversationModule } from './modules/ai-conversation/ai-conversation.module';
import { NotificationModule } from './modules/notification/notification.module';
import { VoiceModule } from './modules/voice/voice.module';
import { LaboratoryModule } from './modules/laboratory/laboratory.module';
import { ReportModule } from './modules/report/report.module';
import { FinanceModule } from './modules/finance/finance.module';
import { EncounterModule } from './modules/encounter/encounter.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SaasModule } from './modules/saas/saas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    HealthModule,

    // Phase 2 Core Modules
    AuthModule,
    TenantModule,
    ClinicModule,
    UserModule,
    MembershipModule,
    AuditModule,

    // Phase 3 Core Modules
    DoctorModule,
    StaffModule,
    PatientModule,
    AppointmentModule,
    QueueModule,
    WhatsAppModule,
    AIConversationModule,
    NotificationModule,
    VoiceModule,
    LaboratoryModule,
    ReportModule,
    FinanceModule,
    EncounterModule,
    AnalyticsModule,
    SaasModule,
  ],
})
export class AppModule {}
