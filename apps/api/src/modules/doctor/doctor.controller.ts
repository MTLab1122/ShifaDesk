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
import { DoctorService } from './doctor.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles, CurrentUser } from '../../common/auth/decorators';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  CreateDoctorDto,
  UpdateDoctorDto,
  UpdateDoctorStatusDto,
  createDoctorSchema,
  updateDoctorSchema,
  updateDoctorStatusSchema,
} from '@matabai/validation';

@ApiTags('Doctors')
@ApiBearerAuth('bearer-jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get()
  @ApiOperation({ summary: 'List doctors with pagination, search, and clinic filter' })
  @ApiResponse({ status: 200, description: 'Paginated list of doctors' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader?: string,
    @Query('organizationId') orgQuery?: string,
    @Query('clinicId') clinicId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('specialty') specialty?: string,
  ) {
    const orgId = orgQuery || orgHeader;
    return this.doctorService.findAll(
      user,
      orgId,
      clinicId,
      Number(page),
      Number(limit),
      search,
      status,
      specialty,
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Register a new doctor' })
  @ApiResponse({ status: 201, description: 'Doctor registered successfully' })
  async create(
    @Body() body: CreateDoctorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = createDoctorSchema.parse(body);
    return this.doctorService.create(validated, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get doctor profile and clinical details by ID' })
  @ApiResponse({ status: 200, description: 'Doctor profile' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.doctorService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Update doctor profile, specialty, or clinic assignment' })
  @ApiResponse({ status: 200, description: 'Doctor updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateDoctorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updateDoctorSchema.parse(body);
    return this.doctorService.update(id, validated, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate doctor' })
  @ApiResponse({ status: 200, description: 'Doctor status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateDoctorStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updateDoctorStatusSchema.parse(body);
    return this.doctorService.updateStatus(id, validated.status, user);
  }
}
