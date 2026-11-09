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
import { StaffMember, Clinic } from '@matabai/shared';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  Loader2,
  Building2,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  Briefcase,
  FlaskConical,
} from 'lucide-react';

export default function ReceptionistsAndStaffPage() {
  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [designationFilter, setDesignationFilter] = React.useState<string>('ALL');
  const [clinicFilter, setClinicFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Modals & Form State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [selectedStaff, setSelectedStaff] = React.useState<StaffMember | null>(null);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);

  const [fullName, setFullName] = React.useState('');
  const [clinicId, setClinicId] = React.useState('');
  const [designation, setDesignation] = React.useState('RECEPTIONIST');
  const [department, setDepartment] = React.useState('Front Desk / OPD');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Alerts
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load clinics for assignment
  React.useEffect(() => {
    async function loadClinics() {
      try {
        const res = await ApiClient.clinics.list({ limit: 100 });
        setClinics(res.items || []);
        if (res.items && res.items.length > 0 && res.items[0]) {
          setClinicId(res.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load clinic list for staff assignment', err);
      }
    }
    loadClinics();
  }, []);

  const fetchStaff = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ApiClient.staff.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
        clinicId: clinicFilter !== 'ALL' ? clinicFilter : undefined,
        designation: designationFilter !== 'ALL' ? designationFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setStaffList(res.items || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.totalItems || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch staff members from API';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, clinicFilter, designationFilter, statusFilter]);

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFullName('');
    if (clinics.length > 0 && clinics[0]) setClinicId(clinics[0].id);
    setDesignation('RECEPTIONIST');
    setDepartment('Front Desk / OPD');
    setPhone('');
    setEmail('');
    setModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFullName(staff.fullName);
    setClinicId(staff.clinicId);
    setDesignation(staff.designation);
    setDepartment(staff.department);
    setPhone(staff.phone);
    setEmail(staff.email);
    setModalOpen(true);
  };

  const handleViewDetail = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setDetailModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !clinicId) {
      setErrorMsg('Please complete all required fields (Full Name, Clinic, Email, Phone).');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingStaff) {
        await ApiClient.staff.update(editingStaff.id, {
          fullName: fullName.trim(),
          designation: designation.trim(),
          department: department.trim(),
          phone: phone.trim(),
          email: email.trim(),
        });
        setSuccessMsg(`Staff record for "${fullName}" updated successfully`);
      } else {
        await ApiClient.staff.create({
          organizationId: ApiClient.getOrganizationId() || '00000000-0000-0000-0000-000000000000',
          clinicId,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          designation: designation.trim(),
          department: department.trim(),
          employmentStatus: 'ACTIVE',
        });
        setSuccessMsg(`Staff member "${fullName}" registered successfully`);
      }
      setModalOpen(false);
      await fetchStaff();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save staff record';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    const nextStatus = staff.employmentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await ApiClient.staff.updateStatus(staff.id, nextStatus as 'ACTIVE' | 'INACTIVE');
      setSuccessMsg(`Staff status updated to ${nextStatus}`);
      await fetchStaff();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update staff status';
      setErrorMsg(msg);
    }
  };

  const getDesignationBadge = (des: string) => {
    const d = des.toUpperCase();
    if (d.includes('RECEPTION')) {
      return (
        <Badge variant="clinical" className="text-xs">
          Receptionist
        </Badge>
      );
    }
    if (d.includes('LAB')) {
      return (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
          <FlaskConical className="h-3 w-3 mr-1" />
          Lab Staff
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        {des}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Members & Front Desk</h1>
          <p className="text-muted-foreground text-sm">
            Manage front-desk operators, receptionists, laboratory technicians, and clinic support personnel.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Staff Member
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
                placeholder="Search by name, email, or phone..."
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
              value={designationFilter}
              onChange={(e) => {
                setDesignationFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Designations</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="LAB_STAFF">Laboratory Staff</option>
              <option value="NURSE">Nurse</option>
              <option value="ADMIN_ASSISTANT">Admin Assistant</option>
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
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            Total Staff: <span className="font-semibold text-foreground">{totalCount}</span>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-clinical-600 mb-2" />
              <p className="text-sm">Loading staff members from database...</p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <UserCheck className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">No staff records match current criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Designation & Dept</TableHead>
                    <TableHead>Clinic Facility</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-clinical-50 text-clinical-600 flex items-center justify-center font-semibold text-xs shrink-0">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-sm block">{staff.fullName}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 mb-1">
                          {getDesignationBadge(staff.designation)}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {staff.department}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {staff.clinic?.name || 'Assigned Clinic'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span>{staff.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{staff.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={staff.employmentStatus === 'ACTIVE' ? 'clinical' : 'outline'}
                          className="text-xs"
                        >
                          {staff.employmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewDetail(staff)}
                            title="View Staff Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenEdit(staff)}
                            title="Edit Staff Member"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${
                              staff.employmentStatus === 'ACTIVE' ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                            onClick={() => handleToggleStatus(staff)}
                            title={staff.employmentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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

      {/* Add / Edit Staff Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff Profile' : 'Add Staff Member'}</DialogTitle>
            <DialogDescription>
              {editingStaff
                ? 'Update operational designation, contact, or clinic assignment.'
                : 'Register a front-desk receptionist, laboratory technician, or support staff member.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Full Name *</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Maryam Nawaz"
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
                <label className="text-xs font-semibold">Designation *</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={designation}
                  onChange={(e) => {
                    setDesignation(e.target.value);
                    if (e.target.value === 'LAB_STAFF') setDepartment('Laboratory / Pathology');
                    else if (e.target.value === 'RECEPTIONIST') setDepartment('Front Desk / OPD');
                  }}
                  required
                >
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="LAB_STAFF">Laboratory Staff / Tech</option>
                  <option value="NURSE">Clinic Nurse</option>
                  <option value="ADMIN_ASSISTANT">Administrative Assistant</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Department *</label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Front Desk / Patient Intake"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Phone Number *</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 301 9876543"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Email Address *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reception@clinic.com"
                  required
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
                'Save Staff Member'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Staff Detail Dialog */}
      {selectedStaff && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-clinical-600" />
                <span>{selectedStaff.fullName}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedStaff.designation} &bull; {selectedStaff.department}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 text-xs py-2">
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Facility</span>
                <span className="text-foreground">{selectedStaff.clinic?.name || 'Assigned Clinic'}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Employment Status</span>
                <Badge variant={selectedStaff.employmentStatus === 'ACTIVE' ? 'clinical' : 'outline'}>
                  {selectedStaff.employmentStatus}
                </Badge>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Phone</span>
                <span>{selectedStaff.phone}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Email</span>
                <span>{selectedStaff.email}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Created At</span>
                <span>{new Date(selectedStaff.createdAt).toLocaleDateString()}</span>
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
