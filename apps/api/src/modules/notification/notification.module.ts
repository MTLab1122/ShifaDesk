import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

// Controllers
import { NotificationController } from './notification.controller';
import { NotificationPreferenceController } from './notification-preference.controller';
import { NotificationRuleController } from './notification-rule.controller';
import { NotificationTemplateController } from './notification-template.controller';
import { InAppNotificationController } from './in-app-notification.controller';

// Services
import { NotificationService } from './notification.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationRulesService } from './notification-rules.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationRetryService } from './notification-retry.service';
import { NotificationWorkerService } from './notification-worker.service';

// Adapters
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { InAppAdapter } from './adapters/in-app.adapter';
import { EmailAdapter } from './adapters/email.adapter';
import { SmsAdapter } from './adapters/sms.adapter';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [
    NotificationController,
    NotificationPreferenceController,
    NotificationRuleController,
    NotificationTemplateController,
    InAppNotificationController,
  ],
  providers: [
    NotificationService,
    NotificationSchedulerService,
    NotificationDispatcherService,
    NotificationPreferenceService,
    NotificationRulesService,
    NotificationTemplateService,
    NotificationRetryService,
    NotificationWorkerService,
    WhatsAppAdapter,
    InAppAdapter,
    EmailAdapter,
    SmsAdapter,
  ],
  exports: [
    NotificationSchedulerService,
    NotificationService,
    NotificationPreferenceService,
    NotificationRulesService,
    NotificationTemplateService,
  ],
})
export class NotificationModule {}
