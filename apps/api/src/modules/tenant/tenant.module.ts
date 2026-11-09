import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  controllers: [TenantController],
  providers: [TenantService, AuditService],
  exports: [TenantService],
})
export class TenantModule {}
