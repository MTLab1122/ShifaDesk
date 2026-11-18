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
import { QueueAnalytics, Clinic } from '@matabai/shared';
import {
  Clock,
  ArrowLeft,
  Users,
  Timer,
  Stethoscope,
} from 'lucide-react';

export default function QueueAnalyticsPage() {
  const [data, setData] = React.useState<QueueAnalytics | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<string>('30d');
  const [clinicId, setClinicId] = React.useState<string>('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.analytics.getQueue({
        period: period as any,
        clinicId: clinicId || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load queue analytics', err);
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
          <h1 className="text-2xl font-bold tracking-tight">Queue & Wait-Time Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Authoritative patient waiting times, service durations, token statuses, and doctor throughput.
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
          {/* Wait Times & Durations Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Average Wait Time</CardTitle>
                <Clock className="h-4 w-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-600">{data.avgWaitTimeMinutes} min</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on sample size of {data.sampleSizeWaitTime} called tokens
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Median Wait Time</CardTitle>
                <Timer className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{data.medianWaitTimeMinutes} min</div>
                <p className="text-xs text-muted-foreground mt-1">
                  50th percentile patient wait time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Avg Consultation Duration</CardTitle>
                <Stethoscope className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{data.avgServiceDurationMinutes} min</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sample size: {data.sampleSizeServiceDuration} completed visits
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Tokens Throughput</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.tokensCompleted} / {data.tokensIssued}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.tokensSkipped} skipped, {data.tokensCancelled} cancelled
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Doctor Performance & Clinic Efficiency Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Doctor Queue Throughput</CardTitle>
                <CardDescription>Patients served and average consultation duration per doctor</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead className="text-right">Tokens Served</TableHead>
                      <TableHead className="text-right">Avg Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.doctorQueuePerformance.length > 0 ? (
                      data.doctorQueuePerformance.map((d) => (
                        <TableRow key={d.doctorId}>
                          <TableCell className="font-medium">{d.doctorName}</TableCell>
                          <TableCell className="text-right">{d.tokensServed}</TableCell>
                          <TableCell className="text-right">{d.avgServiceMinutes} mins</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No doctor queue records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clinic Queue Efficiency</CardTitle>
                <CardDescription>Facility waiting time benchmarks across clinic locations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinic</TableHead>
                      <TableHead className="text-right">Tokens Served</TableHead>
                      <TableHead className="text-right">Avg Wait Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.clinicQueuePerformance.length > 0 ? (
                      data.clinicQueuePerformance.map((c) => (
                        <TableRow key={c.clinicId}>
                          <TableCell className="font-medium">{c.clinicName}</TableCell>
                          <TableCell className="text-right">{c.tokensServed}</TableCell>
                          <TableCell className="text-right">{c.avgWaitMinutes} mins</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No clinic queue records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Queue Load Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hourly Queue Load (Check-ins by Hour)</CardTitle>
              <CardDescription>Patient check-in volume throughout operating clinic hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 text-center">
                {data.hourlyQueueLoad.map((h) => {
                  const maxTokens = Math.max(...data.hourlyQueueLoad.map((x) => x.tokens), 1);
                  const intensity = Math.min(100, Math.round((h.tokens / maxTokens) * 100));
                  return (
                    <div
                      key={h.hour}
                      className="p-2 rounded border bg-card flex flex-col items-center justify-between text-xs"
                      style={{
                        backgroundColor:
                          h.tokens > 0 ? `rgba(16, 185, 129, ${Math.max(0.08, intensity / 100)})` : undefined,
                      }}
                    >
                      <span className="font-mono text-muted-foreground">{String(h.hour).padStart(2, '0')}:00</span>
                      <span className="font-bold text-sm my-1">{h.tokens}</span>
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
