import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { NotificationModule } from '../notification/notification.module';

// Storage
import { PrivateReportStorageService } from './storage/private-report-storage.service';

// Services
import { LaboratoryAuditService } from './services/laboratory-audit.service';
import { LaboratoryCatalogService } from './services/laboratory-catalog.service';
import { LaboratoryOrderService } from './services/laboratory-order.service';
import { LaboratorySampleService } from './services/laboratory-sample.service';
import { LaboratoryResultService } from './services/laboratory-result.service';
import { LaboratoryReportService } from './services/laboratory-report.service';
import { LaboratoryDeliveryService } from './services/laboratory-delivery.service';
import { LaboratoryAnalyticsService } from './services/laboratory-analytics.service';

// Controllers
import { LaboratoryCatalogController } from './controllers/laboratory-catalog.controller';
import { LaboratoryOrderController } from './controllers/laboratory-order.controller';
import { LaboratorySampleController } from './controllers/laboratory-sample.controller';
import { LaboratoryResultController } from './controllers/laboratory-result.controller';
import { LaboratoryReportController } from './controllers/laboratory-report.controller';
import { LaboratoryAnalyticsController } from './controllers/laboratory-analytics.controller';
import {
  LaboratoryPatientController,
  LaboratoryPublicAccessController,
} from './controllers/laboratory-patient.controller';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => NotificationModule),
  ],
  controllers: [
    LaboratoryCatalogController,
    LaboratoryOrderController,
    LaboratorySampleController,
    LaboratoryResultController,
    LaboratoryReportController,
    LaboratoryAnalyticsController,
    LaboratoryPatientController,
    LaboratoryPublicAccessController,
  ],
  providers: [
    PrivateReportStorageService,
    LaboratoryAuditService,
    LaboratoryCatalogService,
    LaboratoryOrderService,
    LaboratorySampleService,
    LaboratoryResultService,
    LaboratoryReportService,
    LaboratoryDeliveryService,
    LaboratoryAnalyticsService,
  ],
  exports: [
    PrivateReportStorageService,
    LaboratoryAuditService,
    LaboratoryCatalogService,
    LaboratoryOrderService,
    LaboratorySampleService,
    LaboratoryResultService,
    LaboratoryReportService,
    LaboratoryDeliveryService,
    LaboratoryAnalyticsService,
  ],
})
export class LaboratoryModule {}
