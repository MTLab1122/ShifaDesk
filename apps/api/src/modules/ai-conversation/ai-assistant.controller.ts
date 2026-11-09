import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { AiConfigService } from './ai-config.service';
import { AIConversationManagerService } from './ai-conversation-manager.service';
import {
  updateAiAssistantSettingsSchema,
  queryAiInteractionsSchema,
  UpdateAiAssistantSettingsInput,
} from '@matabai/validation';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAssistantController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: AiConfigService,
    private readonly conversationManager: AIConversationManagerService,
  ) {}

  @Get('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId = clinicId || user.clinicId;
    let settings = await this.prisma.aiAssistantSettings.findFirst({
      where: {
        organizationId: user.organizationId || '',
        ...(targetClinicId ? { clinicId: targetClinicId } : {}),
      },
    });

    if (!settings && targetClinicId) {
      settings = await this.prisma.aiAssistantSettings.create({
        data: {
          organizationId: user.organizationId || '',
          clinicId: targetClinicId,
          assistantName: 'ShifaDesk Multilingual Receptionist',
          enabled: true,
          defaultLanguage: 'UR',
          supportedLanguages: ['EN', 'UR', 'PS'],
        },
      });
    }

    return settings;
  }

  @Patch('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateAiAssistantSettingsInput,
  ) {
    const validated = updateAiAssistantSettingsSchema.parse(body);
    const targetClinicId = validated.clinicId || user.clinicId;

    if (!targetClinicId) {
      throw new NotFoundException('Clinic ID is required to update AI settings');
    }

    const existing = await this.prisma.aiAssistantSettings.findUnique({
      where: { clinicId: targetClinicId },
    });

    if (!existing) {
      return this.prisma.aiAssistantSettings.create({
        data: {
          organizationId: user.organizationId || '',
          clinicId: targetClinicId,
          ...validated,
        },
      });
    }

    return this.prisma.aiAssistantSettings.update({
      where: { clinicId: targetClinicId },
      data: validated,
    });
  }

  @Post('settings/enable')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.OK)
  async enableAssistant(
    @CurrentUser() user: AuthenticatedUser,
    @Body('clinicId') clinicId?: string,
  ) {
    const targetClinicId = clinicId || user.clinicId;
    if (!targetClinicId) throw new NotFoundException('Clinic ID required');

    return this.prisma.aiAssistantSettings.upsert({
      where: { clinicId: targetClinicId },
      create: {
        organizationId: user.organizationId || '',
        clinicId: targetClinicId,
        enabled: true,
      },
      update: { enabled: true },
    });
  }

  @Post('settings/disable')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.OK)
  async disableAssistant(
    @CurrentUser() user: AuthenticatedUser,
    @Body('clinicId') clinicId?: string,
  ) {
    const targetClinicId = clinicId || user.clinicId;
    if (!targetClinicId) throw new NotFoundException('Clinic ID required');

    return this.prisma.aiAssistantSettings.upsert({
      where: { clinicId: targetClinicId },
      create: {
        organizationId: user.organizationId || '',
        clinicId: targetClinicId,
        enabled: false,
      },
      update: { enabled: false },
    });
  }

  @Get('interactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async listInteractions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    const validated = queryAiInteractionsSchema.parse(query);
    const skip = (validated.page - 1) * validated.limit;

    const where: any = { organizationId: user.organizationId || '' };
    if (validated.clinicId) where.clinicId = validated.clinicId;
    if (validated.conversationId) where.conversationId = validated.conversationId;
    if (validated.outcome) where.outcome = validated.outcome;
    if (validated.detectedIntent) where.detectedIntent = validated.detectedIntent;

    const [items, total] = await Promise.all([
      this.prisma.aiInteractionLog.findMany({
        where,
        skip,
        take: validated.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiInteractionLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: validated.page,
      limit: validated.limit,
      totalPages: Math.ceil(total / validated.limit),
    };
  }

  @Get('tool-executions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async listToolExecutions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string,
    @Query('conversationId') conversationId?: string,
    @Query('toolName') toolName?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = { organizationId: user.organizationId || '' };
    if (clinicId) where.clinicId = clinicId;
    if (conversationId) where.conversationId = conversationId;
    if (toolName) where.toolName = toolName;

    const [items, total] = await Promise.all([
      this.prisma.aiToolExecutionLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiToolExecutionLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Get('usage')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getUsageStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string,
  ) {
    const where: any = { organizationId: user.organizationId || '' };
    if (clinicId) where.clinicId = clinicId;

    const logs = await this.prisma.aiInteractionLog.findMany({
      where,
      select: {
        detectedLanguage: true,
        detectedIntent: true,
        outcome: true,
        latencyMs: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
      },
    });

    const totalInteractions = logs.length;
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let handoverCount = 0;
    const langMap: Record<string, number> = {};
    const intentMap: Record<string, number> = {};

    for (const log of logs) {
      totalTokens += (log.inputTokens || 0) + (log.outputTokens || 0);
      totalCost += log.estimatedCost || 0;
      totalLatency += log.latencyMs || 0;
      if (log.outcome === 'HANDOVER' || log.outcome === 'ESCALATED_HANDOVER') {
        handoverCount++;
      }
      langMap[log.detectedLanguage] = (langMap[log.detectedLanguage] || 0) + 1;
      intentMap[log.detectedIntent] = (intentMap[log.detectedIntent] || 0) + 1;
    }

    const topIntents = Object.entries(intentMap)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalInteractions,
      totalTokens,
      estimatedCostUsd: Number(totalCost.toFixed(4)),
      averageLatencyMs: totalInteractions > 0 ? Math.round(totalLatency / totalInteractions) : 0,
      handoverRatePercentage:
        totalInteractions > 0 ? Number(((handoverCount / totalInteractions) * 100).toFixed(1)) : 0,
      languageBreakdown: langMap,
      topIntents,
    };
  }

  @Get('health')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getHealth() {
    const config = this.configService.getConfig();
    return {
      configured: Boolean(config.apiKey),
      provider: config.provider,
      model: config.model,
      status: config.apiKey ? 'ACTIVE' : 'OFFLINE_RULE_BASED',
      rateLimitStatus: 'HEALTHY',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  @Get('conversations/:id/state')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async getConversationState(
    @Param('id') conversationId: string,
  ) {
    const state = await this.prisma.aiConversationState.findUnique({
      where: { conversationId },
      include: {
        conversation: {
          include: { contact: true },
        },
      },
    });

    if (!state) {
      throw new NotFoundException(`Conversation state not found for ID ${conversationId}`);
    }

    return state;
  }

  @Post('conversations/:id/reset')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async resetConversationState(
    @Param('id') conversationId: string,
  ) {
    const state = await this.prisma.aiConversationState.findUnique({
      where: { conversationId },
    });

    if (!state) throw new NotFoundException('State not found');

    return this.prisma.aiConversationState.update({
      where: { conversationId },
      data: {
        conversationContext: {},
        currentIntent: null,
        currentStep: null,
        handoverRequired: false,
        lastActivityAt: new Date(),
      },
    });
  }

  @Post('conversations/:id/test')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.OK)
  async testConversationInteraction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body('message') message: string,
    @Body('clinicId') clinicId?: string,
  ) {
    const targetClinicId = clinicId || user.clinicId;
    if (!targetClinicId) throw new NotFoundException('Clinic ID required');

    const conversation = await this.prisma.whatsappConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.conversationManager.handleInboundInteraction({
      organizationId: user.organizationId || '',
      clinicId: targetClinicId,
      conversationId,
      contactId: conversation.contactId,
      messageBody: message || 'Hello',
    });
  }
}
