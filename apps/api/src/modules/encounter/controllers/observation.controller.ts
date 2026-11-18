import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ObservationService } from '../services/observation.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { recordObservationSchema } from '@matabai/validation';

@Controller('encounters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ObservationController {
  constructor(private readonly observationService: ObservationService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Post('observations')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async recordObservation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = recordObservationSchema.parse(body);
    return this.observationService.recordObservation(
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Post(':encounterId/observations')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async recordEncounterObservation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('encounterId') encounterId: string,
    @Body() body: any,
  ) {
    const payload = { ...body, encounterId };
    const validated = recordObservationSchema.parse(payload);
    return this.observationService.recordObservation(
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Get(':encounterId/observations')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getEncounterObservations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('encounterId') encounterId: string,
  ) {
    return this.observationService.getObservationsForEncounter(
      encounterId,
      this.getOrgId(user),
    );
  }
}
