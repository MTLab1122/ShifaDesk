import { z } from 'zod';
import { paginationQuerySchema } from './common.schema.js';

// ==========================================
// Clinical Encounter Schemas
// ==========================================

export const createEncounterSchema = z.object({
  clinicId: z.string().uuid('Clinic ID must be a valid UUID'),
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
  appointmentId: z.string().uuid().optional().nullable(),
  queueTokenId: z.string().uuid().optional().nullable(),
  encounterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format').optional(),
  source: z.enum(['APPOINTMENT', 'WALK_IN', 'DOCTOR_INITIATED', 'RECEPTIONIST_ASSISTED']).default('WALK_IN').optional(),
  type: z.enum(['GENERAL_CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'TELEMEDICINE', 'ROUTINE_CHECKUP']).default('GENERAL_CONSULTATION').optional(),
  chiefComplaint: z.string().trim().min(2, 'Chief complaint must be at least 2 characters').max(1000).optional().nullable(),
  visitPurpose: z.string().trim().max(500).optional().nullable(),
  visitContext: z.string().trim().max(1000).optional().nullable(),
});

export const updateEncounterStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED']),
  changeReason: z.string().trim().max(500).optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format').optional().nullable(),
});

export const reassignEncounterSchema = z.object({
  doctorId: z.string().uuid('New doctor ID must be a valid UUID'),
  reassignmentReason: z.string().trim().min(3, 'Reassignment reason must be at least 3 characters').max(500),
});

export const cancelEncounterSchema = z.object({
  cancellationReason: z.string().trim().min(3, 'Cancellation reason must be at least 3 characters').max(500),
});

export const queryEncountersSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().trim().optional(),
});

// ==========================================
// Clinical Notes Schemas
// ==========================================

export const saveClinicalNoteSchema = z.object({
  chiefComplaint: z.string().trim().min(2, 'Chief complaint must be at least 2 characters').max(2000),
  patientReportedSymptoms: z.string().trim().max(2000).optional().nullable(),
  visitPurpose: z.string().trim().max(500).optional().nullable(),
  visitContext: z.string().trim().max(1000).optional().nullable(),
  examinationNotes: z.string().trim().max(5000).optional().nullable(),
  clinicalAssessment: z.string().trim().max(5000).optional().nullable(),
  treatmentPlan: z.string().trim().max(5000).optional().nullable(),
  remarks: z.string().trim().max(1000).optional().nullable(),
});

// ==========================================
// Patient Medical History Schemas
// ==========================================

export const saveMedicalHistorySchema = z.object({
  conditions: z.string().trim().max(5000).optional().nullable(),
  surgeries: z.string().trim().max(5000).optional().nullable(),
  allergies: z.string().trim().max(5000).optional().nullable(),
  familyHistory: z.string().trim().max(2000).optional().nullable(),
  socialHistory: z.string().trim().max(2000).optional().nullable(),
  currentMedications: z.string().trim().max(5000).optional().nullable(),
});

// ==========================================
// Patient Observations / Vitals Schemas
// ==========================================

export const recordObservationSchema = z.object({
  clinicId: z.string().uuid('Clinic ID must be a valid UUID'),
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  encounterId: z.string().uuid().optional().nullable(),
  systolicBp: z.coerce.number().int().min(40, 'Systolic BP too low').max(300, 'Systolic BP too high').optional().nullable(),
  diastolicBp: z.coerce.number().int().min(20, 'Diastolic BP too low').max(200, 'Diastolic BP too high').optional().nullable(),
  pulseRate: z.coerce.number().int().min(20, 'Pulse too low').max(300, 'Pulse too high').optional().nullable(),
  temperature: z.coerce.number().min(25, 'Temperature too low').max(50, 'Temperature too high').optional().nullable(),
  temperatureUnit: z.enum(['C', 'F']).default('C').optional(),
  respiratoryRate: z.coerce.number().int().min(5, 'Respiratory rate too low').max(100, 'Respiratory rate too high').optional().nullable(),
  oxygenSaturation: z.coerce.number().int().min(30, 'SpO2 too low').max(100, 'SpO2 cannot exceed 100%').optional().nullable(),
  heightCm: z.coerce.number().min(20, 'Height too low').max(300, 'Height too high').optional().nullable(),
  weightKg: z.coerce.number().min(0.5, 'Weight too low').max(500, 'Weight too high').optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

// ==========================================
// Encounter Diagnosis Schemas
// ==========================================

export const createDiagnosisSchema = z.object({
  encounterId: z.string().uuid('Encounter ID must be a valid UUID'),
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  diagnosisDescription: z.string().trim().min(2, 'Diagnosis description must be at least 2 characters').max(500),
  diagnosisCode: z.string().trim().max(50).optional().nullable(),
  codingSystem: z.string().trim().max(50).default('CUSTOM').optional(),
  type: z.enum(['PRIMARY', 'SECONDARY']).default('PRIMARY').optional(),
  clinicalStatus: z.enum(['CONFIRMED', 'PROVISIONAL', 'DIFFERENTIAL', 'RESOLVED']).default('CONFIRMED').optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateDiagnosisSchema = z.object({
  diagnosisDescription: z.string().trim().min(2).max(500).optional(),
  diagnosisCode: z.string().trim().max(50).optional().nullable(),
  codingSystem: z.string().trim().max(50).optional(),
  type: z.enum(['PRIMARY', 'SECONDARY']).optional(),
  clinicalStatus: z.enum(['CONFIRMED', 'PROVISIONAL', 'DIFFERENTIAL', 'RESOLVED']).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

// ==========================================
// Prescription Schemas
// ==========================================

export const prescriptionItemSchema = z.object({
  medicationName: z.string().trim().min(1, 'Medication name is required').max(200),
  genericName: z.string().trim().max(200).optional().nullable(),
  strength: z.string().trim().min(1, 'Strength is required').max(100),
  dosageForm: z.string().trim().min(1, 'Dosage form is required').max(100).default('Tablet').optional(),
  dosage: z.string().trim().min(1, 'Dosage is required').max(100),
  route: z.string().trim().max(100).default('Oral').optional(),
  frequency: z.string().trim().min(1, 'Frequency is required').max(100),
  duration: z.string().trim().min(1, 'Duration is required').max(100),
  quantity: z.coerce.number().int().min(1).optional().nullable(),
  instructions: z.string().trim().max(500).optional().nullable(),
});

export const createPrescriptionSchema = z.object({
  encounterId: z.string().uuid('Encounter ID must be a valid UUID'),
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
  clinicId: z.string().uuid('Clinic ID must be a valid UUID'),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(prescriptionItemSchema).min(1, 'Prescription must contain at least one medication item'),
});

export const amendPrescriptionSchema = z.object({
  reason: z.string().trim().min(3, 'Amendment reason must be at least 3 characters').max(500),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(prescriptionItemSchema).min(1, 'Amended prescription must contain at least one medication item'),
});

export const cancelPrescriptionSchema = z.object({
  cancellationReason: z.string().trim().min(3, 'Cancellation reason must be at least 3 characters').max(500),
});

export const queryPrescriptionsSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  encounterId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'AMENDED', 'CANCELLED', 'DISPENSED']).optional(),
  search: z.string().trim().optional(),
});

// ==========================================
// Follow-up Schemas
// ==========================================

export const createFollowupSchema = z.object({
  encounterId: z.string().uuid('Encounter ID must be a valid UUID'),
  clinicId: z.string().uuid('Clinic ID must be a valid UUID'),
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
  followupRequired: z.boolean().default(true).optional(),
  recommendedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Recommended date must be YYYY-MM-DD'),
  instructions: z.string().trim().min(3, 'Follow-up instructions must be at least 3 characters').max(1000),
});

export const updateFollowupSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED']),
  scheduledAppointmentId: z.string().uuid().optional().nullable(),
  instructions: z.string().trim().max(1000).optional(),
});

export const queryFollowupsSchema = paginationQuerySchema.extend({
  clinicId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==========================================
// Finalization & Amendment Schemas
// ==========================================

export const finalizeEncounterSchema = z.object({
  confirmedByDoctor: z.boolean().refine((val) => val === true, 'Explicit doctor confirmation is required to finalize an encounter'),
});

export const amendEncounterSchema = z.object({
  amendmentReason: z.string().trim().min(5, 'Amendment reason must be at least 5 characters').max(1000),
  notes: saveClinicalNoteSchema.optional(),
  diagnoses: z.array(createDiagnosisSchema).optional(),
});

// ==========================================
// Inferred TypeScript Types
// ==========================================

export type CreateEncounterInput = z.infer<typeof createEncounterSchema>;
export type UpdateEncounterStatusInput = z.infer<typeof updateEncounterStatusSchema>;
export type ReassignEncounterInput = z.infer<typeof reassignEncounterSchema>;
export type CancelEncounterInput = z.infer<typeof cancelEncounterSchema>;
export type QueryEncountersInput = z.infer<typeof queryEncountersSchema>;

export type SaveClinicalNoteInput = z.infer<typeof saveClinicalNoteSchema>;
export type SaveMedicalHistoryInput = z.infer<typeof saveMedicalHistorySchema>;
export type RecordObservationInput = z.infer<typeof recordObservationSchema>;

export type CreateDiagnosisInput = z.infer<typeof createDiagnosisSchema>;
export type UpdateDiagnosisInput = z.infer<typeof updateDiagnosisSchema>;

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type AmendPrescriptionInput = z.infer<typeof amendPrescriptionSchema>;
export type CancelPrescriptionInput = z.infer<typeof cancelPrescriptionSchema>;
export type QueryPrescriptionsInput = z.infer<typeof queryPrescriptionsSchema>;

export type CreateFollowupInput = z.infer<typeof createFollowupSchema>;
export type UpdateFollowupInput = z.infer<typeof updateFollowupSchema>;
export type QueryFollowupsInput = z.infer<typeof queryFollowupsSchema>;

export type FinalizeEncounterInput = z.infer<typeof finalizeEncounterSchema>;
export type AmendEncounterInput = z.infer<typeof amendEncounterSchema>;
