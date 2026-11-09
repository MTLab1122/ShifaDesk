import { Module } from '@nestjs/common';
import { ClinicController } from './clinic.controller';
import { ClinicService } from './clinic.service';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  controllers: [ClinicController],
  providers: [ClinicService, AuditService],
  exports: [ClinicService],
})
export class ClinicModule {}
