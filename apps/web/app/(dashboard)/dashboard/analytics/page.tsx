'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiClient } from '@/lib/api-client';
import { ExecutiveDashboardMetrics, Clinic } from '@matabai/shared';
import {
  Calendar,
  Users,
  Activity,
  FlaskConical,
  Receipt,
  MessageSquare,
  Bot,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  FileBarChart,
  Download,
} from 'lucide-react';

export default function AnalyticsExecutiveDashboard() {
  const [metrics, setMetrics] = React.useState<ExecutiveDashboardMetrics | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<string>('30d');
  const [selectedClinicId, setSelectedClinicId] = React.useState<string>('');
  const [exporting, setExporting] = React.useState(false);

  const fetchMetrics = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiClient.analytics.getDashboard({
        period: period as any,
        clinicId: selectedClinicId || undefined,
      });
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load executive metrics', err);
    } finally {
      setLoading(false);
    }
  }, [period, selectedClinicId]);

  React.useEffect(() => {
    ApiClient.clinics.list().then((res) => {
      if (res?.items) setClinics(res.items);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleExportCsv = async () => {
    if (!metrics) return;
    setExporting(true);
    try {
      const columns = [
        { key: 'domain', label: 'Domain Area' },
        { key: 'metric', label: 'KPI Metric' },
        { key: 'value', label: 'Current Value' },
        { key: 'previous', label: 'Previous Value' },
        { key: 'change', label: 'Change %' },
      ];

      const rows = [
        { domain: 'Appointments', metric: 'Total Booked', value: metrics.appointments.total.value, previous: metrics.appointments.total.previousValue, change: metrics.appointments.total.changePercentage },
        { domain: 'Appointments', metric: 'Completed', value: metrics.appointments.completed.value, previous: metrics.appointments.completed.previousValue, change: metrics.appointments.completed.changePercentage },
        { domain: 'Appointments', metric: 'Completion Rate %', value: metrics.appointments.completionRate.value, previous: metrics.appointments.completionRate.previousValue, change: metrics.appointments.completionRate.changePercentage },
        { domain: 'Patients', metric: 'Total Registered', value: metrics.patients.totalRegistered.value, previous: metrics.patients.totalRegistered.previousValue, change: metrics.patients.totalRegistered.changePercentage },
        { domain: 'Patients', metric: 'New Registered', value: metrics.patients.newRegistered.value, previous: metrics.patients.newRegistered.previousValue, change: metrics.patients.newRegistered.changePercentage },
        { domain: 'Clinical', metric: 'Encounters Completed', value: metrics.clinical.completedEncounters.value, previous: metrics.clinical.completedEncounters.previousValue, change: metrics.clinical.completedEncounters.changePercentage },
        { domain: 'Laboratory', metric: 'Total Orders', value: metrics.laboratory.totalOrders.value, previous: metrics.laboratory.totalOrders.previousValue, change: metrics.laboratory.totalOrders.changePercentage },
        { domain: 'Laboratory', metric: 'Released Reports', value: metrics.laboratory.releasedReports.value, previous: metrics.laboratory.releasedReports.previousValue, change: metrics.laboratory.releasedReports.changePercentage },
        { domain: 'Finance', metric: 'Invoiced PKR', value: (metrics.finance.invoicedAmountPaisa.value / 100).toFixed(2), previous: metrics.finance.invoicedAmountPaisa.previousValue ? (metrics.finance.invoicedAmountPaisa.previousValue / 100).toFixed(2) : null, change: metrics.finance.invoicedAmountPaisa.changePercentage },
        { domain: 'Finance', metric: 'Collected PKR', value: (metrics.finance.collectedPaymentsPaisa.value / 100).toFixed(2), previous: metrics.finance.collectedPaymentsPaisa.previousValue ? (metrics.finance.collectedPaymentsPaisa.previousValue / 100).toFixed(2) : null, change: metrics.finance.collectedPaymentsPaisa.changePercentage },
        { domain: 'Communications', metric: 'WhatsApp Messages', value: metrics.communications.totalWhatsappMessages.value, previous: metrics.communications.totalWhatsappMessages.previousValue, change: metrics.communications.totalWhatsappMessages.changePercentage },
        { domain: 'Communications', metric: 'AI Interactions', value: metrics.communications.aiInteractions.value, previous: metrics.communications.aiInteractions.previousValue, change: metrics.communications.aiInteractions.changePercentage },
      ];

      const blob = await ApiClient.reports.export({
        reportName: 'Executive_Dashboard_KPIs',
        category: 'EXECUTIVE',
        format: 'CSV',
        columns,
        rows,
        clinicId: selectedClinicId || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Executive_KPIs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const renderTrendBadge = (trend?: 'UP' | 'DOWN' | 'NEUTRAL', change?: number | null) => {
    if (change === null || change === undefined) {
      return (
        <span className="inline-flex items-center text-xs text-muted-foreground">
          <Minus className="h-3 w-3 mr-0.5" /> No prior baseline
        </span>
      );
    }
    if (trend === 'UP') {
      return (
        <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
          <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> +{change}%
        </span>
      );
    }
    if (trend === 'DOWN') {
      return (
        <span className="inline-flex items-center text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
          <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" /> {change}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
        <Minus className="h-3 w-3 mr-0.5" /> 0%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Executive Analytics & BI</h1>
            <Badge variant="outline" className="text-xs uppercase bg-primary/5 text-primary border-primary/20">
              Live Operations
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Authoritative operational statistics, multi-domain KPI performance, and period-over-period comparisons.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Clinic filter */}
          <select
            value={selectedClinicId}
            onChange={(e) => setSelectedClinicId(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Clinics</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Timeframe pill selector */}
          <div className="flex rounded-md bg-muted p-1 text-xs">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPeriod(item.id)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  period === item.id
                    ? 'bg-background shadow-xs text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting || !metrics}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Domain Quick Links Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: 'Appointments', href: '/dashboard/analytics/appointments', icon: Calendar },
          { label: 'Queue & Waits', href: '/dashboard/analytics/queue', icon: Clock },
          { label: 'Patients', href: '/dashboard/analytics/patients', icon: Users },
          { label: 'Staff Workload', href: '/dashboard/analytics/staff', icon: Activity },
          { label: 'Laboratory', href: '/dashboard/analytics/laboratory', icon: FlaskConical },
          { label: 'Financials', href: '/dashboard/analytics/finance', icon: Receipt },
          { label: 'Communications', href: '/dashboard/analytics/communications', icon: MessageSquare },
          { label: 'AI Receptionist', href: '/dashboard/analytics/ai-usage', icon: Bot },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className="flex flex-col items-center justify-center p-3 text-center rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer shadow-2xs group">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mb-1.5" />
                <span className="text-xs font-medium leading-tight">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Multi-Domain KPI Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Card key={idx} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/30" />
              <CardContent className="h-16 bg-muted/10" />
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Row 1: Operations Overview */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Operational Volumes & Clinic Encounters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Appointments */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.appointments.total.value}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {metrics.appointments.completed.value} completed ({metrics.appointments.completionRate.value}%)
                    </span>
                    {renderTrendBadge(metrics.appointments.total.trend, metrics.appointments.total.changePercentage)}
                  </div>
                </CardContent>
              </Card>

              {/* Patients */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
                  <Users className="h-4 w-4 text-sky-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.patients.activePatients.value}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      +{metrics.patients.newRegistered.value} new registrations
                    </span>
                    {renderTrendBadge(metrics.patients.activePatients.trend, metrics.patients.activePatients.changePercentage)}
                  </div>
                </CardContent>
              </Card>

              {/* Encounters */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Clinical Encounters</CardTitle>
                  <Activity className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.clinical.completedEncounters.value}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Across {metrics.clinical.activeDoctors.value} active doctors
                    </span>
                    {renderTrendBadge(metrics.clinical.completedEncounters.trend, metrics.clinical.completedEncounters.changePercentage)}
                  </div>
                </CardContent>
              </Card>

              {/* Laboratory */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Diagnostic Orders</CardTitle>
                  <FlaskConical className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.laboratory.totalOrders.value}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {metrics.laboratory.releasedReports.value} released, {metrics.laboratory.pendingReviewReports.value} pending
                    </span>
                    {renderTrendBadge(metrics.laboratory.totalOrders.trend, metrics.laboratory.totalOrders.changePercentage)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Row 2: Financial Performance */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Financial Health & Collections (PKR)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Collected Revenue */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Collected Payments</CardTitle>
                  <Receipt className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    PKR {(metrics.finance.collectedPaymentsPaisa.value / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Real confirmed revenue</span>
                    {renderTrendBadge(metrics.finance.collectedPaymentsPaisa.trend, metrics.finance.collectedPaymentsPaisa.changePercentage)}
                  </div>
                </CardContent>
              </Card>

              {/* Invoiced Revenue */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Invoiced Amount</CardTitle>
                  <Receipt className="h-4 w-4 text-sky-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    PKR {(metrics.finance.invoicedAmountPaisa.value / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Active non-voided invoices</span>
                    {renderTrendBadge(metrics.finance.invoicedAmountPaisa.trend, metrics.finance.invoicedAmountPaisa.changePercentage)}
                  </div>
                </CardContent>
              </Card>

              {/* Outstanding Receivables */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Outstanding Receivables</CardTitle>
                  <Receipt className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    PKR {(metrics.finance.outstandingReceivablesPaisa.value / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Pending patient balances</span>
                    {renderTrendBadge(metrics.finance.outstandingReceivablesPaisa.trend, metrics.finance.outstandingReceivablesPaisa.changePercentage)}
                  </div>
                </CardContent>
              </Card>

              {/* Net Operating Balance */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Net Operating Balance</CardTitle>
                  <Receipt className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    PKR {(metrics.finance.netOperatingBalancePaisa.value / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">After refunds & expenses</span>
                    {renderTrendBadge(metrics.finance.netOperatingBalancePaisa.trend, metrics.finance.netOperatingBalancePaisa.changePercentage)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Row 3: Communications & AI Engagement */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Patient Communications & AI Receptionist
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">WhatsApp Traffic</CardTitle>
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.communications.totalWhatsappMessages.value}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Messages exchanged</span>
                    {renderTrendBadge(metrics.communications.totalWhatsappMessages.trend, metrics.communications.totalWhatsappMessages.changePercentage)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">AI Telephony Calls</CardTitle>
                  <Bot className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.communications.totalVoiceCalls.value}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Inbound voice calls</span>
                    {renderTrendBadge(metrics.communications.totalVoiceCalls.trend, metrics.communications.totalVoiceCalls.changePercentage)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">AI Multilingual Turns</CardTitle>
                  <Bot className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.communications.aiInteractions.value}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Urdu, Pashto & English</span>
                    {renderTrendBadge(metrics.communications.aiInteractions.trend, metrics.communications.aiInteractions.changePercentage)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Human Handover Rate</CardTitle>
                  <Users className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.communications.aiInteractions.value > 0
                      ? Math.round((metrics.communications.aiHandovers.value / metrics.communications.aiInteractions.value) * 100)
                      : 0}
                    %
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {metrics.communications.aiHandovers.value} escalations to reception
                    </span>
                    {renderTrendBadge(metrics.communications.aiHandovers.trend, metrics.communications.aiHandovers.changePercentage)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          No analytics data found for the selected clinic or timeframe.
        </Card>
      )}

      {/* Audit & Data Governance Notice */}
      <div className="p-4 bg-muted/40 rounded-lg border text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-foreground">Data Governance & Verification:</span> All statistics
          are aggregated directly from operational database records with tenant isolation. Patient privacy is strictly
          enforced with zero PII exposure in aggregate views.
        </div>
        <Link href="/dashboard/analytics/reports">
          <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary">
            <FileBarChart className="h-3.5 w-3.5 mr-1" />
            Custom Report Builder &rarr;
          </Button>
        </Link>
      </div>
    </div>
  );
}
