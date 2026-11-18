'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClient } from '@/lib/api-client';
import {
  PatientObservation,
  EncounterDiagnosis,
  EncounterFollowup,
} from '@matabai/shared';
import {
  FileText,
  Activity,
  Stethoscope,
  Pill,
  FlaskConical,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Printer,
  History,
  ShieldCheck,
  ChevronLeft,
  RefreshCw,
  Plus,
  Trash2,
  DollarSign,
  Edit3,
} from 'lucide-react';

export default function ClinicalEncounterWorkspacePage() {
  const params = useParams();
  const encounterId = params?.id as string;

  const [encounter, setEncounter] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingNote, setSavingNote] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('notes');

  // Clinical Notes Form
  const [chiefComplaint, setChiefComplaint] = React.useState('');
  const [patientSymptoms, setPatientSymptoms] = React.useState('');
  const [visitPurpose, setVisitPurpose] = React.useState('');
  const [visitContext, setVisitContext] = React.useState('');
  const [examinationNotes, setExaminationNotes] = React.useState('');
  const [clinicalAssessment, setClinicalAssessment] = React.useState('');
  const [treatmentPlan, setTreatmentPlan] = React.useState('');
  const [remarks, setRemarks] = React.useState('');

  // Observation / Vitals Form
  const [systolicBp, setSystolicBp] = React.useState('');
  const [diastolicBp, setDiastolicBp] = React.useState('');
  const [pulseRate, setPulseRate] = React.useState('');
  const [temperature, setTemperature] = React.useState('');
  const [tempUnit, setTempUnit] = React.useState<'C' | 'F'>('C');
  const [respiratoryRate, setRespiratoryRate] = React.useState('');
  const [oxygenSaturation, setOxygenSaturation] = React.useState('');
  const [heightCm, setHeightCm] = React.useState('');
  const [weightKg, setWeightKg] = React.useState('');
  const [obsNotes, setObsNotes] = React.useState('');

  // Calculated BMI
  const computedBmi = React.useMemo(() => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (h > 0 && w > 0) {
      const heightM = h / 100;
      return +(w / (heightM * heightM)).toFixed(1);
    }
    return null;
  }, [heightCm, weightKg]);

  const getBmiCategory = (bmi: number | null) => {
    if (!bmi) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-600' };
    if (bmi < 25) return { label: 'Normal weight', color: 'text-emerald-600' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600' };
    return { label: 'Obese', color: 'text-rose-600' };
  };

  // Diagnosis Form
  const [diagDescription, setDiagDescription] = React.useState('');
  const [diagCode, setDiagCode] = React.useState('');
  const diagCodingSystem = 'ICD-10';
  const [diagType, setDiagType] = React.useState<'PRIMARY' | 'SECONDARY'>('PRIMARY');
  const [diagStatus, setDiagStatus] = React.useState<'CONFIRMED' | 'PROVISIONAL' | 'DIFFERENTIAL' | 'RESOLVED'>('CONFIRMED');

  // Prescription Form
  const [rxItems, setRxItems] = React.useState<any[]>([
    {
      medicationName: '',
      genericName: '',
      strength: '',
      dosageForm: 'Tablet',
      dosage: '1 tab',
      route: 'Oral',
      frequency: 'Every 8 hours',
      duration: '5 days',
      quantity: 15,
      instructions: 'After meals',
    },
  ]);
  const [rxNotes, setRxNotes] = React.useState('');

  // Follow-up Form
  const [followupDate, setFollowupDate] = React.useState('');
  const [followupInstructions, setFollowupInstructions] = React.useState('');

  // Modals
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = React.useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = React.useState(false);
  const [amendmentReason, setAmendmentReason] = React.useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [printHtml, setPrintHtml] = React.useState('');

  const loadEncounter = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.encounter.get(encounterId);
      setEncounter(data);

      if (data.clinicalNote) {
        setChiefComplaint(data.clinicalNote.chiefComplaint || '');
        setPatientSymptoms(data.clinicalNote.patientReportedSymptoms || '');
        setVisitPurpose(data.clinicalNote.visitPurpose || '');
        setVisitContext(data.clinicalNote.visitContext || '');
        setExaminationNotes(data.clinicalNote.examinationNotes || '');
        setClinicalAssessment(data.clinicalNote.clinicalAssessment || '');
        setTreatmentPlan(data.clinicalNote.treatmentPlan || '');
        setRemarks(data.clinicalNote.remarks || '');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load clinical encounter');
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  React.useEffect(() => {
    loadEncounter();
  }, [loadEncounter]);

  const handleSaveNotes = async () => {
    if (!chiefComplaint.trim()) {
      setError('Chief complaint cannot be empty');
      return;
    }
    try {
      setSavingNote(true);
      setError(null);
      await ApiClient.encounter.saveNote(encounterId, {
        chiefComplaint: chiefComplaint.trim(),
        patientReportedSymptoms: patientSymptoms.trim() || undefined,
        visitPurpose: visitPurpose.trim() || undefined,
        visitContext: visitContext.trim() || undefined,
        examinationNotes: examinationNotes.trim() || undefined,
        clinicalAssessment: clinicalAssessment.trim() || undefined,
        treatmentPlan: treatmentPlan.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });
      setSuccessMsg('Clinical notes updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
      loadEncounter();
    } catch (err: any) {
      setError(err?.message || 'Failed to save clinical notes');
    } finally {
      setSavingNote(false);
    }
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await ApiClient.encounter.recordObservation({
        clinicId: encounter.clinicId,
        patientId: encounter.patientId,
        encounterId,
        systolicBp: systolicBp ? parseInt(systolicBp, 10) : undefined,
        diastolicBp: diastolicBp ? parseInt(diastolicBp, 10) : undefined,
        pulseRate: pulseRate ? parseInt(pulseRate, 10) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        temperatureUnit: tempUnit,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : undefined,
        oxygenSaturation: oxygenSaturation ? parseInt(oxygenSaturation, 10) : undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        notes: obsNotes.trim() || undefined,
      });

      setSuccessMsg('Observations recorded successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
      // Reset observation form
      setSystolicBp('');
      setDiastolicBp('');
      setPulseRate('');
      setTemperature('');
      setRespiratoryRate('');
      setOxygenSaturation('');
      setHeightCm('');
      setWeightKg('');
      setObsNotes('');
      loadEncounter();
    } catch (err: any) {
      setError(err?.message || 'Failed to record vitals');
    }
  };

  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagDescription.trim()) return;

    try {
      setError(null);
      await ApiClient.encounter.createDiagnosis(encounterId, {
        patientId: encounter.patientId,
        diagnosisDescription: diagDescription.trim(),
        diagnosisCode: diagCode.trim() || undefined,
        codingSystem: diagCodingSystem,
        type: diagType,
        clinicalStatus: diagStatus,
      });

      setDiagDescription('');
      setDiagCode('');
      setSuccessMsg('Diagnosis recorded.');
      setTimeout(() => setSuccessMsg(null), 3500);
      loadEncounter();
    } catch (err: any) {
      setError(err?.message || 'Failed to record diagnosis');
    }
  };

  const handleDeleteDiagnosis = async (id: string) => {
    if (!confirm('Are you sure you want to remove this diagnosis?')) return;
    try {
      await ApiClient.encounter.deleteDiagnosis(id);
      loadEncounter();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete diagnosis');
    }
  };

  const handleAddRxItem = () => {
    setRxItems([
      ...rxItems,
      {
        medicationName: '',
        genericName: '',
        strength: '',
        dosageForm: 'Tablet',
        dosage: '1 tab',
        route: 'Oral',
        frequency: 'Every 8 hours',
        duration: '5 days',
        quantity: 10,
        instructions: '',
      },
    ]);
  };

  const handleRemoveRxItem = (index: number) => {
    if (rxItems.length <= 1) return;
    setRxItems(rxItems.filter((_, i) => i !== index));
  };

  const handleRxItemChange = (index: number, field: string, value: any) => {
    const updated = [...rxItems];
    updated[index][field] = value;
    setRxItems(updated);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = rxItems.filter((item) => item.medicationName.trim() && item.strength.trim());
    if (validItems.length === 0) {
      setError('Please provide medication name and strength for at least one medication');
      return;
    }

    try {
      setError(null);
      await ApiClient.encounter.createPrescription({
        encounterId,
        patientId: encounter.patientId,
        doctorId: encounter.doctorId,
        clinicId: encounter.clinicId,
        notes: rxNotes.trim() || undefined,
        items: validItems,
      });

      setSuccessMsg('Prescription created successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
      loadEncounter();
    } catch (err: any) {
      setError(err?.message || 'Failed to create prescription');
    }
  };

  const handlePrintPrescription = async (prescriptionId: string) => {
    try {
      const res = await ApiClient.encounter.getPrescriptionHtml(prescriptionId);
      setPrintHtml(res.html);
      setIsPrintModalOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate printable prescription');
    }
  };

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupDate) {
      setError('Please select recommended follow-up date');
      return;
    }

    try {
      setError(null);
      await ApiClient.encounter.createFollowup(encounterId, {
        clinicId: encounter.clinicId,
        patientId: encounter.patientId,
        doctorId: encounter.doctorId,
        recommendedDate: followupDate,
        instructions: followupInstructions.trim() || 'Follow-up consultation',
      });

      setSuccessMsg('Follow-up scheduled.');
      setTimeout(() => setSuccessMsg(null), 3500);
      setFollowupDate('');
      setFollowupInstructions('');
      loadEncounter();
    } catch (err: any) {
      setError(err?.message || 'Failed to schedule follow-up');
    }
  };

  const handleFinalize = async () => {
    try {
      setError(null);
      await ApiClient.encounter.finalize(encounterId, { confirmedByDoctor: true });
      setIsFinalizeModalOpen(false);
      setSuccessMsg('Encounter successfully finalized and locked.');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadEncounter();
    } catch (err: any) {
      setError(err?.message || 'Failed to finalize encounter');
    }
  };

  const handleAmend = async () => {
    if (amendmentReason.trim().length < 5) {
      setError('Amendment reason must be at least 5 characters');
      return;
    }

    try {
      setError(null);
      await ApiClient.encounter.amend(encounterId, {
        amendmentReason: amendmentReason.trim(),
        notes: {
          chiefComplaint: chiefComplaint.trim(),
          patientReportedSymptoms: patientSymptoms.trim() || undefined,
          examinationNotes: examinationNotes.trim() || undefined,
          clinicalAssessment: clinicalAssessment.trim() || undefined,
          treatmentPlan: treatmentPlan.trim() || undefined,
          remarks: remarks.trim() || undefined,
        },
      });

      setIsAmendModalOpen(false);
      setAmendmentReason('');
      setSuccessMsg('Encounter amended and new version generated.');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadEncounter();
    } catch (err: any) {
      setError(err?.message || 'Failed to amend encounter');
    }
  };

  if (loading && !encounter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin text-clinical-600 mb-3" />
        <p>Loading consultation workspace...</p>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Encounter Not Found</h2>
        <p className="text-muted-foreground mt-1">The requested clinical encounter does not exist.</p>
        <Link href="/dashboard/encounters">
          <Button variant="outline" className="mt-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Registry
          </Button>
        </Link>
      </div>
    );
  }

  const isLocked = encounter.isFinalized;
  const bmiCat = computedBmi ? getBmiCategory(computedBmi) : null;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/encounters">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 font-mono">
                {encounter.encounterReference}
              </h1>
              {isLocked ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Finalized & Locked
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                  {encounter.status.replace('_', ' ')}
                </Badge>
              )}
              <Badge variant="outline">{encounter.type.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Opened on {encounter.encounterDate} at {encounter.startTime} via {encounter.source.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/patients/${encounter.patientId}/clinical-history`}>
            <Button variant="outline" size="sm" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1" />
              Patient EMR Chart
            </Button>
          </Link>

          {!isLocked ? (
            <Button
              size="sm"
              onClick={() => setIsFinalizeModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Finalize & Lock Consultation
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAmendModalOpen(true)}
              className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <Edit3 className="h-3.5 w-3.5 mr-1 text-amber-600" />
              Authorize Clinical Amendment
            </Button>
          )}
        </div>
      </div>

      {/* Patient Banner */}
      <Card className="bg-slate-900 text-white border-none shadow-md">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <p className="text-xs text-slate-400">Patient</p>
              <p className="text-lg font-bold tracking-tight">{encounter.patient?.fullName}</p>
              <p className="text-xs font-mono text-slate-400">
                MRN: {encounter.patient?.patientNumber || encounter.patientId.substring(0, 8)} |{' '}
                {encounter.patient?.gender || 'Unknown'} | {encounter.patient?.phone || 'No Phone'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Attending Doctor</p>
              <p className="text-base font-semibold text-slate-100 flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-clinical-400" />
                {encounter.doctor?.fullName}
              </p>
              <p className="text-xs text-slate-400">
                {encounter.doctor?.specialty || 'General Practitioner'} | Lic: {encounter.doctor?.registrationNumber || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Clinic Location</p>
              <p className="text-sm font-medium text-slate-200">{encounter.clinic?.name}</p>
              <p className="text-xs text-slate-400">{encounter.clinic?.address || 'Main Facility'}</p>
            </div>

            <div className="flex md:justify-end gap-2">
              {encounter.observations && encounter.observations[0] && (
                <div className="text-right bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Latest BP / Pulse</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {encounter.observations[0].systolicBp}/{encounter.observations[0].diastolicBp} mmHg
                  </span>
                  <span className="text-xs text-slate-300 ml-1.5 font-mono">
                    {encounter.observations[0].pulseRate} bpm
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="notes" className="text-xs py-1.5 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Clinical Notes
          </TabsTrigger>
          <TabsTrigger value="vitals" className="text-xs py-1.5 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Vitals & Observations
          </TabsTrigger>
          <TabsTrigger value="diagnoses" className="text-xs py-1.5 flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5" />
            Diagnoses ({encounter.diagnoses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="text-xs py-1.5 flex items-center gap-1.5">
            <Pill className="h-3.5 w-3.5" />
            Prescriptions ({encounter.prescriptions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="labs" className="text-xs py-1.5 flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Lab Orders ({encounter.laboratoryOrders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="followups" className="text-xs py-1.5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Follow-up & Billing
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs py-1.5 flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Document Versions & Audit
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CLINICAL NOTES */}
        <TabsContent value="notes">
          <Card className="border border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Structured Clinical Consultation Notes</CardTitle>
                <CardDescription>
                  Medical record documentation for this patient visit.
                </CardDescription>
              </div>
              {!isLocked && (
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={savingNote}
                  className="bg-clinical-600 hover:bg-clinical-700 text-white text-xs"
                >
                  {savingNote ? 'Saving...' : 'Save Notes'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Chief Complaint <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  disabled={isLocked}
                  placeholder="Primary symptom or reason for visit..."
                  className="text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Patient-Reported Symptoms & History of Present Illness
                  </label>
                  <textarea
                    rows={3}
                    value={patientSymptoms}
                    onChange={(e) => setPatientSymptoms(e.target.value)}
                    disabled={isLocked}
                    placeholder="Onset, duration, severity, aggravating and relieving factors..."
                    className="w-full text-sm border rounded-md p-2 bg-white disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Physical Examination Findings
                  </label>
                  <textarea
                    rows={3}
                    value={examinationNotes}
                    onChange={(e) => setExaminationNotes(e.target.value)}
                    disabled={isLocked}
                    placeholder="General appearance, chest, abdomen, extremities, neurological..."
                    className="w-full text-sm border rounded-md p-2 bg-white disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Doctor Assessment & Impression
                  </label>
                  <textarea
                    rows={3}
                    value={clinicalAssessment}
                    onChange={(e) => setClinicalAssessment(e.target.value)}
                    disabled={isLocked}
                    placeholder="Clinical evaluation, differential considerations..."
                    className="w-full text-sm border rounded-md p-2 bg-white disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Treatment Plan & Patient Advice
                  </label>
                  <textarea
                    rows={3}
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    disabled={isLocked}
                    placeholder="Dietary precautions, lifestyle modifications, emergency warning signs..."
                    className="w-full text-sm border rounded-md p-2 bg-white disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Confidential Staff Remarks (Internal)
                </label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={isLocked}
                  placeholder="Notes visible only to clinic doctors and clinical team..."
                  className="text-xs text-muted-foreground"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: VITALS & OBSERVATIONS */}
        <TabsContent value="vitals">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Record Form */}
            <Card className="border border-slate-200 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Record Vitals</CardTitle>
                <CardDescription>Enter patient clinical observations.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRecordVitals} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Systolic BP (mmHg)</label>
                      <Input
                        type="number"
                        placeholder="120"
                        value={systolicBp}
                        onChange={(e) => setSystolicBp(e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Diastolic BP (mmHg)</label>
                      <Input
                        type="number"
                        placeholder="80"
                        value={diastolicBp}
                        onChange={(e) => setDiastolicBp(e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Pulse (bpm)</label>
                      <Input
                        type="number"
                        placeholder="72"
                        value={pulseRate}
                        onChange={(e) => setPulseRate(e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">SpO2 (%)</label>
                      <Input
                        type="number"
                        placeholder="98"
                        value={oxygenSaturation}
                        onChange={(e) => setOxygenSaturation(e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Temperature</label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="37.0"
                          value={temperature}
                          onChange={(e) => setTemperature(e.target.value)}
                          disabled={isLocked}
                        />
                        <button
                          type="button"
                          onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
                          className="px-2 py-1 text-xs border rounded bg-slate-50 font-bold"
                        >
                          °{tempUnit}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Resp. Rate (/min)</label>
                      <Input
                        type="number"
                        placeholder="16"
                        value={respiratoryRate}
                        onChange={(e) => setRespiratoryRate(e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Height (cm)</label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="175"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Weight (kg)</label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="70"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  {computedBmi && (
                    <div className="p-2.5 bg-slate-50 border rounded-md flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">Calculated BMI: </span>
                        <span className="font-bold text-slate-900 font-mono text-sm">{computedBmi}</span>
                      </div>
                      {bmiCat && <span className={`font-semibold ${bmiCat.color}`}>{bmiCat.label}</span>}
                    </div>
                  )}

                  {!isLocked && (
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full bg-clinical-600 hover:bg-clinical-700 text-white text-xs mt-2"
                    >
                      Record Observations
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Observations History */}
            <Card className="border border-slate-200 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Observation History</CardTitle>
                <CardDescription>Logged vital measurements during this consultation.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Time</TableHead>
                      <TableHead>BP (mmHg)</TableHead>
                      <TableHead>Pulse</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead>SpO2</TableHead>
                      <TableHead>BMI (kg/m²)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!encounter.observations || encounter.observations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                          No vitals recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      encounter.observations.map((obs: PatientObservation) => (
                        <TableRow key={obs.id}>
                          <TableCell className="text-xs font-mono">
                            {new Date(obs.measuredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">
                            {obs.systolicBp && obs.diastolicBp ? `${obs.systolicBp}/${obs.diastolicBp}` : '-'}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{obs.pulseRate ? `${obs.pulseRate} bpm` : '-'}</TableCell>
                          <TableCell className="text-xs">
                            {obs.temperature ? `${obs.temperature}°${obs.temperatureUnit || 'C'}` : '-'}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {obs.oxygenSaturation ? `${obs.oxygenSaturation}%` : '-'}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-semibold">
                            {obs.bmi || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: DIAGNOSES */}
        <TabsContent value="diagnoses">
          <Card className="border border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Diagnoses & Clinical Coding</CardTitle>
              <CardDescription>
                Manual diagnoses recorded directly by the attending physician. AI does not infer diagnoses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isLocked && (
                <form onSubmit={handleAddDiagnosis} className="p-4 bg-slate-50 border rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Diagnosis Description <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Type 2 Diabetes Mellitus without complications"
                        value={diagDescription}
                        onChange={(e) => setDiagDescription(e.target.value)}
                        className="text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Code (Optional)</label>
                      <Input
                        placeholder="e.g. E11.9"
                        value={diagCode}
                        onChange={(e) => setDiagCode(e.target.value)}
                        className="text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Priority</label>
                      <select
                        value={diagType}
                        onChange={(e) => setDiagType(e.target.value as any)}
                        className="w-full text-sm border rounded-md p-2 bg-white"
                      >
                        <option value="PRIMARY">PRIMARY Diagnosis</option>
                        <option value="SECONDARY">SECONDARY Diagnosis</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-slate-600 font-medium">Status:</span>
                      <select
                        value={diagStatus}
                        onChange={(e) => setDiagStatus(e.target.value as any)}
                        className="text-xs border rounded p-1 bg-white"
                      >
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PROVISIONAL">PROVISIONAL</option>
                        <option value="DIFFERENTIAL">DIFFERENTIAL</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </div>

                    <Button type="submit" size="sm" className="bg-clinical-600 hover:bg-clinical-700 text-white text-xs">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Diagnosis
                    </Button>
                  </div>
                </form>
              )}

              {/* Diagnosis List */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Type</TableHead>
                    <TableHead>Diagnosis Description</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!encounter.diagnoses || encounter.diagnoses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                        No diagnoses added for this encounter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    encounter.diagnoses.map((d: EncounterDiagnosis) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Badge
                            variant={d.type === 'PRIMARY' ? 'default' : 'secondary'}
                            className={d.type === 'PRIMARY' ? 'bg-clinical-700 text-xs' : 'text-xs'}
                          >
                            {d.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm text-slate-900">
                          {d.diagnosisDescription}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {d.diagnosisCode ? `${d.diagnosisCode} (${d.codingSystem || 'ICD-10'})` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {d.clinicalStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!isLocked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDiagnosis(d.id)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: PRESCRIPTIONS */}
        <TabsContent value="prescriptions">
          <div className="space-y-6">
            {/* Existing Prescriptions */}
            {encounter.prescriptions && encounter.prescriptions.length > 0 && (
              <div className="space-y-4">
                {encounter.prescriptions.map((rx: any) => (
                  <Card key={rx.id} className="border border-slate-200">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold font-mono text-clinical-700">
                            {rx.prescriptionReference}
                          </CardTitle>
                          <Badge className="bg-emerald-100 text-emerald-800 text-xs">{rx.status}</Badge>
                          <Badge variant="outline" className="text-xs">Version {rx.version}</Badge>
                        </div>
                        <CardDescription>
                          Issued on {new Date(rx.createdAt).toLocaleDateString()} by {encounter.doctor?.fullName}
                        </CardDescription>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintPrescription(rx.id)}
                        className="text-xs"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" />
                        Print Official Rx
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead>Medication</TableHead>
                            <TableHead>Dosage Form & Strength</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead>Duration & Qty</TableHead>
                            <TableHead>Instructions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rx.items?.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <span className="font-semibold text-sm text-slate-900 block">
                                  {item.medicationName}
                                </span>
                                {item.genericName && (
                                  <span className="text-xs text-muted-foreground italic">
                                    {item.genericName}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {item.dosageForm || 'Tablet'} — {item.strength} ({item.dosage})
                              </TableCell>
                              <TableCell className="text-xs font-medium">{item.frequency}</TableCell>
                              <TableCell className="text-xs">
                                {item.duration} {item.quantity ? `(${item.quantity} units)` : ''}
                              </TableCell>
                              <TableCell className="text-xs text-slate-700">
                                {item.instructions || 'As advised'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Create New Rx (Only if not locked) */}
            {!isLocked ? (
              <Card className="border border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Write Outpatient Prescription</CardTitle>
                  <CardDescription>
                    Add medications with explicit dosage, route, frequency, and instructions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePrescription} className="space-y-4">
                    <div className="space-y-3">
                      {rxItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border rounded-lg space-y-2">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                            <span>Medication Item #{idx + 1}</span>
                            {rxItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRxItem(idx)}
                                className="text-rose-600 hover:text-rose-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div>
                              <Input
                                placeholder="Brand Name (e.g. Augmentin)"
                                value={item.medicationName}
                                onChange={(e) => handleRxItemChange(idx, 'medicationName', e.target.value)}
                                className="text-xs font-semibold"
                                required
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Generic (e.g. Amoxicillin/Clavulanate)"
                                value={item.genericName}
                                onChange={(e) => handleRxItemChange(idx, 'genericName', e.target.value)}
                                className="text-xs"
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Strength (e.g. 625mg)"
                                value={item.strength}
                                onChange={(e) => handleRxItemChange(idx, 'strength', e.target.value)}
                                className="text-xs"
                                required
                              />
                            </div>
                            <div>
                              <select
                                value={item.dosageForm}
                                onChange={(e) => handleRxItemChange(idx, 'dosageForm', e.target.value)}
                                className="w-full text-xs border rounded p-2 bg-white"
                              >
                                <option value="Tablet">Tablet</option>
                                <option value="Capsule">Capsule</option>
                                <option value="Syrup">Syrup / Suspension</option>
                                <option value="Injection">Injection</option>
                                <option value="Inhaler">Inhaler</option>
                                <option value="Drops">Eye/Ear Drops</option>
                                <option value="Ointment">Topical Ointment</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div>
                              <Input
                                placeholder="Dosage (e.g. 1 tablet)"
                                value={item.dosage}
                                onChange={(e) => handleRxItemChange(idx, 'dosage', e.target.value)}
                                className="text-xs"
                                required
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Frequency (e.g. Every 12 hrs)"
                                value={item.frequency}
                                onChange={(e) => handleRxItemChange(idx, 'frequency', e.target.value)}
                                className="text-xs"
                                required
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Duration (e.g. 7 days)"
                                value={item.duration}
                                onChange={(e) => handleRxItemChange(idx, 'duration', e.target.value)}
                                className="text-xs"
                                required
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Instructions (e.g. with meals)"
                                value={item.instructions}
                                onChange={(e) => handleRxItemChange(idx, 'instructions', e.target.value)}
                                className="text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Prescription Notes & Pharmacy Advice
                      </label>
                      <Input
                        placeholder="e.g. Dispense generic equivalent if approved..."
                        value={rxNotes}
                        onChange={(e) => setRxNotes(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddRxItem}
                        className="text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Another Medication
                      </Button>

                      <Button
                        type="submit"
                        size="sm"
                        className="bg-clinical-600 hover:bg-clinical-700 text-white text-xs font-semibold"
                      >
                        Save & Issue Prescription
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        {/* TAB 5: LAB ORDERS */}
        <TabsContent value="labs">
          <Card className="border border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Diagnostic Laboratory Orders</CardTitle>
                <CardDescription>
                  Directly linked to laboratory test catalog and verified result reports.
                </CardDescription>
              </div>
              <Link href={`/dashboard/laboratory`}>
                <Button size="sm" variant="outline" className="text-xs">
                  <FlaskConical className="h-3.5 w-3.5 mr-1" />
                  Order Lab Tests
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Order Reference</TableHead>
                    <TableHead>Ordered Tests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Samples</TableHead>
                    <TableHead>Report Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!encounter.laboratoryOrders || encounter.laboratoryOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        No laboratory orders created for this encounter yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    encounter.laboratoryOrders.map((ord: any) => (
                      <TableRow key={ord.id}>
                        <TableCell className="font-mono text-xs font-semibold text-clinical-700">
                          {ord.orderReference}
                        </TableCell>
                        <TableCell className="text-xs">
                          {ord.items?.map((it: any) => it.testName || it.packageName).join(', ') || 'Diagnostic Tests'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{ord.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ord.samples?.length || 0} sample(s)
                        </TableCell>
                        <TableCell>
                          {ord.reports && ord.reports.length > 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                              {ord.reports[0].reportStatus}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Awaiting Results</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: FOLLOW-UP & BILLING */}
        <TabsContent value="followups">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Follow-up Planner */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Follow-Up Recommendation</CardTitle>
                <CardDescription>Doctor-recommended return date and monitoring plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isLocked && (
                  <form onSubmit={handleCreateFollowup} className="p-3 bg-slate-50 border rounded-lg space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Recommended Date <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={followupDate}
                        onChange={(e) => setFollowupDate(e.target.value)}
                        className="text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Monitoring & Follow-up Instructions
                      </label>
                      <Input
                        placeholder="e.g. Review blood glucose log and repeat lipid profile in 1 week"
                        value={followupInstructions}
                        onChange={(e) => setFollowupInstructions(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <Button type="submit" size="sm" className="bg-clinical-600 hover:bg-clinical-700 text-white text-xs">
                      Set Follow-up
                    </Button>
                  </form>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase">Scheduled Follow-ups</h4>
                  {!encounter.followups || encounter.followups.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No follow-ups recorded.</p>
                  ) : (
                    encounter.followups.map((f: EncounterFollowup) => (
                      <div key={f.id} className="p-2.5 bg-slate-50 border rounded-md text-xs flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-slate-900">{f.recommendedDate}</span>
                          <p className="text-slate-600 mt-0.5">{f.instructions}</p>
                        </div>
                        <Badge variant="outline" className="text-[11px]">{f.status}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Linked Invoices */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Consultation Charges & Invoicing</CardTitle>
                <CardDescription>Financial records associated with this clinical visit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!encounter.invoices || encounter.invoices.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                    No invoice generated yet for this consultation.
                    <div className="mt-2">
                      <Link href="/dashboard/finance">
                        <Button size="sm" variant="outline" className="text-xs">
                          Open Finance Billing
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  encounter.invoices.map((inv: any) => (
                    <div key={inv.id} className="p-3 bg-slate-50 border rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-clinical-700">{inv.invoiceNumber}</span>
                        <Badge className="bg-emerald-100 text-emerald-800">{inv.paymentStatus}</Badge>
                      </div>
                      <div className="flex justify-between text-slate-700 pt-1">
                        <span>Total Due: PKR {inv.totalAmount}</span>
                        <span className="font-semibold text-emerald-700">Paid: PKR {inv.paidAmount}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 7: AUDIT & VERSIONS */}
        <TabsContent value="audit">
          <div className="space-y-6">
            {/* Document Snapshots */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Clinical Document Snapshots</CardTitle>
                <CardDescription>
                  Immutable signed version history created upon finalization and authorized amendments.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Version</TableHead>
                      <TableHead>Document Title</TableHead>
                      <TableHead>Signed By</TableHead>
                      <TableHead>Signed Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!encounter.documentVersions || encounter.documentVersions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                          No finalized document versions created yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      encounter.documentVersions.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-mono text-xs font-bold">v{doc.versionNumber}</TableCell>
                          <TableCell className="text-xs font-medium">{doc.documentTitle}</TableCell>
                          <TableCell className="text-xs">{encounter.doctor?.fullName || 'Physician'}</TableCell>
                          <TableCell className="text-xs font-mono">{new Date(doc.signedAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Signed & Immutable</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Amendments */}
            {encounter.amendments && encounter.amendments.length > 0 && (
              <Card className="border border-amber-200 bg-amber-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-amber-900">
                    Authorized Amendment Ledger
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {encounter.amendments.map((amend: any) => (
                    <div key={amend.id} className="p-3 bg-white border border-amber-200 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">Amendment v{amend.versionNumber}</span>
                        <span className="text-muted-foreground font-mono">{new Date(amend.amendedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-amber-800 font-medium">Reason: {amend.amendmentReason}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Status History */}
            <Card className="border border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Lifecycle Status Transitions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Timestamp</TableHead>
                      <TableHead>From Status</TableHead>
                      <TableHead>To Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {encounter.statusHistory?.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {new Date(h.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">{h.fromStatus || 'INIT'}</TableCell>
                        <TableCell className="text-xs font-semibold">{h.toStatus}</TableCell>
                        <TableCell className="text-xs text-slate-700">{h.changeReason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Finalize Confirmation Modal */}
      <Dialog open={isFinalizeModalOpen} onOpenChange={setIsFinalizeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Finalize Clinical Consultation
            </DialogTitle>
            <DialogDescription>
              This will lock the clinical encounter ({encounter.encounterReference}), mark it COMPLETED, and generate an immutable document version snapshot.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
            <p className="font-semibold">Doctor Clinical Confirmation:</p>
            <p>
              I, <strong>{encounter.doctor?.fullName}</strong>, confirm that all consultation notes, diagnoses, and prescriptions documented herein are accurate and complete.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsFinalizeModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              Confirm & Sign Final Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clinical Amendment Modal */}
      <Dialog open={isAmendModalOpen} onOpenChange={setIsAmendModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Edit3 className="h-5 w-5 text-amber-600" />
              Authorize Clinical Amendment
            </DialogTitle>
            <DialogDescription>
              Finalized clinical records cannot be overwritten. An amendment appends a new audit version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Clinical Justification / Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={amendmentReason}
                onChange={(e) => setAmendmentReason(e.target.value)}
                placeholder="State the medical reason for amending this consultation (e.g. Lab report arrived post-consultation)..."
                className="w-full text-xs border rounded-md p-2 bg-white"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsAmendModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAmend} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              Submit Amendment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Prescription Modal */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-clinical-600" />
              Official Prescription Document Preview
            </DialogTitle>
          </DialogHeader>

          <div className="border rounded-md p-4 bg-white">
            <iframe
              srcDoc={printHtml}
              title="Prescription Preview"
              className="w-full h-[550px] border-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                const w = window.open('', '_blank');
                if (w) {
                  w.document.write(printHtml);
                  w.document.close();
                  w.focus();
                  w.print();
                }
              }}
              className="bg-clinical-600 hover:bg-clinical-700 text-white"
            >
              Print Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
