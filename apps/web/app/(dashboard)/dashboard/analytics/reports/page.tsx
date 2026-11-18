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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClient } from '@/lib/api-client';
import {
  ReportQueryResult,
  SavedReportConfiguration,
  ScheduledReport,
  Clinic,
  AnalyticsCategory,
} from '@matabai/shared';
import {
  ArrowLeft,
  Play,
  Save,
  Trash2,
  Plus,
} from 'lucide-react';

export default function CustomReportBuilderPage() {
  const [activeTab, setActiveTab] = React.useState('builder');
  const [clinics, setClinics] = React.useState<Clinic[]>([]);

  // Query Builder State
  const [category, setCategory] = React.useState<string>(AnalyticsCategory.APPOINTMENTS);
  const [startDate, setStartDate] = React.useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
  );
  const [endDate, setEndDate] = React.useState<string>(new Date().toISOString().split('T')[0]!);
  const [clinicId, setClinicId] = React.useState<string>('');
  const [queryResult, setQueryResult] = React.useState<ReportQueryResult | null>(null);
  const [queryLoading, setQueryLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  // Saved Configs State
  const [savedConfigs, setSavedConfigs] = React.useState<SavedReportConfiguration[]>([]);
  const [configName, setConfigName] = React.useState('');
  const [configDesc, setConfigDesc] = React.useState('');
  const [savingConfig, setSavingConfig] = React.useState(false);

  // Scheduled Reports State
  const [scheduledReports, setScheduledReports] = React.useState<ScheduledReport[]>([]);
  const [schedName, setSchedName] = React.useState('');
  const [schedConfigId, setSchedConfigId] = React.useState('');
  const [schedFreq, setSchedFreq] = React.useState<string>('WEEKLY');
  const [schedRecipients, setSchedRecipients] = React.useState('');
  const [schedFormat, setSchedFormat] = React.useState<string>('PDF');
  const [creatingSched, setCreatingSched] = React.useState(false);
  const [runningSchedId, setRunningSchedId] = React.useState<string | null>(null);

  // Initial loads
  React.useEffect(() => {
    ApiClient.clinics.list().then((res) => {
      if (res?.items) setClinics(res.items);
    }).catch(() => {});
    loadConfigurations();
    loadScheduledReports();
  }, []);

  const loadConfigurations = async () => {
    try {
      const res = await ApiClient.reports.listConfigurations();
      setSavedConfigs(res);
      if (res.length > 0 && !schedConfigId) {
        setSchedConfigId(res[0]!.id);
      }
    } catch (err) {
      console.error('Failed to load report configs', err);
    }
  };

  const loadScheduledReports = async () => {
    try {
      const res = await ApiClient.reports.listScheduledReports();
      setScheduledReports(res);
    } catch (err) {
      console.error('Failed to load scheduled reports', err);
    }
  };

  const handleRunQuery = async () => {
    setQueryLoading(true);
    try {
      const res = await ApiClient.reports.query({
        category: category as any,
        dimensions: ['status', 'clinic', 'date'],
        metrics: ['totalCount'],
        startDate,
        endDate,
        clinicId: clinicId || undefined,
        limit: 200,
      });
      setQueryResult(res);
    } catch (err) {
      console.error('Failed to run query', err);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleExport = async (format: 'CSV' | 'XLSX' | 'PDF') => {
    if (!queryResult) return;
    setExporting(true);
    try {
      const blob = await ApiClient.reports.export({
        reportName: `${category}_Report`,
        category: category as any,
        format,
        columns: queryResult.columns,
        rows: queryResult.rows,
        clinicId: clinicId || undefined,
        filtersApplied: { startDate, endDate, clinicId },
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'CSV' ? 'csv' : format === 'XLSX' ? 'xlsx' : 'pdf';
      a.download = `${category}_Report_${new Date().toISOString().split('T')[0]}.${ext}`;
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

  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configName.trim()) return;
    setSavingConfig(true);
    try {
      await ApiClient.reports.createConfiguration({
        name: configName.trim(),
        description: configDesc.trim() || undefined,
        category: category as any,
        dimensions: ['status', 'clinic', 'date'],
        metrics: ['totalCount'],
        filtersJson: { startDate, endDate, clinicId },
        clinicId: clinicId || undefined,
      });
      setConfigName('');
      setConfigDesc('');
      await loadConfigurations();
    } catch (err) {
      console.error('Failed to save config', err);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report configuration?')) return;
    try {
      await ApiClient.reports.deleteConfiguration(id);
      await loadConfigurations();
    } catch (err) {
      console.error('Failed to delete config', err);
    }
  };

  const handleLoadConfig = (config: SavedReportConfiguration) => {
    setCategory(config.category);
    if (config.clinicId) setClinicId(config.clinicId);
    if (config.filtersJson?.startDate) setStartDate(config.filtersJson.startDate);
    if (config.filtersJson?.endDate) setEndDate(config.filtersJson.endDate);
    setActiveTab('builder');
  };

  const handleCreateScheduled = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedName.trim() || !schedConfigId) return;
    const recipientsArray = schedRecipients
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    if (recipientsArray.length === 0) {
      alert('Please specify at least one recipient email.');
      return;
    }

    setCreatingSched(true);
    try {
      await ApiClient.reports.createScheduledReport({
        name: schedName.trim(),
        reportConfigurationId: schedConfigId,
        frequency: schedFreq as any,
        recipients: recipientsArray,
        exportFormat: schedFormat as any,
        clinicId: clinicId || undefined,
      });
      setSchedName('');
      setSchedRecipients('');
      await loadScheduledReports();
    } catch (err) {
      console.error('Failed to create scheduled report', err);
    } finally {
      setCreatingSched(false);
    }
  };

  const handleRunScheduledNow = async (id: string) => {
    setRunningSchedId(id);
    try {
      await ApiClient.reports.runScheduledReport(id);
      await loadScheduledReports();
    } catch (err) {
      console.error('Failed to run scheduled report', err);
    } finally {
      setRunningSchedId(null);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;
    try {
      await ApiClient.reports.deleteScheduledReport(id);
      await loadScheduledReports();
    } catch (err) {
      console.error('Failed to delete scheduled report', err);
    }
  };

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
          <h1 className="text-2xl font-bold tracking-tight">Custom Report Builder & Automation</h1>
          <p className="text-sm text-muted-foreground">
            Build parameterized reports, export formula-safe documents (PDF/CSV/XLSX), and automate scheduled delivery.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-[450px] grid-cols-3">
          <TabsTrigger value="builder">Query Builder</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports ({savedConfigs.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduledReports.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Report Query Builder */}
        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configure Report Parameters</CardTitle>
              <CardDescription>Select domain category, clinic, and date boundaries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Domain Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1.5 h-9 px-3 text-sm rounded-md border border-input bg-background"
                  >
                    <option value={AnalyticsCategory.APPOINTMENTS}>Appointments</option>
                    <option value={AnalyticsCategory.FINANCE}>Billing & Finance</option>
                    <option value={AnalyticsCategory.LABORATORY}>Laboratory Diagnostics</option>
                    <option value={AnalyticsCategory.PATIENTS}>Patient Demographics</option>
                    <option value={AnalyticsCategory.STAFF}>Staff Workload</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Clinic Branch</label>
                  <select
                    value={clinicId}
                    onChange={(e) => setClinicId(e.target.value)}
                    className="w-full mt-1.5 h-9 px-3 text-sm rounded-md border border-input bg-background"
                  >
                    <option value="">All Clinics</option>
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1.5 h-9 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1.5 h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t">
                <Button onClick={handleRunQuery} disabled={queryLoading} className="h-9">
                  <Play className={`h-3.5 w-3.5 mr-1.5 ${queryLoading ? 'animate-spin' : ''}`} />
                  {queryLoading ? 'Executing Query...' : 'Run Report Query'}
                </Button>

                {queryResult && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">Export:</span>
                    <Button variant="outline" size="sm" onClick={() => handleExport('CSV')} disabled={exporting}>
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('XLSX')} disabled={exporting}>
                      Excel (XLSX)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('PDF')} disabled={exporting}>
                      PDF
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Query Results Table */}
          {queryResult && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Query Results ({queryResult.totalRows} records)</CardTitle>
                  <CardDescription>Generated at {new Date(queryResult.generatedAt).toLocaleString()}</CardDescription>
                </div>
                {queryResult.summary && (
                  <div className="flex items-center gap-4 text-xs font-mono bg-muted/30 px-3 py-1.5 rounded-md border">
                    {Object.entries(queryResult.summary).map(([k, v]) => (
                      <span key={k}>
                        <strong className="text-foreground">{k}:</strong> {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {queryResult.columns.map((c) => (
                          <TableHead key={c.key}>{c.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryResult.rows.length > 0 ? (
                        queryResult.rows.map((row, idx) => (
                          <TableRow key={idx}>
                            {queryResult.columns.map((c) => (
                              <TableCell key={c.key} className="text-xs">
                                {String(row[c.key] ?? '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={queryResult.columns.length} className="text-center py-6 text-muted-foreground">
                            No records found matching query parameters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Save Configuration Widget */}
                <form onSubmit={handleSaveConfiguration} className="mt-6 pt-4 border-t flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="Report Configuration Name (e.g. Monthly Lab Volume)"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="Optional Description"
                      value={configDesc}
                      onChange={(e) => setConfigDesc(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="sm" disabled={savingConfig || !configName.trim()} className="h-9">
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Saved Report Configurations */}
        <TabsContent value="saved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Saved Report Configurations</CardTitle>
              <CardDescription>Reusable report presets configured by your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Preset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedConfigs.length > 0 ? (
                    savedConfigs.map((cfg) => (
                      <TableRow key={cfg.id}>
                        <TableCell>
                          <div className="font-medium">{cfg.name}</div>
                          {cfg.description && (
                            <div className="text-xs text-muted-foreground">{cfg.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {cfg.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(cfg.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleLoadConfig(cfg)}>
                            <Play className="h-3.5 w-3.5 mr-1 text-primary" /> Load & Run
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteConfig(cfg.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No saved configurations found. Build a query in the Query Builder tab and save it!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Automated Scheduled Reports */}
        <TabsContent value="scheduled" className="space-y-6">
          {/* Create Schedule Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule Automated Delivery</CardTitle>
              <CardDescription>Automatically generate and distribute reports to clinic administrators</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateScheduled} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Schedule Title</label>
                    <Input
                      placeholder="e.g. Weekly Executive Audit"
                      value={schedName}
                      onChange={(e) => setSchedName(e.target.value)}
                      className="mt-1.5 h-9 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Report Configuration</label>
                    <select
                      value={schedConfigId}
                      onChange={(e) => setSchedConfigId(e.target.value)}
                      className="w-full mt-1.5 h-9 px-3 text-sm rounded-md border border-input bg-background"
                    >
                      {savedConfigs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Frequency</label>
                    <select
                      value={schedFreq}
                      onChange={(e) => setSchedFreq(e.target.value)}
                      className="w-full mt-1.5 h-9 px-3 text-sm rounded-md border border-input bg-background"
                    >
                      <option value="DAILY">Daily (06:00 AM)</option>
                      <option value="WEEKLY">Weekly (Monday 07:00 AM)</option>
                      <option value="MONTHLY">Monthly (1st of month)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Export Format</label>
                    <select
                      value={schedFormat}
                      onChange={(e) => setSchedFormat(e.target.value)}
                      className="w-full mt-1.5 h-9 px-3 text-sm rounded-md border border-input bg-background"
                    >
                      <option value="PDF">PDF Document</option>
                      <option value="CSV">CSV Spreadsheet</option>
                      <option value="XLSX">Excel Workbook</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Recipient Emails (comma-separated)</label>
                  <Input
                    placeholder="director@matabai.com, accountant@matabai.com"
                    value={schedRecipients}
                    onChange={(e) => setSchedRecipients(e.target.value)}
                    className="mt-1.5 h-9 text-sm"
                  />
                </div>

                <Button type="submit" disabled={creatingSched || !schedName.trim() || !schedConfigId} className="h-9">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {creatingSched ? 'Scheduling...' : 'Create Scheduled Report'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Scheduled Reports List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Recurring Schedules</CardTitle>
              <CardDescription>Scheduled report execution and automated delivery history</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schedule Name</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledReports.length > 0 ? (
                    scheduledReports.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">
                            {s.frequency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs uppercase font-mono">{s.exportFormat}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {s.recipients.join(', ')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : 'Pending'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRunScheduledNow(s.id)}
                            disabled={runningSchedId === s.id}
                          >
                            <Play className={`h-3.5 w-3.5 mr-1 ${runningSchedId === s.id ? 'animate-spin' : ''}`} />
                            Run Now
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteScheduled(s.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No recurring scheduled reports active. Use the form above to schedule daily or weekly reports!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
