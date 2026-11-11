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
import { LaboratorySampleService } from '../services/laboratory-sample.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createLabSampleSchema,
  updateLabSampleStatusSchema,
  queryLabSamplesSchema,
  CreateLabSampleInput,
  UpdateLabSampleStatusInput,
} from '@matabai/validation';

@Controller('laboratory/samples')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaboratorySampleController {
  constructor(private readonly sampleService: LaboratorySampleService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async listSamples(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    const validated = queryLabSamplesSchema.parse(query);
    return this.sampleService.listSamples(this.getOrgId(user), validated);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getSampleById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.sampleService.getSampleById(this.getOrgId(user), id);
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_STAFF,
  )
  @HttpCode(HttpStatus.CREATED)
  async createSample(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateLabSampleInput,
  ) {
    const validated = createLabSampleSchema.parse(body);
    return this.sampleService.createSample(this.getOrgId(user), validated, user.id);
  }

  @Patch(':id/status')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
  )
  async updateSampleStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateLabSampleStatusInput,
  ) {
    const validated = updateLabSampleStatusSchema.parse(body);
    return this.sampleService.updateSampleStatus(this.getOrgId(user), id, validated, user.id);
  }
}
