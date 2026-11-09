import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppConversationService } from './whatsapp-conversation.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  updateWhatsappConsentSchema,
  UpdateWhatsappConsentInput,
} from '@matabai/validation';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppConversationController {
  constructor(private readonly conversationService: WhatsAppConversationService) {}

  @Get('conversations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationService.findConversations(user, {
      clinicId,
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('conversations/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async getConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.conversationService.getConversationById(user, id);
  }

  @Post('conversations/:id/messages')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.CREATED)
  async replyToConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('message') message: string,
  ) {
    return this.conversationService.replyToConversation(user, id, message);
  }

  @Post('conversations/:id/claim')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async claimConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.conversationService.claimConversation(user, id);
  }

  @Post('conversations/:id/resolve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async resolveConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.conversationService.resolveConversation(user, id);
  }

  @Post('conversations/:id/reopen')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async reopenConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.conversationService.reopenConversation(user, id);
  }

  @Post('contacts/:id/consent')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async updateConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateWhatsappConsentInput,
  ) {
    const validated = updateWhatsappConsentSchema.parse(body);
    return this.conversationService.updateContactConsent(
      user,
      id,
      validated.consentStatus as any,
      validated.optOutReason,
    );
  }
}

