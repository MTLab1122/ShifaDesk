import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { NotificationModule } from '../notification/notification.module';

// Services
import { EncounterService } from './services/encounter.service';
import { ClinicalNoteService } from './services/clinical-note.service';
import { PatientMedicalHistoryService } from './services/patient-medical-history.service';
import { ObservationService } from './services/observation.service';
import { DiagnosisService } from './services/diagnosis.service';
import { PrescriptionService } from './services/prescription.service';
import { FollowupService } from './services/followup.service';
import { PatientClinicalHistoryService } from './services/patient-clinical-history.service';

// Controllers
import { EncounterController } from './controllers/encounter.controller';
import { ClinicalNoteController } from './controllers/clinical-note.controller';
import { ObservationController } from './controllers/observation.controller';
import { DiagnosisController } from './controllers/diagnosis.controller';
import { PrescriptionController } from './controllers/prescription.controller';
import { FollowupController } from './controllers/followup.controller';
import { PatientHistoryController } from './controllers/patient-history.controller';
import { PatientClinicalController } from './controllers/patient-clinical.controller';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => NotificationModule),
  ],
  controllers: [
    EncounterController,
    ClinicalNoteController,
    ObservationController,
    DiagnosisController,
    PrescriptionController,
    FollowupController,
    PatientHistoryController,
    PatientClinicalController,
  ],
  providers: [
    EncounterService,
    ClinicalNoteService,
    PatientMedicalHistoryService,
    ObservationService,
    DiagnosisService,
    PrescriptionService,
    FollowupService,
    PatientClinicalHistoryService,
  ],
  exports: [
    EncounterService,
    ClinicalNoteService,
    PatientMedicalHistoryService,
    ObservationService,
    DiagnosisService,
    PrescriptionService,
    FollowupService,
    PatientClinicalHistoryService,
  ],
})
export class EncounterModule {}
