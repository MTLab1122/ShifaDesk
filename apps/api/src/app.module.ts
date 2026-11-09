import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './common/config/env.config';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './modules/health/health.module';

// Architectural Module Boundaries
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { ClinicModule } from './modules/clinic/clinic.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { PatientModule } from './modules/patient/patient.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { QueueModule } from './modules/queue/queue.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AIConversationModule } from './modules/ai-conversation/ai-conversation.module';
import { NotificationModule } from './modules/notification/notification.module';
import { LaboratoryModule } from './modules/laboratory/laboratory.module';
import { ReportModule } from './modules/report/report.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    HealthModule,

    // Architectural modules
    AuthModule,
    TenantModule,
    ClinicModule,
    DoctorModule,
    PatientModule,
    AppointmentModule,
    QueueModule,
    WhatsAppModule,
    AIConversationModule,
    NotificationModule,
    LaboratoryModule,
    ReportModule,
    AuditModule,
  ],
})
export class AppModule {}
