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
import { Clinic } from '@matabai/shared';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Phone,
  Mail,
  MapPin,
  Loader2,
  Power,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function ClinicsPage() {
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Dialog & Form State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingClinic, setEditingClinic] = React.useState<Clinic | null>(null);
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [timezone, setTimezone] = React.useState('Asia/Karachi');
  const [submitting, setSubmitting] = React.useState(false);

  // Notification banners
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const fetchClinics = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ApiClient.clinics.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setClinics(res.items || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.totalItems || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load clinics from backend API';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  React.useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  const handleOpenAdd = () => {
    setEditingClinic(null);
    setName('');
    setSlug('');
    setAddress('');
    setPhone('');
    setEmail('');
    setTimezone('Asia/Karachi');
    setModalOpen(true);
  };

  const handleOpenEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setName(clinic.name);
    setSlug(clinic.slug);
    setAddress(clinic.address || '');
    setPhone(clinic.phone || '');
    setEmail(clinic.email || '');
    setTimezone(clinic.timezone || 'Asia/Karachi');
    setModalOpen(true);
  };

  const handleSlugify = (val: string) => {
    setName(val);
    if (!editingClinic) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, ''),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingClinic) {
        await ApiClient.clinics.update(editingClinic.id, {
          name: name.trim(),
          slug: slug.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          timezone,
        });
        setSuccessMsg(`Clinic "${name}" updated successfully`);
      } else {
        await ApiClient.clinics.create({
          organizationId:
            ApiClient.getOrganizationId() || '00000000-0000-0000-0000-000000000000',
          name: name.trim(),
          slug: slug.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          timezone,
          status: 'ACTIVE',
        });
        setSuccessMsg(`Clinic "${name}" registered successfully`);
      }
      setModalOpen(false);
      await fetchClinics();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save clinic. Check unique slug constraints.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (clinic: Clinic) => {
    const nextStatus = clinic.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await ApiClient.clinics.updateStatus(clinic.id, nextStatus);
      setSuccessMsg(`Clinic status changed to ${nextStatus}`);
      await fetchClinics();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update clinic status';
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinic Facilities & Branches</h1>
          <p className="text-muted-foreground text-sm">
            Manage multi-branch physical clinic locations, operational timezones, and facility profiles.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Clinic Facility
        </Button>
      </div>

      {/* Alert Notifications */}
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
                placeholder="Search by clinic name, address, or phone..."
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
            Total Facilities: <span className="font-semibold text-foreground">{totalCount}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-clinical-600 mb-2" />
              <p className="text-sm">Loading clinic records from database...</p>
            </div>
          ) : clinics.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">No clinics found matching current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clinic Name & Slug</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clinics.map((clinic) => (
                    <TableRow key={clinic.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-clinical-50 text-clinical-600 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-sm block">{clinic.name}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">/{clinic.slug}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {clinic.address ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {clinic.address}
                          </span>
                        ) : (
                          <span className="italic">Address pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground space-y-0.5">
                        {clinic.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{clinic.phone}</span>
                          </div>
                        )}
                        {clinic.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span>{clinic.email}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {clinic.timezone}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={clinic.status === 'ACTIVE' ? 'clinical' : 'outline'}
                          className="text-xs"
                        >
                          {clinic.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenEdit(clinic)}
                            title="Edit Clinic"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${
                              clinic.status === 'ACTIVE' ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                            onClick={() => handleToggleStatus(clinic)}
                            title={clinic.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
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

      {/* Add / Edit Clinic Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editingClinic ? 'Edit Clinic Facility' : 'Register New Clinic'}</DialogTitle>
            <DialogDescription>
              {editingClinic
                ? 'Update clinic operating parameters and contact information.'
                : 'Configure a new outpatient branch facility under your organization.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Clinic Facility Name *</label>
              <Input
                placeholder="e.g. Al-Shifa Community Clinic (Main Branch)"
                value={name}
                onChange={(e) => handleSlugify(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">URL Identifier Slug *</label>
              <Input
                placeholder="e.g. al-shifa-main"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Physical Facility Address</label>
              <Input
                placeholder="e.g. Plot 42-B, Sector G-9 Markaz, Islamabad"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Reception Phone</label>
                <Input
                  placeholder="e.g. +92 51 2289901"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Clinic Email</label>
                <Input
                  type="email"
                  placeholder="e.g. reception@alshifa.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Timezone</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Asia/Karachi">Asia/Karachi (PKT +05:00)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                <option value="UTC">UTC (Universal Time)</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingClinic ? 'Save Changes' : 'Register Clinic'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
