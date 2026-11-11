'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiClient } from '@/lib/api-client';
import { LaboratoryOrder, LaboratoryReport } from '@matabai/shared';
import { FlaskConical, Download, FileText, AlertCircle, RefreshCw } from 'lucide-react';

export default function PatientReportsPage() {
  const [orders, setOrders] = React.useState<LaboratoryOrder[]>([]);
  const [reports, setReports] = React.useState<LaboratoryReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [userOrders, userReports] = await Promise.all([
        ApiClient.laboratory.getMyOrders().catch(() => []),
        ApiClient.laboratory.getMyReports().catch(() => []),
      ]);
      setOrders(userOrders);
      setReports(userReports);
    } catch (err: any) {
      setError(err.message || 'Failed to load your diagnostic reports');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'RELEASED':
      case 'REPORT_READY':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Report Ready</Badge>;
      case 'PROCESSING':
      case 'UNDER_REVIEW':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Processing in Lab</Badge>;
      case 'SAMPLE_COLLECTED':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Sample Collected</Badge>;
      case 'REGISTERED':
      case 'SAMPLE_PENDING':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">Awaiting Sample Draw</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Diagnostic Reports</h1>
          <p className="text-sm text-muted-foreground">
            View your pathology lab orders, specimen progress, and validated diagnostic reports.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Available Finalized Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-clinical-600" />
            Validated Diagnostic Reports ({reports.length})
          </CardTitle>
          <CardDescription>
            Official laboratory reports signed by authorized clinic pathologists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No released reports available yet. When your tests are analyzed and approved, they will appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.map((report) => (
                <div key={report.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{report.reportReference}</span>
                      <Badge variant="outline" className="text-xs">Version {report.version}</Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Verified & Released</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Order: {report.order?.orderReference} • Clinic: {report.order?.clinic?.name || 'Diagnostic Lab'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Released: {report.releasedAt ? new Date(report.releasedAt).toLocaleString() : 'Recently'}
                    </p>
                  </div>
                  <a
                    href={ApiClient.laboratory.getDownloadUrl(report.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button size="sm" className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outpatient Lab Orders & Specimen Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-clinical-600" />
            Outpatient Pathology Orders ({orders.length})
          </CardTitle>
          <CardDescription>
            All laboratory investigations requested for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              You do not have any pathology orders on record.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{order.orderReference}</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()} at {order.clinic?.name || 'Clinic'}
                      </p>
                    </div>
                    <div>{getStatusBadge(order.orderStatus)}</div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium text-slate-700 mb-1">Included Investigations:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {order.items?.map((item) => (
                        <div key={item.id} className="text-xs p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <span className="font-medium text-slate-800">{item.testNameSnapshot}</span>
                          <span className="text-[11px] text-muted-foreground">{item.testCodeSnapshot}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.orderingDoctor && (
                    <p className="text-xs text-muted-foreground">
                      Requested by: Dr. {order.orderingDoctor.fullName} ({order.orderingDoctor.specialty})
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
