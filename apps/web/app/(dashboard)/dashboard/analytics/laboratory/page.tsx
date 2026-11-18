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
import { LaboratoryAnalyticsData, Clinic } from '@matabai/shared';
import {
  FlaskConical,
  ArrowLeft,
  Clock,
  AlertTriangle,
  Receipt,
} from 'lucide-react';

export default function LaboratoryAnalyticsPage() {
  const [data, setData] = React.useState<LaboratoryAnalyticsData | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<string>('30d');
  const [clinicId, setClinicId] = React.useState<string>('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.analytics.getLaboratory({
        period: period as any,
        clinicId: clinicId || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load lab analytics', err);
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
          <h1 className="text-2xl font-bold tracking-tight">Diagnostic Laboratory Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Test order volumes, turnaround efficiency, specimen rejection tracking, and diagnostic revenue.
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
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Diagnostic Orders</CardTitle>
                <FlaskConical className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.sampleCollectionVolume} specimens processed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Avg Turnaround Time</CardTitle>
                <Clock className="h-4 w-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-600">{data.avgTurnaroundHours} hrs</div>
                <p className="text-xs text-muted-foreground mt-1">
                  From order registration to released PDF report
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Specimen Rejection Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600">{data.sampleRejectionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recollection rate: {data.recollectionRate}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Diagnostic Revenue</CardTitle>
                <Receipt className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  PKR {(data.revenuePaisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.reportsReleased} reports released, {data.reportsPendingReview} pending review
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Test Categories Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Volume by Test Category</CardTitle>
              <CardDescription>Pathology, Hematology, Biochemistry, Microbiology, and Imaging breakdowns</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Category</TableHead>
                    <TableHead className="text-right">Ordered Tests</TableHead>
                    <TableHead className="text-right">Share %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ordersByCategory.length > 0 ? (
                    data.ordersByCategory.map((cat) => {
                      const totalTests = data.ordersByCategory.reduce((a, b) => a + b.count, 0);
                      const share = totalTests > 0 ? Math.round((cat.count / totalTests) * 100) : 0;
                      return (
                        <TableRow key={cat.category}>
                          <TableCell className="font-medium">{cat.category}</TableCell>
                          <TableCell className="text-right">{cat.count}</TableCell>
                          <TableCell className="text-right">{share}%</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        No laboratory category data found for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
