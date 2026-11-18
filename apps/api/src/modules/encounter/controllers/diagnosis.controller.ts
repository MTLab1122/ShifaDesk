import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { DiagnosisService } from '../services/diagnosis.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createDiagnosisSchema,
  updateDiagnosisSchema,
} from '@matabai/validation';

@Controller('encounters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Post(':encounterId/diagnoses')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async createDiagnosis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('encounterId') encounterId: string,
    @Body() body: any,
  ) {
    const payload = { ...body, encounterId };
    const validated = createDiagnosisSchema.parse(payload);
    return this.diagnosisService.createDiagnosis(
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Get(':encounterId/diagnoses')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getDiagnosesForEncounter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('encounterId') encounterId: string,
  ) {
    return this.diagnosisService.getDiagnosesForEncounter(
      encounterId,
      this.getOrgId(user),
    );
  }

  @Patch('diagnoses/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async updateDiagnosis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const validated = updateDiagnosisSchema.parse(body);
    return this.diagnosisService.updateDiagnosis(
      id,
      this.getOrgId(user),
      user.id,
      validated,
    );
  }

  @Delete('diagnoses/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.DOCTOR,
  )
  async deleteDiagnosis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.diagnosisService.deleteDiagnosis(id, this.getOrgId(user));
  }
}
