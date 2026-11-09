import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppIntegrationService } from './whatsapp-integration.service';
import { WhatsAppOutboundService } from './whatsapp-outbound.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createWhatsappIntegrationSchema,
  sendWhatsappTextMessageSchema,
  sendWhatsappTemplateMessageSchema,
  CreateWhatsappIntegrationInput,
  SendWhatsappTextMessageInput,
  SendWhatsappTemplateMessageInput,
} from '@matabai/validation';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppIntegrationController {
  constructor(
    private readonly integrationService: WhatsAppIntegrationService,
    private readonly outboundService: WhatsAppOutboundService,
  ) {}

  @Get('integration')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId: string,
  ) {
    return this.integrationService.getIntegration(user, clinicId);
  }

  @Post('integration')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.OK)
  async upsertIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateWhatsappIntegrationInput,
  ) {
    const validated = createWhatsappIntegrationSchema.parse(body);
    return this.integrationService.upsertIntegration(user, validated);
  }

  @Get('integration/health')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  async checkHealth(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId: string,
  ) {
    return this.integrationService.checkHealth(user, clinicId);
  }

  @Get('templates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async getTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId: string,
  ) {
    return this.integrationService.getTemplates(user, clinicId);
  }

  @Post('send-text')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async sendTextMessage(
    @CurrentUser() _user: AuthenticatedUser,
    @Body() body: SendWhatsappTextMessageInput,
  ) {
    const validated = sendWhatsappTextMessageSchema.parse(body);
    return this.outboundService.sendTextMessage(validated);
  }

  @Post('send-template')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async sendTemplateMessage(
    @CurrentUser() _user: AuthenticatedUser,
    @Body() body: SendWhatsappTemplateMessageInput,
  ) {
    const validated = sendWhatsappTemplateMessageSchema.parse(body);
    return this.outboundService.sendTemplateMessage(validated);
  }
}
