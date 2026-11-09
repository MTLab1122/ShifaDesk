import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  controllers: [MembershipController],
  providers: [MembershipService, AuditService],
  exports: [MembershipService],
})
export class MembershipModule {}
