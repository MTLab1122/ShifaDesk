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
import { Doctor, Clinic } from '@matabai/shared';
import {
  Stethoscope,
  Plus,
  Search,
  Edit2,
  Phone,
  Mail,
  Loader2,
  Power,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Eye,
} from 'lucide-react';

export default function DoctorsPage() {
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [clinicFilter, setClinicFilter] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Form State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [selectedDoctor, setSelectedDoctor] = React.useState<Doctor | null>(null);
  const [editingDoctor, setEditingDoctor] = React.useState<Doctor | null>(null);

  const [fullName, setFullName] = React.useState('');
  const [clinicId, setClinicId] = React.useState('');
  const [specialty, setSpecialty] = React.useState('General Medicine');
  const [qualification, setQualification] = React.useState('MBBS');
  const [registrationNumber, setRegistrationNumber] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [consultationFee, setConsultationFee] = React.useState('2000');
  const [biography, setBiography] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Alerts
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load clinics for select inputs
  React.useEffect(() => {
    async function loadClinics() {
      try {
        const res = await ApiClient.clinics.list({ limit: 100 });
        setClinics(res.items || []);
        if (res.items && res.items.length > 0 && res.items[0]) {
          setClinicId(res.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load clinic list for selection', err);
      }
    }
    loadClinics();
  }, []);

  const fetchDoctors = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ApiClient.doctors.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        clinicId: clinicFilter !== 'ALL' ? clinicFilter : undefined,
      });
      setDoctors(res.items || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.totalItems || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch doctors from API';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, clinicFilter]);

  React.useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setFullName('');
    if (clinics.length > 0 && clinics[0]) setClinicId(clinics[0].id);
    setSpecialty('General Medicine');
    setQualification('MBBS');
    setRegistrationNumber('');
    setPhone('');
    setEmail('');
    setConsultationFee('2000');
    setBiography('');
    setModalOpen(true);
  };

  const handleOpenEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setFullName(doc.fullName);
    setClinicId(doc.clinicId);
    setSpecialty(doc.specialty);
    setQualification(doc.qualification);
    setRegistrationNumber(doc.registrationNumber === '***RESTRICTED***' ? '' : (doc.registrationNumber || ''));
    setPhone(doc.phone || '');
    setEmail(doc.email || '');
    setConsultationFee(String(doc.consultationFee || 2000));
    setBiography(doc.biography || '');
    setModalOpen(true);
  };

  const handleViewDetail = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setDetailModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !specialty.trim() || !qualification.trim() || !phone.trim() || !clinicId) {
      setErrorMsg('Please fill in all required fields (Name, Clinic, Specialty, Qualification, Phone).');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingDoctor) {
        await ApiClient.doctors.update(editingDoctor.id, {
          fullName: fullName.trim(),
          specialty: specialty.trim(),
          qualification: qualification.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          registrationNumber: registrationNumber.trim() || undefined,
          consultationFee: Number(consultationFee) || 2000,
          biography: biography.trim() || undefined,
        });
        setSuccessMsg(`Doctor "${fullName}" updated successfully`);
      } else {
        await ApiClient.doctors.create({
          organizationId: ApiClient.getOrganizationId() || '00000000-0000-0000-0000-000000000000',
          clinicId,
          fullName: fullName.trim(),
          specialty: specialty.trim(),
          qualification: qualification.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          registrationNumber: registrationNumber.trim() || undefined,
          consultationFee: Number(consultationFee) || 2000,
          biography: biography.trim() || undefined,
        });
        setSuccessMsg(`Doctor "${fullName}" added to roster successfully`);
      }
      setModalOpen(false);
      await fetchDoctors();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save doctor profile';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (doc: Doctor) => {
    const nextStatus = doc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await ApiClient.doctors.updateStatus(doc.id, nextStatus as 'ACTIVE' | 'INACTIVE');
      setSuccessMsg(`Doctor status changed to ${nextStatus}`);
      await fetchDoctors();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update doctor status';
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Physicians & Consultants</h1>
          <p className="text-muted-foreground text-sm">
            Clinical specialties, licensing registrations, consulting fees, and clinic assignments.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Doctor Profile
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
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by doctor name or specialty..."
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
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            Total Doctors: <span className="font-semibold text-foreground">{totalCount}</span>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-clinical-600 mb-2" />
              <p className="text-sm">Loading doctors roster from database...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Stethoscope className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">No doctors found matching current criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialty & Degree</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Registration No.</TableHead>
                    <TableHead>Consultation Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-clinical-50 text-clinical-600 flex items-center justify-center font-semibold text-xs shrink-0">
                            <Stethoscope className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-sm">{doc.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">{doc.specialty}</div>
                        <div className="text-[11px] text-muted-foreground">{doc.qualification}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {doc.clinic?.name || 'Clinic Assigned'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{doc.phone}</span>
                        </div>
                        {doc.email && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span>{doc.email}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {doc.registrationNumber === '***RESTRICTED***' ? (
                          <Badge variant="outline" className="font-mono text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Masked (Admin Only)
                          </Badge>
                        ) : doc.registrationNumber ? (
                          <span className="font-mono text-xs flex items-center gap-1 text-emerald-700">
                            <ShieldCheck className="h-3 w-3" />
                            {doc.registrationNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Unregistered</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        PKR {doc.consultationFee?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.status === 'ACTIVE' ? 'clinical' : 'outline'} className="text-xs">
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewDetail(doc)}
                            title="View Doctor Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenEdit(doc)}
                            title="Edit Doctor Profile"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${
                              doc.status === 'ACTIVE' ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                            onClick={() => handleToggleStatus(doc)}
                            title={doc.status === 'ACTIVE' ? 'Deactivate Doctor' : 'Activate Doctor'}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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

      {/* Add / Edit Doctor Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? 'Edit Doctor Profile' : 'Add New Physician'}</DialogTitle>
            <DialogDescription>
              {editingDoctor
                ? 'Update clinical specialty, consulting fee, or contact details.'
                : 'Register a physician with clinic credentials and consultation parameters.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Doctor Full Name *</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Haris Mehmood"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Specialty *</label>
                <Input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Cardiology / Internal Medicine"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Qualifications & Degrees *</label>
                <Input
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="MBBS, FCPS"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Medical Registration No.</label>
                <Input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="PMDC-12345-P"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Phone Number *</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Consultation Fee (PKR) *</label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  placeholder="2500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Email Address (Optional)</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Clinical Biography / Notes</label>
              <textarea
                className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-sm"
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Senior consultant with 10+ years experience in clinical cardiology..."
              />
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
                'Save Doctor Profile'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Doctor Detail Dialog */}
      {selectedDoctor && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-clinical-600" />
                <span>{selectedDoctor.fullName}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedDoctor.specialty} &bull; {selectedDoctor.qualification}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 text-xs py-2">
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Facility</span>
                <span className="text-foreground">{selectedDoctor.clinic?.name || 'Clinic Assigned'}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Status</span>
                <Badge variant={selectedDoctor.status === 'ACTIVE' ? 'clinical' : 'outline'}>
                  {selectedDoctor.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Registration License</span>
                <span className="font-mono">{selectedDoctor.registrationNumber || 'Not provided'}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Consultation Fee</span>
                <span className="font-semibold text-clinical-600">
                  PKR {selectedDoctor.consultationFee?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Phone Contact</span>
                <span>{selectedDoctor.phone}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Email</span>
                <span>{selectedDoctor.email || 'None'}</span>
              </div>
            </div>

            {selectedDoctor.biography && (
              <div className="p-3 bg-muted/40 rounded-md text-xs space-y-1">
                <span className="font-semibold text-muted-foreground block">Biography</span>
                <p className="text-foreground whitespace-pre-line">{selectedDoctor.biography}</p>
              </div>
            )}

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
