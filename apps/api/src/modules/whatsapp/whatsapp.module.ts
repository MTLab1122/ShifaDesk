import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppIntegrationController } from './whatsapp-integration.controller';
import { WhatsAppConversationController } from './whatsapp-conversation.controller';
import { MetaApiClient } from './meta-api.client';
import { WhatsAppEncryptionService } from './whatsapp-encryption.service';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { WhatsAppOutboundService } from './whatsapp-outbound.service';
import { WhatsAppConversationService } from './whatsapp-conversation.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { DatabaseModule } from '../../common/database/database.module';
import { AIConversationModule } from '../ai-conversation/ai-conversation.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AIConversationModule),
  ],
  controllers: [
    WhatsAppWebhookController,
    WhatsAppIntegrationController,
    WhatsAppConversationController,
  ],
  providers: [
    MetaApiClient,
    WhatsAppEncryptionService,
    WhatsAppInboundService,
    WhatsAppOutboundService,
    WhatsAppConversationService,
    WhatsAppNotificationService,
  ],
  exports: [
    WhatsAppNotificationService,
    WhatsAppOutboundService,
    WhatsAppConversationService,
    MetaApiClient,
  ],
})
export class WhatsAppModule {}
