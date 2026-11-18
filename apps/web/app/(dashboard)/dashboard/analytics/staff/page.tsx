'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiClient } from '@/lib/api-client';
import { DoctorStaffAnalytics, Clinic } from '@matabai/shared';
import {
  ArrowLeft,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';

export default function StaffAnalyticsPage() {
  const [data, setData] = React.useState<DoctorStaffAnalytics | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<string>('30d');
  const [clinicId, setClinicId] = React.useState<string>('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.analytics.getStaff({
        period: period as any,
        clinicId: clinicId || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load staff analytics', err);
    } finally {
      setLoading(false);
    }
  }, [period, clinicId]);

  React.useEffect(() => {
    ApiClient.clinics.list().then((res) => {
      if (res?.items) setClinics(res.items);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Executive Analytics
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Doctor & Clinical Staff Workload</h1>
          <p className="text-sm text-muted-foreground">
            Objective operational throughput: appointments, consultations, durations, follow-ups, and lab orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background"
          >
            <option value="">All Clinics</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex rounded-md bg-muted p-1 text-xs">
            {['today', '7d', '30d', 'this_month'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded font-medium ${
                  period === p ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7d' ? '7D' : p === '30d' ? '30D' : 'Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Card className="h-48 animate-pulse bg-muted/20" />
      ) : data ? (
        <div className="space-y-6">
          {/* Workload Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Physician Operational Workload</CardTitle>
              <CardDescription>
                Comprehensive clinical activity records per registered practitioner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead className="text-right">Appts (Done / Total)</TableHead>
                    <TableHead className="text-right">Encounters</TableHead>
                    <TableHead className="text-right">Avg Duration</TableHead>
                    <TableHead className="text-right">Follow-ups</TableHead>
                    <TableHead className="text-right">Lab Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.doctorWorkloads.length > 0 ? (
                    data.doctorWorkloads.map((doc) => (
                      <TableRow key={doc.doctorId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-primary" />
                            <span>{doc.doctorName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{doc.specialty}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-emerald-600">{doc.appointmentsCompleted}</span> / {doc.appointmentsAssigned}
                        </TableCell>
                        <TableCell className="text-right font-medium">{doc.encountersCompleted}</TableCell>
                        <TableCell className="text-right">{doc.avgEncounterDurationMinutes} min</TableCell>
                        <TableCell className="text-right">
                          {doc.followupsCompleted} / {doc.followupsScheduled}
                        </TableCell>
                        <TableCell className="text-right">{doc.labOrdersInitiated}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        No physician activity records found for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Non-discriminatory policy banner */}
          <div className="flex items-center gap-2 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500" />
            <span>
              <strong>Equitable Practice Standard:</strong> Workload metrics are reported purely for capacity planning,
              clinic scheduling, and operational balancing. Scores do not rank or penalize doctors based on patient medical complexity.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
