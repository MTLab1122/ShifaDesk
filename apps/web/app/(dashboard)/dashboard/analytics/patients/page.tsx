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
import { PatientAnalytics, Clinic } from '@matabai/shared';
import {
  Users,
  ArrowLeft,
  UserPlus,
  UserCheck,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export default function PatientsAnalyticsPage() {
  const [data, setData] = React.useState<PatientAnalytics | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<string>('30d');
  const [clinicId, setClinicId] = React.useState<string>('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.analytics.getPatients({
        period: period as any,
        clinicId: clinicId || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load patient analytics', err);
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
          <h1 className="text-2xl font-bold tracking-tight">Patient Demographics & Retention</h1>
          <p className="text-sm text-muted-foreground">
            Patient cohort growth, visit frequencies, active engagement, and appointment-to-consultation conversion.
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 bg-muted/20" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalPatients}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Lifetime patient registry in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">New Registrations</CardTitle>
                <UserPlus className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">+{data.newRegistrations}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered in current period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Returning Cohort</CardTitle>
                <UserCheck className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{data.returningPatients}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Existing patients with follow-up activity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Appointment &rarr; Visit Conv.</CardTitle>
                <TrendingUp className="h-4 w-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-600">{data.appointmentToEncounterConversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Appointments converted to completed encounters
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visit Frequency Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visit Frequency Distribution</CardTitle>
                <CardDescription>Patient cohort categorization by cumulative consultation encounters</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visit Range</TableHead>
                      <TableHead className="text-right">Patients</TableHead>
                      <TableHead className="text-right">Proportion %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.visitFrequencyDistribution.map((vf) => {
                      const totalVisitsCount = data.visitFrequencyDistribution.reduce((a, b) => a + b.patientCount, 0);
                      const prop = totalVisitsCount > 0 ? Math.round((vf.patientCount / totalVisitsCount) * 100) : 0;
                      return (
                        <TableRow key={vf.visitCountRange}>
                          <TableCell className="font-medium">{vf.visitCountRange}</TableCell>
                          <TableCell className="text-right">{vf.patientCount}</TableCell>
                          <TableCell className="text-right">{prop}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Visits by Clinic Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patient Distribution by Clinic</CardTitle>
                <CardDescription>Active patient consultations serviced across clinic branches</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinic Branch</TableHead>
                      <TableHead className="text-right">Consultations</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.visitsByClinic.length > 0 ? (
                      data.visitsByClinic.map((vc) => {
                        const totalConsults = data.visitsByClinic.reduce((a, b) => a + b.patientCount, 0);
                        const share = totalConsults > 0 ? Math.round((vc.patientCount / totalConsults) * 100) : 0;
                        return (
                          <TableRow key={vc.clinicId}>
                            <TableCell className="font-medium">{vc.clinicName}</TableCell>
                            <TableCell className="text-right">{vc.patientCount}</TableCell>
                            <TableCell className="text-right">{share}%</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No clinic distribution data found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Privacy & Compliance Notice */}
          <div className="flex items-center gap-2 p-3.5 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>
              <strong>HIPAA & GDPR Privacy Compliance:</strong> Patient analytics are strictly aggregated at cohort level.
              No names, CNIC, phone numbers, or clinical diagnosis strings are stored or returned in aggregate reporting views.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
