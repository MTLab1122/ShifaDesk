import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClinicService } from './clinic.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles, CurrentUser } from '../../common/auth/decorators';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  CreateClinicDto,
  UpdateClinicDto,
  createClinicSchema,
  updateClinicSchema,
} from '@matabai/validation';

@ApiTags('Clinics')
@ApiBearerAuth('bearer-jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Get()
  @ApiOperation({ summary: 'List clinics under authorized organization' })
  @ApiResponse({ status: 200, description: 'Paginated list of clinics' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader?: string,
    @Query('organizationId') orgQuery?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const orgId = orgQuery || orgHeader;
    return this.clinicService.findAll(user, orgId, Number(page), Number(limit));
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Create new clinic facility' })
  @ApiResponse({ status: 201, description: 'Clinic created successfully' })
  async create(
    @Body() body: CreateClinicDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = createClinicSchema.parse(body);
    return this.clinicService.create(validated, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get clinic details by ID' })
  @ApiResponse({ status: 200, description: 'Clinic details' })
  @ApiResponse({ status: 404, description: 'Clinic not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clinicService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Update clinic by ID' })
  @ApiResponse({ status: 200, description: 'Clinic updated' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClinicDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updateClinicSchema.parse(body);
    return this.clinicService.update(id, validated, user);
  }
}
