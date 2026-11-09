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
import { ScheduleExceptionsService } from './schedule-exceptions.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  createScheduleExceptionSchema,
  updateScheduleExceptionSchema,
  CreateScheduleExceptionDto,
  UpdateScheduleExceptionDto,
} from '@matabai/validation';

@Controller('doctors/:doctorId/schedule-exceptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleExceptionsController {
  constructor(private readonly service: ScheduleExceptionsService) {}

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
    @Body() body: CreateScheduleExceptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = createScheduleExceptionSchema.parse({
      ...body,
      doctorId,
    });
    return this.service.create(doctorId, validated, user);
  }

  @Patch(':id')
  async update(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
    @Body() body: UpdateScheduleExceptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updateScheduleExceptionSchema.parse(body);
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

