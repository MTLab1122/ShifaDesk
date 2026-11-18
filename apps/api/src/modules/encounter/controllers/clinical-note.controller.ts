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
import { ClinicalNoteService } from '../services/clinical-note.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import { saveClinicalNoteSchema } from '@matabai/validation';

@Controller('encounters/:id/notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicalNoteController {
  constructor(private readonly clinicalNoteService: ClinicalNoteService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async saveClinicalNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') encounterId: string,
    @Body() body: unknown,
  ) {
    const validated = saveClinicalNoteSchema.parse(body);
    return this.clinicalNoteService.saveClinicalNote(
      encounterId,
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getClinicalNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') encounterId: string,
  ) {
    return this.clinicalNoteService.getClinicalNote(encounterId, this.getOrgId(user));
  }
}
