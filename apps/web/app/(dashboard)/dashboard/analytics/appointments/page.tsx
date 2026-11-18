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
import { AppointmentAnalytics, Clinic } from '@matabai/shared';
import {
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export default function AppointmentsAnalyticsPage() {
  const [data, setData] = React.useState<AppointmentAnalytics | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<string>('30d');
  const [clinicId, setClinicId] = React.useState<string>('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.analytics.getAppointments({
        period: period as any,
        clinicId: clinicId || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load appointment analytics', err);
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
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Executive Analytics
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Appointment Analytics & Demand</h1>
          <p className="text-sm text-muted-foreground">
            Outpatient scheduling rates, cancellation drivers, peak booking hours, and specialty demand.
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
          {/* Key Rates Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{data.completionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.completedAppointments} of {data.totalAppointments} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
                <XCircle className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600">{data.cancellationRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.cancelledAppointments} cancelled ({data.reschedulingCount} rescheduled)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{data.noShowRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.noShowAppointments} missed appointments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.avgBookingLeadTimeHours} hrs</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.walkInCount} walk-in vs {data.scheduledCount} pre-booked
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Demand by Doctor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Demand by Doctor</CardTitle>
                <CardDescription>Appointments booked per medical practitioner</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead className="text-right">Appointments</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.demandByDoctor.length > 0 ? (
                      data.demandByDoctor.map((d) => (
                        <TableRow key={d.doctorId}>
                          <TableCell className="font-medium">{d.doctorName}</TableCell>
                          <TableCell className="text-right">{d.count}</TableCell>
                          <TableCell className="text-right">
                            {data.totalAppointments > 0 ? Math.round((d.count / data.totalAppointments) * 100) : 0}%
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No doctor booking records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Demand by Specialty */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Demand by Clinical Specialty</CardTitle>
                <CardDescription>Volume distribution across medical departments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Specialty</TableHead>
                      <TableHead className="text-right">Consultations</TableHead>
                      <TableHead className="text-right">Distribution %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.demandBySpecialty.length > 0 ? (
                      data.demandBySpecialty.map((s) => (
                        <TableRow key={s.specialty}>
                          <TableCell className="font-medium">{s.specialty}</TableCell>
                          <TableCell className="text-right">{s.count}</TableCell>
                          <TableCell className="text-right">
                            {data.totalAppointments > 0 ? Math.round((s.count / data.totalAppointments) * 100) : 0}%
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No specialty distribution found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Peak Booking Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peak Booking Hours (00:00 - 23:00)</CardTitle>
              <CardDescription>Hourly patient booking activity distribution across 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 text-center">
                {data.peakBookingHours.map((h) => {
                  const maxCount = Math.max(...data.peakBookingHours.map((x) => x.count), 1);
                  const intensity = Math.min(100, Math.round((h.count / maxCount) * 100));
                  return (
                    <div
                      key={h.hour}
                      className="p-2 rounded border bg-card flex flex-col items-center justify-between text-xs"
                      style={{
                        backgroundColor:
                          h.count > 0 ? `rgba(2, 132, 199, ${Math.max(0.08, intensity / 100)})` : undefined,
                      }}
                    >
                      <span className="font-mono text-muted-foreground">{String(h.hour).padStart(2, '0')}:00</span>
                      <span className="font-bold text-sm my-1">{h.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
