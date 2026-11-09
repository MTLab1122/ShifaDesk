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
} from '@nestjs/common';
import { WorkingHoursService } from './working-hours.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  createWorkingHoursSchema,
  updateWorkingHoursSchema,
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
} from '@matabai/validation';

@Controller('doctors/:doctorId/working-hours')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkingHoursController {
  constructor(private readonly service: WorkingHoursService) {}

  @Get()
  async findAll(
    @Param('doctorId') doctorId: string,
    @Query('clinicId') clinicId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(doctorId, user, clinicId);
  }

  @Post()
  async create(
    @Param('doctorId') doctorId: string,
    @Body() body: CreateWorkingHoursDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = createWorkingHoursSchema.parse({
      ...body,
      doctorId,
    });
    return this.service.create(doctorId, validated, user);
  }

  @Patch(':id')
  async update(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
    @Body() body: UpdateWorkingHoursDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updateWorkingHoursSchema.parse(body);
    return this.service.update(doctorId, id, validated, user);
  }

  @Delete(':id')
  async remove(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(doctorId, id, user);
  }
}
