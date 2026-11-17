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
import { LaboratoryCatalogService } from '../services/laboratory-catalog.service';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import { AuthenticatedUser } from '../../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createLabCategorySchema,
  updateLabCategorySchema,
  createLabTestSchema,
  updateLabTestSchema,
  queryLabTestsSchema,
  createLabPackageSchema,
  updateLabPackageSchema,
  queryLabPackagesSchema,
  CreateLabCategoryInput,
  UpdateLabCategoryInput,
  CreateLabTestInput,
  UpdateLabTestInput,
  CreateLabPackageInput,
  UpdateLabPackageInput,
} from '@matabai/validation';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaboratoryCatalogController {
  constructor(private readonly catalogService: LaboratoryCatalogService) {}

  private getOrgId(user: AuthenticatedUser): string {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new BadRequestException('User does not belong to an active organization');
    }
    return orgId;
  }

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  @Get('categories')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async listCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.catalogService.listCategories(this.getOrgId(user), clinicId);
  }

  @Post('categories')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.LAB_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateLabCategoryInput,
  ) {
    const validated = createLabCategorySchema.parse(body);
    return this.catalogService.createCategory(this.getOrgId(user), validated, user.id);
  }

  @Patch('categories/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.LAB_MANAGER)
  async updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateLabCategoryInput,
  ) {
    const validated = updateLabCategorySchema.parse(body);
    return this.catalogService.updateCategory(this.getOrgId(user), id, validated, user.id);
  }

  // ---------------------------------------------------------------------------
  // Tests Catalog
  // ---------------------------------------------------------------------------

  @Get('tests')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.PATIENT,
  )
  async listTests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    const validated = queryLabTestsSchema.parse(query);
    return this.catalogService.listTests(this.getOrgId(user), validated);
  }

  @Get('tests/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.PATIENT,
  )
  async getTestById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.catalogService.getTestById(this.getOrgId(user), id);
  }

  @Post('tests')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.LAB_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createTest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateLabTestInput,
  ) {
    const validated = createLabTestSchema.parse(body);
    return this.catalogService.createTest(this.getOrgId(user), validated, user.id);
  }

  @Patch('tests/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.LAB_MANAGER)
  async updateTest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateLabTestInput,
  ) {
    const validated = updateLabTestSchema.parse(body);
    return this.catalogService.updateTest(this.getOrgId(user), id, validated, user.id);
  }

  // ---------------------------------------------------------------------------
  // Packages
  // ---------------------------------------------------------------------------

  @Get('packages')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.PATIENT,
  )
  async listPackages(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    const validated = queryLabPackagesSchema.parse(query);
    return this.catalogService.listPackages(this.getOrgId(user), validated);
  }

  @Get('packages/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLINIC_ADMIN,
    UserRole.LAB_MANAGER,
    UserRole.LAB_REVIEWER,
    UserRole.LAB_STAFF,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  async getPackageById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.catalogService.getPackageById(this.getOrgId(user), id);
  }

  @Post('packages')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.LAB_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createPackage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateLabPackageInput,
  ) {
    const validated = createLabPackageSchema.parse(body);
    return this.catalogService.createPackage(this.getOrgId(user), validated, user.id);
  }

  @Patch('packages/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.LAB_MANAGER)
  async updatePackage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateLabPackageInput,
  ) {
    const validated = updateLabPackageSchema.parse(body);
    return this.catalogService.updatePackage(this.getOrgId(user), id, validated, user.id);
  }
}

