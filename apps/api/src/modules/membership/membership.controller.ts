import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles, CurrentUser } from '../../common/auth/decorators';
import { UserRole } from '@matabai/shared';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  CreateMembershipDto,
  UpdateMembershipDto,
  createMembershipSchema,
  updateMembershipSchema,
} from '@matabai/validation';

@ApiTags('Memberships')
@ApiBearerAuth('bearer-jwt')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('memberships')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  @ApiOperation({ summary: 'List memberships for organization or clinic' })
  @ApiResponse({ status: 200, description: 'Paginated list of memberships' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') orgHeader?: string,
    @Query('organizationId') orgQuery?: string,
    @Query('clinicId') clinicId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const orgId = orgQuery || orgHeader;
    return this.membershipService.findAll(
      user,
      orgId,
      clinicId,
      Number(page),
      Number(limit),
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Create new organization or clinic membership' })
  @ApiResponse({ status: 201, description: 'Membership created' })
  async create(
    @Body() body: CreateMembershipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = createMembershipSchema.parse(body);
    return this.membershipService.create(validated, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Update membership role or status' })
  @ApiResponse({ status: 200, description: 'Membership updated' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateMembershipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updateMembershipSchema.parse(body);
    return this.membershipService.update(id, validated, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @ApiOperation({ summary: 'Revoke / delete membership' })
  @ApiResponse({ status: 200, description: 'Membership removed' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membershipService.remove(id, user);
  }
}

