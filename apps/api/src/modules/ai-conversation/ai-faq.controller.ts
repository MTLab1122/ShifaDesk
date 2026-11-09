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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiFaqService } from './ai-faq.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import { UserRole } from '@matabai/shared';
import {
  createClinicFaqSchema,
  updateClinicFaqSchema,
  queryClinicFaqsSchema,
  CreateClinicFaqInput,
  UpdateClinicFaqInput,
} from '@matabai/validation';

@Controller('ai/faqs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiFaqController {
  constructor(private readonly faqService: AiFaqService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async listFaqs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: any,
  ) {
    const validatedQuery = queryClinicFaqsSchema.parse(query);
    return this.faqService.listFaqs(user.organizationId || '', validatedQuery);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async getFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.faqService.getFaq(user.organizationId || '', id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateClinicFaqInput,
  ) {
    const validated = createClinicFaqSchema.parse(body);
    return this.faqService.createFaq(user.organizationId || '', validated, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async updateFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateClinicFaqInput,
  ) {
    const validated = updateClinicFaqSchema.parse(body);
    return this.faqService.updateFaq(user.organizationId || '', id, validated, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteFaq(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.faqService.deleteFaq(user.organizationId || '', id);
  }
}
