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
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles, CurrentUser } from '../../common/auth/decorators';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  CreateStaffDto,
  UpdateStaffDto,
  UpdateStaffStatusDto,
  createStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
} from '@matabai/validation';

@ApiTags('Staff')
@ApiBearerAuth('bearer-jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'List staff members with pagination, search, and designation filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of staff members' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader?: string,
    @Query('organizationId') orgQuery?: string,
    @Query('clinicId') clinicId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('designation') designation?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
  ) {
    const orgId = orgQuery || orgHeader;
    return this.staffService.findAll(
      user,
      orgId,
      clinicId,
      Number(page),
      Number(limit),
      search,
      designation,
      department,
      status,
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Add a new operational staff member' })
  @ApiResponse({ status: 201, description: 'Staff member added successfully' })
  async create(
    @Body() body: CreateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = createStaffSchema.parse(body);
    return this.staffService.create(validated, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member details by ID' })
  @ApiResponse({ status: 200, description: 'Staff member profile' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.staffService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Update staff member profile or designation' })
  @ApiResponse({ status: 200, description: 'Staff member updated' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updateStaffSchema.parse(body);
    return this.staffService.update(id, validated, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Update staff member employment status' })
  @ApiResponse({ status: 200, description: 'Staff member status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateStaffStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updateStaffStatusSchema.parse(body);
    return this.staffService.updateStatus(id, validated.status, user);
  }
}
