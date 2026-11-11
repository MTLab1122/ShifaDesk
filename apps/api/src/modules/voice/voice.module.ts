import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { AIConversationModule } from '../ai-conversation/ai-conversation.module';
import { NotificationModule } from '../notification/notification.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { QueueModule } from '../queue/queue.module';

// Adapters
import { TwilioVoiceAdapter } from './adapters/twilio-voice.adapter';

// Services
import { VoiceCallSessionService } from './voice-call-session.service';
import { VoiceIvrService } from './voice-ivr.service';
import { VoiceAiReceptionistService } from './voice-ai-receptionist.service';
import { VoiceHandoverService } from './voice-handover.service';
import { VoiceAnalyticsService } from './voice-analytics.service';
import { VoiceIntegrationService } from './voice-integration.service';
import { VoiceSettingsService } from './voice-settings.service';
import { VoiceSimulatorService } from './voice-simulator.service';

// Controllers
import { VoiceWebhookController } from './voice-webhook.controller';
import { VoiceCallController } from './voice-call.controller';
import { VoiceAnalyticsController } from './voice-analytics.controller';
import { VoiceSettingsController } from './voice-settings.controller';
import { VoiceIntegrationController } from './voice-integration.controller';
import { VoiceSimulatorController } from './voice-simulator.controller';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AIConversationModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => AppointmentModule),
    forwardRef(() => QueueModule),
  ],
  controllers: [
    VoiceWebhookController,
    VoiceCallController,
    VoiceAnalyticsController,
    VoiceSettingsController,
    VoiceIntegrationController,
    VoiceSimulatorController,
  ],
  providers: [
    TwilioVoiceAdapter,
    VoiceCallSessionService,
    VoiceIvrService,
    VoiceAiReceptionistService,
    VoiceHandoverService,
    VoiceAnalyticsService,
    VoiceIntegrationService,
    VoiceSettingsService,
    VoiceSimulatorService,
  ],
  exports: [
    TwilioVoiceAdapter,
    VoiceCallSessionService,
    VoiceIvrService,
    VoiceAiReceptionistService,
    VoiceHandoverService,
    VoiceAnalyticsService,
    VoiceIntegrationService,
    VoiceSettingsService,
    VoiceSimulatorService,
  ],
})
export class VoiceModule {}

