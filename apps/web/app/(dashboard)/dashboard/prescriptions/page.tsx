'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiClient } from '@/lib/api-client';
import { Prescription, PrescriptionStatus } from '@matabai/shared';
import {
  Pill,
  Search,
  RefreshCw,
  Printer,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function PrescriptionsRegistryPage() {
  const [prescriptions, setPrescriptions] = React.useState<Prescription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [printHtml, setPrintHtml] = React.useState('');

  const loadPrescriptions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.encounter.listPrescriptions({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as any),
        search: search || undefined,
        limit: 50,
      });
      setPrescriptions(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  React.useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handlePrint = async (id: string) => {
    try {
      const res = await ApiClient.encounter.getPrescriptionHtml(id);
      setPrintHtml(res.html);
      setIsPrintModalOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to load printable prescription');
    }
  };

  const getStatusBadge = (status: PrescriptionStatus | string) => {
    switch (status) {
      case PrescriptionStatus.ACTIVE:
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Active</Badge>;
      case PrescriptionStatus.AMENDED:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Amended</Badge>;
      case PrescriptionStatus.CANCELLED:
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Cancelled</Badge>;
      case PrescriptionStatus.DISPENSED:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Dispensed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Pill className="h-6 w-6 text-clinical-600" />
            Prescriptions Registry & Pharmacy
          </h1>
          <p className="text-sm text-muted-foreground">
            Official outpatient prescriptions, version histories, and printable Rx layouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadPrescriptions()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <Card className="border border-slate-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medication, patient, RX..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              {['ALL', 'ACTIVE', 'AMENDED', 'DISPENSED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-clinical-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Reference</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Prescribing Doctor</TableHead>
                <TableHead>Medications</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-clinical-600" />
                    Loading prescriptions...
                  </TableCell>
                </TableRow>
              ) : prescriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No prescriptions found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                prescriptions.map((rx) => (
                  <TableRow key={rx.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs font-semibold text-clinical-700">
                      {rx.prescriptionReference}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm text-slate-900">{rx.patient?.fullName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {rx.patient?.patientNumber || rx.patientId.substring(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-800">{rx.doctor?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{rx.clinic?.name || rx.doctor?.specialty || 'Clinic'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-slate-800">
                        {rx.items?.map((it) => it.medicationName).join(', ') || 'Medications'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {rx.items?.length || 0} medication item(s)
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        v{rx.version}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(rx.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(rx.id)}
                        className="text-xs"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" />
                        Print Rx
                      </Button>
                      <Link href={`/dashboard/encounters/${rx.encounterId}`}>
                        <Button size="sm" variant="ghost" className="text-xs">
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Encounter
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

      {/* Print Modal */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-clinical-600" />
              Prescription Document Preview
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
