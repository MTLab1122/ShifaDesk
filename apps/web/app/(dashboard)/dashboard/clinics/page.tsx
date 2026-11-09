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
import { Building2, Plus, Search, Edit2, Phone, Mail, MapPin, Loader2 } from 'lucide-react';

export default function ClinicsPage() {
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingClinic, setEditingClinic] = React.useState<Clinic | null>(null);

  // Form State
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const fetchClinics = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await ApiClient.clinics.list();
      setClinics(res.items || []);
    } catch {
      // Fallback demo clinics if offline
      setClinics([
        {
          id: 'clinic-1',
          organizationId: 'org-1',
          name: 'Al-Shifa Main Hospital Branch',
          slug: 'al-shifa-main',
          address: 'Plot 42, Sector F-8/3, Islamabad',
          phone: '+92 51 2233445',
          email: 'islamabad@alshifa.local',
          timezone: 'Asia/Karachi',
          status: 'ACTIVE' as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'clinic-2',
          organizationId: 'org-1',
          name: 'Al-Shifa Rawalpindi Outpatient Unit',
          slug: 'al-shifa-rwp',
          address: 'Main Murree Road, Rawalpindi',
          phone: '+92 51 4455667',
          email: 'rawalpindi@alshifa.local',
          timezone: 'Asia/Karachi',
          status: 'ACTIVE' as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    setModalOpen(true);
  };

  const handleOpenEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setName(clinic.name);
    setSlug(clinic.slug);
    setAddress(clinic.address || '');
    setPhone(clinic.phone || '');
    setEmail(clinic.email || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    setSubmitting(true);
    try {
      if (editingClinic) {
        await ApiClient.clinics.update(editingClinic.id, {
          name,
          slug,
          address,
          phone,
          email,
        });
      } else {
        await ApiClient.clinics.create({
          organizationId:
            ApiClient.getOrganizationId() || '00000000-0000-0000-0000-000000000000',
          name,
          slug,
          address,
          phone,
          email,
        });
      }
      await fetchClinics();
      setModalOpen(false);
    } catch {
      // Optimistic local update if API is unreachable
      if (editingClinic) {
        setClinics((prev) =>
          prev.map((c) =>
            c.id === editingClinic.id
              ? { ...c, name, slug, address, phone, email }
              : c,
          ),
        );
      } else {
        const newClinic: Clinic = {
          id: `local-${Date.now()}`,
          organizationId: 'local-org',
          name,
          slug,
          address,
          phone,
          email,
          timezone: 'Asia/Karachi',
          status: 'ACTIVE' as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setClinics((prev) => [newClinic, ...prev]);
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClinics = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinic Facilities</h1>
          <p className="text-muted-foreground text-sm">
            Manage outpatient facilities, consulting centers, and branch locations.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Clinic Branch
        </Button>
      </div>

      {/* Search & Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clinic branches..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total Branches: <span className="font-bold text-foreground">{clinics.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-clinical-600" />
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="text-center p-12 text-sm text-muted-foreground">
              No clinic facilities match your search criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility Name</TableHead>
                  <TableHead>Slug Identifier</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClinics.map((clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-clinical-600 shrink-0" />
                      <span>{clinic.name}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{clinic.slug}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {clinic.address ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {clinic.address}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="space-y-0.5">
                        {clinic.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {clinic.phone}
                          </div>
                        )}
                        {clinic.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {clinic.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={clinic.status === 'ACTIVE' ? 'clinical' : 'outline'}>
                        {clinic.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(clinic)}
                        className="gap-1 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingClinic ? 'Edit Clinic Facility' : 'Create Clinic Facility'}
            </DialogTitle>
            <DialogDescription>
              Configure clinic facility details, operational timezone, and contact information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Facility Name</label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingClinic) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, ''),
                    );
                  }
                }}
                placeholder="e.g. Al-Shifa Main Hospital"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Slug Identifier</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. al-shifa-main"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Physical Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Sector F-8/3, Islamabad"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Phone Number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 51 2233445"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Contact Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@clinic.com"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-clinical-600 hover:bg-clinical-700 text-white"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Facility'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
