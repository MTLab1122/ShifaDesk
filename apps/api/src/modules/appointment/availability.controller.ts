import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SlotGenerationService } from './slot-generation.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { queryAvailabilitySchema } from '@matabai/validation';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly slotGen: SlotGenerationService) {}

  @Get()
  async getAvailability(
    @Query('clinicId') clinicId: string,
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    const validated = queryAvailabilitySchema.parse({
      clinicId,
      doctorId,
      date,
    });

    return this.slotGen.generateSlots(
      validated.clinicId,
      validated.doctorId,
      validated.date,
    );
  }
}
