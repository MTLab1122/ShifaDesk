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
  BadRequestException,
} from '@nestjs/common';
import { FollowupService } from '../services/followup.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createFollowupSchema,
  updateFollowupSchema,
  queryFollowupsSchema,
} from '@matabai/validation';

@Controller('encounters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FollowupController {
  constructor(private readonly followupService: FollowupService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Post(':encounterId/followups')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async createFollowup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('encounterId') encounterId: string,
    @Body() body: any,
  ) {
    const payload = { ...body, encounterId };
    const validated = createFollowupSchema.parse(payload);
    return this.followupService.createFollowup(
      encounterId,
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Patch('followups/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async updateFollowup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const validated = updateFollowupSchema.parse(body);
    return this.followupService.updateFollowup(
      id,
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Get('followups')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async queryFollowups(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: unknown,
  ) {
    const validated = queryFollowupsSchema.parse(query);
    return this.followupService.queryFollowups(this.getOrgId(user), validated);
  }
}
