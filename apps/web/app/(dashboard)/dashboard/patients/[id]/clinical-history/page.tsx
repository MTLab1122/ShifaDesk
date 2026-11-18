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
import { ApiClient } from '@/lib/api-client';
import { PatientClinicalHistory } from '@matabai/shared';
import {
  FileText,
  AlertTriangle,
  Heart,
  Pill,
  ChevronLeft,
  RefreshCw,
  Edit,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function PatientClinicalHistoryChartPage() {
  const params = useParams();
  const patientId = params?.id as string;

  const [chart, setChart] = React.useState<PatientClinicalHistory | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Edit Medical History Modal
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [allergies, setAllergies] = React.useState('');
  const [conditions, setConditions] = React.useState('');
  const [surgeries, setSurgeries] = React.useState('');
  const [currentMeds, setCurrentMeds] = React.useState('');
  const [familyHistory, setFamilyHistory] = React.useState('');
  const [socialHistory, setSocialHistory] = React.useState('');
  const [savingMedHistory, setSavingMedHistory] = React.useState(false);

  const loadChart = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.encounter.getPatientClinicalHistory(patientId);
      setChart(data);

      if (data.medicalHistory) {
        setAllergies(data.medicalHistory.allergies || '');
        setConditions(data.medicalHistory.conditions || '');
        setSurgeries(data.medicalHistory.surgeries || '');
        setCurrentMeds(data.medicalHistory.currentMedications || '');
        setFamilyHistory(data.medicalHistory.familyHistory || '');
        setSocialHistory(data.medicalHistory.socialHistory || '');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load patient clinical history');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  React.useEffect(() => {
    loadChart();
  }, [loadChart]);

  const handleSaveMedicalHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingMedHistory(true);
      setError(null);
      await ApiClient.encounter.savePatientMedicalHistory(patientId, {
        allergies: allergies.trim() || undefined,
        conditions: conditions.trim() || undefined,
        surgeries: surgeries.trim() || undefined,
        currentMedications: currentMeds.trim() || undefined,
        familyHistory: familyHistory.trim() || undefined,
        socialHistory: socialHistory.trim() || undefined,
      });

      setIsEditModalOpen(false);
      setSuccessMsg('Patient medical background updated.');
      setTimeout(() => setSuccessMsg(null), 3500);
      loadChart();
    } catch (err: any) {
      setError(err?.message || 'Failed to update medical history');
    } finally {
      setSavingMedHistory(false);
    }
  };

  if (loading && !chart) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin text-clinical-600 mb-3" />
        <p>Loading patient longitudinal chart...</p>
      </div>
    );
  }

  if (!chart) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Chart Not Found</h2>
        <Link href="/dashboard/encounters">
          <Button variant="outline" className="mt-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Registry
          </Button>
        </Link>
      </div>
    );
  }

  const patient = chart.patient;
  const medHistory = chart.medicalHistory;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/encounters">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-clinical-600" />
              Longitudinal EMR-Lite Chart — {patient?.fullName}
            </h1>
            <p className="text-xs text-muted-foreground">
              MRN: <span className="font-mono">{patient?.patientNumber || patientId.substring(0, 8)}</span> | Gender:{' '}
              {patient?.gender || 'Unspecified'} | Phone: {patient?.phone || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)} className="text-xs">
            <Edit className="h-3.5 w-3.5 mr-1" />
            Edit Medical Background
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadChart()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

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

      {/* Allergies & Critical Medical Background Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Allergies Alert */}
        <Card className={`border ${medHistory?.allergies ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Known Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medHistory?.allergies ? (
              <p className="text-sm font-semibold text-rose-950">{medHistory.allergies}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">No known drug or environmental allergies recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Chronic Conditions */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-clinical-600" />
              Chronic Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medHistory?.conditions ? (
              <p className="text-xs text-slate-800 font-medium">{medHistory.conditions}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">None documented.</p>
            )}
          </CardContent>
        </Card>

        {/* Current Active Medications */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Pill className="h-4 w-4 text-emerald-600" />
              Current Regular Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medHistory?.currentMedications ? (
              <p className="text-xs text-slate-800 font-medium">{medHistory.currentMedications}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">None recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Consultations Timeline */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Consultation History ({chart.encounters.length})</CardTitle>
          <CardDescription>All recorded clinical encounters and visits for this patient.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Attending Doctor</TableHead>
                <TableHead>Chief Complaint & Summary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chart.encounters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                    No clinical encounters on file for this patient.
                  </TableCell>
                </TableRow>
              ) : (
                chart.encounters.map((enc: any) => (
                  <TableRow key={enc.id}>
                    <TableCell className="font-medium text-xs text-slate-900">{enc.encounterDate}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-clinical-700">{enc.encounterReference}</TableCell>
                    <TableCell className="text-xs">
                      {enc.doctor?.fullName || 'Physician'}
                      <span className="text-[11px] text-muted-foreground block">{enc.clinic?.name}</span>
                    </TableCell>
                    <TableCell className="text-xs max-w-sm">
                      <span className="font-semibold text-slate-900 block truncate">
                        {enc.clinicalNote?.chiefComplaint || 'Consultation'}
                      </span>
                      {enc.clinicalNote?.clinicalAssessment && (
                        <span className="text-slate-600 block text-[11px] truncate">
                          {enc.clinicalNote.clinicalAssessment}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {enc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/encounters/${enc.id}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          View
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Observations & Vitals Trend */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Longitudinal Vitals Log</CardTitle>
          <CardDescription>Chronological history of recorded physiological measurements.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Recorded At</TableHead>
                <TableHead>Blood Pressure</TableHead>
                <TableHead>Pulse</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>SpO2</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>BMI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chart.observations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                    No vitals recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                chart.observations.map((obs) => (
                  <TableRow key={obs.id}>
                    <TableCell className="text-xs font-mono">
                      {new Date(obs.measuredAt).toLocaleDateString()} {new Date(obs.measuredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {obs.systolicBp && obs.diastolicBp ? `${obs.systolicBp}/${obs.diastolicBp} mmHg` : '-'}
                    </TableCell>
                    <TableCell className="text-xs">{obs.pulseRate ? `${obs.pulseRate} bpm` : '-'}</TableCell>
                    <TableCell className="text-xs">
                      {obs.temperature ? `${obs.temperature}°${obs.temperatureUnit || 'C'}` : '-'}
                    </TableCell>
                    <TableCell className="text-xs">{obs.oxygenSaturation ? `${obs.oxygenSaturation}%` : '-'}</TableCell>
                    <TableCell className="text-xs">{obs.weightKg ? `${obs.weightKg} kg` : '-'}</TableCell>
                    <TableCell className="text-xs font-mono font-bold text-slate-800">{obs.bmi || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Medical History Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Patient Medical Background</DialogTitle>
            <DialogDescription>
              Maintain long-term patient medical background information.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMedicalHistory} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-rose-800 block mb-1">
                Known Drug & Environmental Allergies
              </label>
              <Input
                placeholder="e.g. Penicillin, Sulfa drugs, Peanuts..."
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Chronic Medical Conditions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma..."
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  className="w-full text-xs border rounded p-2"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Past Surgeries & Procedures
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Appendectomy (2018), Cholecystectomy (2021)..."
                  value={surgeries}
                  onChange={(e) => setSurgeries(e.target.value)}
                  className="w-full text-xs border rounded p-2"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Current Regular Medications
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Amlodipine 5mg OD, Metformin 500mg BD..."
                value={currentMeds}
                onChange={(e) => setCurrentMeds(e.target.value)}
                className="w-full text-xs border rounded p-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Family History</label>
                <Input
                  placeholder="e.g. Father: IHD, Mother: Diabetes"
                  value={familyHistory}
                  onChange={(e) => setFamilyHistory(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Social History</label>
                <Input
                  placeholder="e.g. Non-smoker, sedentary lifestyle"
                  value={socialHistory}
                  onChange={(e) => setSocialHistory(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingMedHistory}
                className="bg-clinical-600 hover:bg-clinical-700 text-white"
              >
                {savingMedHistory ? 'Saving...' : 'Save Background'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
