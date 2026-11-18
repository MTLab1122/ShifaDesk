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
import { EncounterService } from '../services/encounter.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createEncounterSchema,
  updateEncounterStatusSchema,
  reassignEncounterSchema,
  cancelEncounterSchema,
  queryEncountersSchema,
  finalizeEncounterSchema,
  amendEncounterSchema,
} from '@matabai/validation';

@Controller('encounters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EncounterController {
  constructor(private readonly encounterService: EncounterService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async createEncounter(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const validated = createEncounterSchema.parse(body);
    return this.encounterService.createEncounter(this.getOrgId(user), user.id, validated);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async listEncounters(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: unknown,
  ) {
    const validated = queryEncountersSchema.parse(query);
    return this.encounterService.queryEncounters(this.getOrgId(user), validated);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getEncounter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.encounterService.getEncounter(id, this.getOrgId(user));
  }

  @Patch(':id/status')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const validated = updateEncounterStatusSchema.parse(body);
    return this.encounterService.updateStatus(id, this.getOrgId(user), user.id, validated);
  }

  @Post(':id/reassign')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async reassignDoctor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const validated = reassignEncounterSchema.parse(body);
    return this.encounterService.reassignDoctor(id, this.getOrgId(user), user.id, validated);
  }

  @Post(':id/cancel')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async cancelEncounter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const validated = cancelEncounterSchema.parse(body);
    return this.encounterService.cancelEncounter(id, this.getOrgId(user), user.id, validated);
  }

  @Post(':id/finalize')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async finalizeEncounter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const validated = finalizeEncounterSchema.parse(body);
    return this.encounterService.finalizeEncounter(id, this.getOrgId(user), user.id, validated);
  }

  @Post(':id/amend')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async amendEncounter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const validated = amendEncounterSchema.parse(body);
    return this.encounterService.amendEncounter(id, this.getOrgId(user), user.id, validated);
  }
}
