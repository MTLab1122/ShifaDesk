'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ApiClient } from '@/lib/api-client';
import { Patient, Clinic } from '@matabai/shared';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  Building2,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  FileCheck2,
  HeartHandshake,
} from 'lucide-react';

export default function PatientsPage() {
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [clinicFilter, setClinicFilter] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Modals & Form State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = React.useState<Patient | null>(null);

  const [fullName, setFullName] = React.useState('');
  const [clinicId, setClinicId] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [dateOfBirth, setDateOfBirth] = React.useState('');
  const [gender, setGender] = React.useState('Male');
  const [address, setAddress] = React.useState('');
  const [emergencyContactName, setEmergencyContactName] = React.useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = React.useState('');
  const [consentStatus, setConsentStatus] = React.useState('GRANTED');
  const [submitting, setSubmitting] = React.useState(false);

  // Alerts
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load clinics for assignment & filter
  React.useEffect(() => {
    async function loadClinics() {
      try {
        const res = await ApiClient.clinics.list({ limit: 100 });
        setClinics(res.items || []);
        if (res.items && res.items.length > 0 && res.items[0]) {
          setClinicId(res.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load clinic list for patients', err);
      }
    }
    loadClinics();
  }, []);

  const fetchPatients = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ApiClient.patients.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
        clinicId: clinicFilter !== 'ALL' ? clinicFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setPatients(res.items || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.totalItems || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch patients from API';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, clinicFilter, statusFilter]);

  React.useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleOpenRegister = () => {
    setEditingPatient(null);
    setFullName('');
    if (clinics.length > 0 && clinics[0]) setClinicId(clinics[0].id);
    setPhone('');
    setEmail('');
    setDateOfBirth('');
    setGender('Male');
    setAddress('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setConsentStatus('GRANTED');
    setModalOpen(true);
  };

  const handleOpenEdit = (pat: Patient) => {
    setEditingPatient(pat);
    setFullName(pat.fullName);
    setClinicId(pat.clinicId);
    setPhone(pat.phone);
    setEmail(pat.email || '');
    setDateOfBirth(pat.dateOfBirth ? (pat.dateOfBirth.split('T')[0] || '') : '');
    setGender(pat.gender || 'Male');
    setAddress(pat.address || '');
    setEmergencyContactName(pat.emergencyContactName || '');
    setEmergencyContactPhone(pat.emergencyContactPhone || '');
    setConsentStatus(pat.consentStatus || 'GRANTED');
    setModalOpen(true);
  };

  const handleViewDetail = (pat: Patient) => {
    setSelectedPatient(pat);
    setDetailModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !clinicId) {
      setErrorMsg('Please enter Patient Full Name, Clinic Facility, and Contact Phone.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingPatient) {
        await ApiClient.patients.update(editingPatient.id, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
          gender: gender || null,
          address: address.trim() || null,
          emergencyContactName: emergencyContactName.trim() || null,
          emergencyContactPhone: emergencyContactPhone.trim() || null,
          consentStatus,
        });
        setSuccessMsg(`Patient record "${fullName}" updated successfully`);
      } else {
        const created = await ApiClient.patients.create({
          organizationId: ApiClient.getOrganizationId() || '00000000-0000-0000-0000-000000000000',
          clinicId,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
          gender: gender || undefined,
          address: address.trim() || undefined,
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined,
          consentStatus,
        });
        setSuccessMsg(
          `Patient "${fullName}" registered with MRN: ${created.patientNumber || 'Assigned'}`,
        );
      }
      setModalOpen(false);
      await fetchPatients();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to save patient. Duplicate record or invalid data.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (pat: Patient) => {
    const nextStatus = pat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await ApiClient.patients.updateStatus(pat.id, nextStatus as 'ACTIVE' | 'INACTIVE');
      setSuccessMsg(`Patient status updated to ${nextStatus}`);
      await fetchPatients();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update patient status';
      setErrorMsg(msg);
    }
  };

  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Directory</h1>
          <p className="text-muted-foreground text-sm">
            Medical Record Numbers (MRN), outpatient demographics, emergency contacts, and consent records.
          </p>
        </div>
        <Button onClick={handleOpenRegister} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
          <UserPlus className="h-4 w-4" />
          Register Patient
        </Button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, MRN, or phone..."
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={clinicFilter}
              onChange={(e) => {
                setClinicFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Clinics</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Patients</option>
              <option value="INACTIVE">Inactive Records</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            Total Patients: <span className="font-semibold text-foreground">{totalCount}</span>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-clinical-600 mb-2" />
              <p className="text-sm">Loading patient records from database...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">No patients found matching current search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MRN</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Demographics</TableHead>
                    <TableHead>Consent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((pat) => {
                    const age = calculateAge(pat.dateOfBirth);
                    return (
                      <TableRow key={pat.id}>
                        <TableCell className="font-mono text-xs font-bold text-clinical-600">
                          {pat.patientNumber}
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-clinical-50 text-clinical-600 flex items-center justify-center text-xs shrink-0 font-medium">
                              <Users className="h-4 w-4" />
                            </div>
                            <span>{pat.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {pat.clinic?.name || 'Clinic Assigned'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{pat.phone}</span>
                          </div>
                          {pat.email && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span>{pat.email}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {age !== null ? `${age} yrs` : 'Age N/A'}
                          {pat.gender && ` • ${pat.gender}`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={pat.consentStatus === 'GRANTED' ? 'clinical' : 'outline'}
                            className="text-xs"
                          >
                            <FileCheck2 className="h-3 w-3 mr-1" />
                            {pat.consentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={pat.status === 'ACTIVE' ? 'clinical' : 'outline'}
                            className="text-xs"
                          >
                            {pat.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewDetail(pat)}
                              title="View Patient Chart"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenEdit(pat)}
                              title="Edit Patient Details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 ${
                                pat.status === 'ACTIVE' ? 'text-amber-600' : 'text-emerald-600'
                              }`}
                              onClick={() => handleToggleStatus(pat)}
                              title={pat.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <div>
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="h-8 gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="h-8 gap-1"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register / Edit Patient Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'Edit Patient Record' : 'Register New Patient'}</DialogTitle>
            <DialogDescription>
              {editingPatient
                ? 'Update patient demographics, emergency contacts, or consent record.'
                : 'Create outpatient record. Patient number (MRN) is automatically generated by system.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Patient Full Name *</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Muhammad Tariq"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Assigned Clinic *</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value)}
                  required
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Mobile Phone (PK/E.164) *</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Email Address (Optional)</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Date of Birth</label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Gender</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Consent Status</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={consentStatus}
                  onChange={(e) => setConsentStatus(e.target.value)}
                >
                  <option value="GRANTED">GRANTED (Data & Care Consent)</option>
                  <option value="REVOKED">REVOKED (Withdrawn Consent)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Residential Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House 12, Street 4, Sector F-8, Islamabad"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1">
                  <HeartHandshake className="h-3 w-3 text-clinical-600" />
                  Emergency Contact Name
                </label>
                <Input
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Khadija Bibi (Spouse / Guardian)"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Emergency Contact Phone</label>
                <Input
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="+92 321 7654321"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-clinical-600 hover:bg-clinical-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Patient Record'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-clinical-600" />
                <span>{selectedPatient.fullName}</span>
              </DialogTitle>
              <DialogDescription>
                MRN: <span className="font-mono font-bold text-clinical-600">{selectedPatient.patientNumber}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 text-xs py-2">
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Facility</span>
                <span>{selectedPatient.clinic?.name || 'Clinic Assigned'}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Record Status</span>
                <Badge variant={selectedPatient.status === 'ACTIVE' ? 'clinical' : 'outline'}>
                  {selectedPatient.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Demographics</span>
                <span>
                  {calculateAge(selectedPatient.dateOfBirth)
                    ? `${calculateAge(selectedPatient.dateOfBirth)} years old`
                    : 'DOB not recorded'}
                  {selectedPatient.gender ? ` • ${selectedPatient.gender}` : ''}
                </span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Consent</span>
                <Badge variant={selectedPatient.consentStatus === 'GRANTED' ? 'clinical' : 'outline'}>
                  {selectedPatient.consentStatus}
                </Badge>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Phone</span>
                <span>{selectedPatient.phone}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Email</span>
                <span>{selectedPatient.email || 'None'}</span>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="font-semibold text-muted-foreground block">Address</span>
                <span>{selectedPatient.address || 'Address not registered'}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Emergency Contact</span>
                <span>{selectedPatient.emergencyContactName || 'None'}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Emergency Phone</span>
                <span>{selectedPatient.emergencyContactPhone || 'None'}</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}
