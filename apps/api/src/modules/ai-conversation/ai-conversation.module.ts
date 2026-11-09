import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { AppointmentModule } from '../appointment/appointment.module';
import { QueueModule } from '../queue/queue.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

import { AiConfigService } from './ai-config.service';
import { AiProviderClient } from './ai-provider.client';
import { MultilingualNluService } from './multilingual-nlu.service';
import { AiToolsService } from './ai-tools.service';
import { AiFaqService } from './ai-faq.service';
import { AIConversationManagerService } from './ai-conversation-manager.service';

import { AiAssistantController } from './ai-assistant.controller';
import { AiFaqController } from './ai-faq.controller';

@Module({
  imports: [
    DatabaseModule,
    AppointmentModule,
    QueueModule,
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [
    AiAssistantController,
    AiFaqController,
  ],
  providers: [
    AiConfigService,
    AiProviderClient,
    MultilingualNluService,
    AiToolsService,
    AiFaqService,
    AIConversationManagerService,
  ],
  exports: [
    AIConversationManagerService,
    AiToolsService,
    MultilingualNluService,
    AiFaqService,
    AiConfigService,
  ],
})
export class AIConversationModule {}
