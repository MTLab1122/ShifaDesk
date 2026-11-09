import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';

import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursController } from './working-hours.controller';
import { ScheduleExceptionsService } from './schedule-exceptions.service';
import { ScheduleExceptionsController } from './schedule-exceptions.controller';
import { SlotGenerationService } from './slot-generation.service';
import { AvailabilityController } from './availability.controller';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';

@Module({
  imports: [DatabaseModule, AuditModule, forwardRef(() => NotificationModule)],
  controllers: [
    WorkingHoursController,
    ScheduleExceptionsController,
    AvailabilityController,
    AppointmentController,
  ],
  providers: [
    WorkingHoursService,
    ScheduleExceptionsService,
    SlotGenerationService,
    AppointmentService,
  ],
  exports: [
    WorkingHoursService,
    ScheduleExceptionsService,
    SlotGenerationService,
    AppointmentService,
  ],
})
export class AppointmentModule {}
