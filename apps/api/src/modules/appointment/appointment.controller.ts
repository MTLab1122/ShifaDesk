import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/decorators';
import { AuthenticatedUser } from '../../common/auth/token-payload.interface';
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
  queryAppointmentsSchema,
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  UpdateAppointmentStatusDto,
  QueryAppointmentsDto,
} from '@matabai/validation';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @Get()
  async findAll(
    @Query() query: QueryAppointmentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = queryAppointmentsSchema.parse(query);
    return this.service.findAll(user, validated);
  }

  @Post()
  async create(
    @Body() body: CreateAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = createAppointmentSchema.parse(body);
    return this.service.create(validated, user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user);
  }

  @Post(':id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @Body() body: RescheduleAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = rescheduleAppointmentSchema.parse(body);
    return this.service.reschedule(id, validated, user);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() body: CancelAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = cancelAppointmentSchema.parse(body);
    return this.service.cancel(id, validated, user);
  }

  @Post(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateAppointmentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const validated = updateAppointmentStatusSchema.parse(body);
    return this.service.updateStatus(id, validated, user);
  }
}
