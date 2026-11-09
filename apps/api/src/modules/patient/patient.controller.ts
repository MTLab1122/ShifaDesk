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
import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles, CurrentUser } from '../../common/auth/decorators';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  CreatePatientDto,
  UpdatePatientDto,
  UpdatePatientStatusDto,
  createPatientSchema,
  updatePatientSchema,
  updatePatientStatusSchema,
} from '@matabai/validation';

@ApiTags('Patients')
@ApiBearerAuth('bearer-jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'List patients with pagination, search (name, MRN, phone), and clinic filter' })
  @ApiResponse({ status: 200, description: 'Paginated list of patients' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader?: string,
    @Query('organizationId') orgQuery?: string,
    @Query('clinicId') clinicId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const orgId = orgQuery || orgHeader;
    return this.patientService.findAll(
      user,
      orgId,
      clinicId,
      Number(page),
      Number(limit),
      search,
      status,
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Register a new patient into outpatient clinic directory' })
  @ApiResponse({ status: 201, description: 'Patient registered successfully' })
  async create(
    @Body() body: CreatePatientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = createPatientSchema.parse(body);
    return this.patientService.create(validated, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient profile details by ID' })
  @ApiResponse({ status: 200, description: 'Patient profile' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patientService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update patient demographics and contact details' })
  @ApiResponse({ status: 200, description: 'Patient updated' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdatePatientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updatePatientSchema.parse(body);
    return this.patientService.update(id, validated, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate patient' })
  @ApiResponse({ status: 200, description: 'Patient status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdatePatientStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updatePatientStatusSchema.parse(body);
    return this.patientService.updateStatus(id, validated.status, user);
  }
}
