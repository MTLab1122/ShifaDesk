import { Module, forwardRef } from '@nestjs/common';
import { QueueSettingsController } from './queue-settings.controller';
import { QueueSettingsService } from './queue-settings.service';
import { QueueSessionController } from './queue-session.controller';
import { QueueSessionService } from './queue-session.service';
import { QueueTokenController } from './queue-token.controller';
import { QueueTokenService } from './queue-token.service';
import { PatientQueueController } from './patient-queue.controller';
import { PublicQueueController } from './public-queue.controller';
import { QueueRealtimeService } from './queue-realtime.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AuditModule, forwardRef(() => NotificationModule)],
  controllers: [
    QueueSettingsController,
    QueueSessionController,
    QueueTokenController,
    PatientQueueController,
    PublicQueueController,
  ],
  providers: [
    QueueRealtimeService,
    QueueSettingsService,
    QueueSessionService,
    QueueTokenService,
  ],
  exports: [
    QueueRealtimeService,
    QueueSettingsService,
    QueueSessionService,
    QueueTokenService,
  ],
})
export class QueueModule {}
