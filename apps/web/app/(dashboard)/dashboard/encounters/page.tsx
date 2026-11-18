'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiClient } from '@/lib/api-client';
import {
  ClinicalEncounter,
  EncounterStatus,
  Patient,
  Doctor,
  Clinic,
} from '@matabai/shared';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  ArrowRight,
} from 'lucide-react';

export default function EncountersListPage() {
  const router = useRouter();
  const [encounters, setEncounters] = React.useState<ClinicalEncounter[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  // New Encounter Modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [formPatientId, setFormPatientId] = React.useState('');
  const [formDoctorId, setFormDoctorId] = React.useState('');
  const [formClinicId, setFormClinicId] = React.useState('');
  const [formSource, setFormSource] = React.useState<any>('WALK_IN');
  const [formType, setFormType] = React.useState<any>('GENERAL_CONSULTATION');
  const [formChiefComplaint, setFormChiefComplaint] = React.useState('');
  const [formVisitPurpose, setFormVisitPurpose] = React.useState('');
  const [formVisitContext, setFormVisitContext] = React.useState('');

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [encRes, patRes, docRes, cliRes] = await Promise.all([
        ApiClient.encounter.list({
          status: statusFilter === 'ALL' ? undefined : (statusFilter as any),
          search: search || undefined,
          limit: 50,
        }),
        ApiClient.patients.list({ limit: 100 }),
        ApiClient.doctors.list({ limit: 50 }),
        ApiClient.clinics.list({ limit: 100 }),
      ]);

      setEncounters(encRes.items || []);
      setPatients(patRes.items || []);
      setDoctors(docRes.items || []);
      setClinics(cliRes.items || []);

      if (cliRes.items && cliRes.items.length > 0 && !formClinicId) {
        setFormClinicId(cliRes.items[0]!.id);
      }
      if (docRes.items && docRes.items.length > 0 && !formDoctorId) {
        setFormDoctorId(docRes.items[0]!.id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load clinical encounters');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, formClinicId, formDoctorId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientId || !formDoctorId || !formClinicId) {
      setError('Please select Clinic, Patient, and Attending Doctor');
      return;
    }
    if (!formChiefComplaint.trim()) {
      setError('Chief complaint is required to start a clinical encounter');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const created = await ApiClient.encounter.create({
        clinicId: formClinicId,
        patientId: formPatientId,
        doctorId: formDoctorId,
        source: formSource,
        type: formType,
        chiefComplaint: formChiefComplaint.trim(),
        visitPurpose: formVisitPurpose.trim() || undefined,
        visitContext: formVisitContext.trim() || undefined,
      });

      setIsModalOpen(false);
      setFormChiefComplaint('');
      setFormVisitPurpose('');
      setFormVisitContext('');
      // Navigate straight to the consultation workspace
      router.push(`/dashboard/encounters/${created.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to start clinical encounter');
      setCreating(false);
    }
  };

  const getStatusBadge = (status: EncounterStatus | string) => {
    switch (status) {
      case EncounterStatus.IN_PROGRESS:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">In Progress</Badge>;
      case EncounterStatus.CHECKED_IN:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Checked In</Badge>;
      case EncounterStatus.PENDING_REVIEW:
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Pending Review</Badge>;
      case EncounterStatus.COMPLETED:
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Completed (Locked)</Badge>;
      case EncounterStatus.CANCELLED:
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeCount = encounters.filter((e) => e.status === EncounterStatus.IN_PROGRESS).length;
  const checkedInCount = encounters.filter((e) => e.status === EncounterStatus.CHECKED_IN).length;
  const completedCount = encounters.filter((e) => e.status === EncounterStatus.COMPLETED).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-clinical-600" />
            Clinical Encounters & EMR-Lite
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage patient visits, documentation, vitals, prescriptions, and longitudinal charts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-clinical-600 hover:bg-clinical-700 text-white"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Start New Consultation
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{activeCount}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Checked In</p>
                <h3 className="text-2xl font-bold text-blue-600 mt-1">{checkedInCount}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <User className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Visits</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{encounters.length}</h3>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters & Search */}
      <Card className="border border-slate-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reference or patient..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              {['ALL', 'IN_PROGRESS', 'CHECKED_IN', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-clinical-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Encounter Registry</CardTitle>
          <CardDescription>
            Official clinical consultation records with full audit trail and immutable finalization.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Reference</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type & Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-clinical-600" />
                    Loading clinical encounters...
                  </TableCell>
                </TableRow>
              ) : encounters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No clinical encounters found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                encounters.map((enc) => (
                  <TableRow key={enc.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs font-semibold text-clinical-700">
                      {enc.encounterReference}
                      {enc.isFinalized && (
                        <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-sans">
                          Locked
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm text-slate-900">
                        {enc.patient?.fullName || 'Patient'}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {enc.patient?.patientNumber || enc.patientId.substring(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-800 flex items-center gap-1">
                        <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                        {enc.doctor?.fullName || 'Attending Doctor'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {enc.doctor?.specialty || enc.clinic?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{enc.encounterDate}</div>
                      <div className="text-xs text-muted-foreground">
                        {enc.startTime} {enc.endTime ? `- ${enc.endTime}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {enc.type.replace('_', ' ')}
                      </Badge>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        via {enc.source.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(enc.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/dashboard/patients/${enc.patientId}/clinical-history`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Chart
                        </Button>
                      </Link>
                      <Link href={`/dashboard/encounters/${enc.id}`}>
                        <Button size="sm" className="bg-clinical-600 hover:bg-clinical-700 text-white text-xs">
                          Open Consultation
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
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

      {/* Start Encounter Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-clinical-600" />
              Start Clinical Encounter
            </DialogTitle>
            <DialogDescription>
              Initiate an official patient consultation visit. This creates a dedicated clinical encounter record.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEncounter} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Clinic</label>
                <select
                  value={formClinicId}
                  onChange={(e) => setFormClinicId(e.target.value)}
                  className="w-full text-sm border rounded-md p-2 bg-white"
                  required
                >
                  <option value="">Select Clinic...</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Attending Doctor</label>
                <select
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                  className="w-full text-sm border rounded-md p-2 bg-white"
                  required
                >
                  <option value="">Select Doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.specialty || 'General'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Patient</label>
              <select
                value={formPatientId}
                onChange={(e) => setFormPatientId(e.target.value)}
                className="w-full text-sm border rounded-md p-2 bg-white"
                required
              >
                <option value="">Select Patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.patientNumber || p.phone || 'ID: ' + p.id.substring(0, 6)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Encounter Source</label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full text-sm border rounded-md p-2 bg-white"
                >
                  <option value="WALK_IN">Walk-In Patient</option>
                  <option value="APPOINTMENT">Scheduled Appointment</option>
                  <option value="DOCTOR_INITIATED">Doctor Initiated</option>
                  <option value="RECEPTIONIST_ASSISTED">Receptionist Assisted</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Encounter Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full text-sm border rounded-md p-2 bg-white"
                >
                  <option value="GENERAL_CONSULTATION">General Consultation</option>
                  <option value="FOLLOW_UP">Follow-up Visit</option>
                  <option value="ROUTINE_CHECKUP">Routine Checkup</option>
                  <option value="EMERGENCY">Emergency / Urgent</option>
                  <option value="TELEMEDICINE">Telemedicine</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Chief Complaint <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Fever, persistent cough for 3 days, body aches"
                value={formChiefComplaint}
                onChange={(e) => setFormChiefComplaint(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Visit Purpose (Optional)</label>
                <Input
                  placeholder="e.g. Initial evaluation, lab report review"
                  value={formVisitPurpose}
                  onChange={(e) => setFormVisitPurpose(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Visit Context (Optional)</label>
                <Input
                  placeholder="e.g. Accompanied by family, referred by Dr. Ali"
                  value={formVisitContext}
                  onChange={(e) => setFormVisitContext(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-clinical-600 hover:bg-clinical-700 text-white"
              >
                {creating ? 'Starting...' : 'Start Consultation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
