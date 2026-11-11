import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { LaboratoryResultService } from '../services/laboratory-result.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  enterLabResultSchema,
  amendLabResultSchema,
  reviewLabResultSchema,
  EnterLabResultInput,
  AmendLabResultInput,
  ReviewLabResultInput,
} from '@matabai/validation';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaboratoryResultController {
  constructor(private readonly resultService: LaboratoryResultService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Get('orders/:orderId/results')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getOrderResults(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ) {
    return this.resultService.getOrderResults(this.getOrgId(user), orderId);
  }

  @Post('order-items/:orderItemId/result')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_STAFF,
  )
  @HttpCode(HttpStatus.CREATED)
  async enterResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderItemId') orderItemId: string,
    @Body() body: EnterLabResultInput,
  ) {
    const validated = enterLabResultSchema.parse(body);
    return this.resultService.enterResult(this.getOrgId(user), orderItemId, validated, user.id);
  }

  @Patch('results/:id/amend')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_STAFF,
  )
  async amendResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AmendLabResultInput,
  ) {
    const validated = amendLabResultSchema.parse(body);
    return this.resultService.amendResult(this.getOrgId(user), id, validated, user.id);
  }

  @Post('results/:id/review')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async reviewResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReviewLabResultInput,
  ) {
    const validated = reviewLabResultSchema.parse(body);
    return this.resultService.reviewResult(
      this.getOrgId(user),
      id,
      validated,
      user.id,
      user.role,
    );
  }
}
