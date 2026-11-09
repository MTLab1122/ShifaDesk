'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ApiClient } from '@/lib/api-client';
import {
  NotificationJob,
  NotificationRule,
  NotificationTemplate,
  InAppNotification,
  NotificationAnalytics,
} from '@matabai/shared';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Eye,
  Send,
  MessageSquare,
  Smartphone,
  Mail,
  Moon,
  RefreshCw,
} from 'lucide-react';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = React.useState<string>('history');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [analytics, setAnalytics] = React.useState<NotificationAnalytics | null>(null);

  // History State
  const [jobs, setJobs] = React.useState<NotificationJob[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [filterChannel, setFilterChannel] = React.useState<string>('');
  const [filterStatus, setFilterStatus] = React.useState<string>('');
  const [filterEvent, setFilterEvent] = React.useState<string>('');

  // Rules & Templates State
  const [rules, setRules] = React.useState<NotificationRule[]>([]);
  const [templates, setTemplates] = React.useState<NotificationTemplate[]>([]);
  const [inAppFeed, setInAppFeed] = React.useState<InAppNotification[]>([]);

  // Modals & Details State
  const [selectedJob, setSelectedJob] = React.useState<NotificationJob | null>(null);
  const [jobDetailsOpen, setJobDetailsOpen] = React.useState<boolean>(false);
  const [cancelModalOpen, setCancelModalOpen] = React.useState<boolean>(false);
  const [jobToCancel, setJobToCancel] = React.useState<string | null>(null);
  const [cancelReason, setCancelReason] = React.useState<string>('');
  const [retryingId, setRetryingId] = React.useState<string | null>(null);

  // Template Preview Tool State
  const [previewTemplateId, setPreviewTemplateId] = React.useState<string>('');
  const [previewVars, setPreviewVars] = React.useState<{ [key: string]: string }>({
    patient_name: 'Muhammad Talha',
    doctor_name: 'Dr. Sarah Khan',
    appointment_date: '2026-11-15',
    start_time: '10:30 AM',
    clinic_name: 'Shifa Central Clinic',
    token_number: 'A004',
    room_number: 'Consultation Room 2',
    estimated_wait_time: '15',
    patients_ahead: '2',
  });
  const [previewResult, setPreviewResult] = React.useState<{ body: string; subject?: string } | null>(null);

  // Load Data
  const loadAnalytics = React.useCallback(async () => {
    try {
      const data = await ApiClient.notifications.getAnalytics();
      setAnalytics(data);
    } catch {
      // Fallback fallback analytics
      setAnalytics({
        totalJobs: 0,
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        suppressedCount: 0,
        pendingCount: 0,
        deliverySuccessRate: 100,
        averageAttempts: 1,
        channelBreakdown: {},
        statusBreakdown: {},
        eventTypeBreakdown: {},
      });
    }
  }, []);

  const loadJobs = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.notifications.list({
        channel: filterChannel ? (filterChannel as any) : undefined,
        status: filterStatus ? (filterStatus as any) : undefined,
        eventType: filterEvent ? (filterEvent as any) : undefined,
        page,
        limit: 15,
      });
      setJobs(res.items || []);
      setTotalPages((res as any).totalPages || res.meta?.totalPages || 1);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [filterChannel, filterStatus, filterEvent, page]);

  const loadRules = React.useCallback(async () => {
    try {
      const res = await ApiClient.notificationRules.list();
      setRules(res || []);
    } catch {
      setRules([]);
    }
  }, []);

  const loadTemplates = React.useCallback(async () => {
    try {
      const res = await ApiClient.notificationTemplates.list();
      setTemplates(res || []);
      if (res && res.length > 0 && res[0] && !previewTemplateId) {
        setPreviewTemplateId(res[0].id);
      }
    } catch {
      setTemplates([]);
    }
  }, [previewTemplateId]);

  const loadInApp = React.useCallback(async () => {
    try {
      const res = await ApiClient.inApp.list({ limit: 20 });
      setInAppFeed(res.items || []);
    } catch {
      setInAppFeed([]);
    }
  }, []);

  React.useEffect(() => {
    loadAnalytics();
    loadJobs();
    loadRules();
    loadTemplates();
    loadInApp();
  }, [loadAnalytics, loadJobs, loadRules, loadTemplates, loadInApp]);

  // Handle Retry
  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await ApiClient.notifications.retry(jobId, true);
      await loadJobs();
      await loadAnalytics();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  // Handle Cancel
  const handleConfirmCancel = async () => {
    if (!jobToCancel) return;
    try {
      await ApiClient.notifications.cancel(jobToCancel, cancelReason);
      setCancelModalOpen(false);
      setJobToCancel(null);
      setCancelReason('');
      await loadJobs();
      await loadAnalytics();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  // Handle Preview
  const handlePreview = async () => {
    if (!previewTemplateId) return;
    try {
      const res = await ApiClient.notificationTemplates.preview({
        templateId: previewTemplateId,
        variables: previewVars,
        language: 'EN',
      });
      setPreviewResult(res);
    } catch (err: any) {
      alert(`Preview error: ${err.message}`);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'WHATSAPP':
        return <MessageSquare className="h-4 w-4 text-emerald-600" />;
      case 'SMS':
        return <Smartphone className="h-4 w-4 text-blue-600" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4 text-purple-600" />;
      case 'IN_APP':
        return <Bell className="h-4 w-4 text-amber-600" />;
      default:
        return <Send className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
      case 'READ':
        return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">{status}</Badge>;
      case 'PENDING':
      case 'SCHEDULED':
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200">{status}</Badge>;
      case 'RETRYING':
        return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">RETRYING</Badge>;
      case 'FAILED':
      case 'DEAD_LETTER':
        return <Badge className="bg-rose-500/10 text-rose-700 border-rose-200">{status}</Badge>;
      case 'SUPPRESSED':
        return <Badge className="bg-gray-500/10 text-gray-700 border-gray-200">SUPPRESSED</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-muted text-muted-foreground border-border">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Notification & Reminder Engine
            </h1>
            <Badge className="bg-emerald-600 text-white font-medium text-xs">Phase 8 Live</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Transactional outbox, appointment reminders, queue summons, quiet-hours rules, and multilingual templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadJobs();
              loadAnalytics();
            }}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 bg-card border-border shadow-sm">
          <div className="text-muted-foreground text-xs font-medium">Total Messages</div>
          <div className="text-xl font-bold mt-1 text-foreground">{analytics?.totalJobs ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">All channel jobs</div>
        </Card>

        <Card className="p-3 bg-card border-border shadow-sm">
          <div className="text-muted-foreground text-xs font-medium flex items-center justify-between">
            <span>Dispatched</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-emerald-600">
            {(analytics?.sentCount ?? 0) + (analytics?.deliveredCount ?? 0)}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Sent / Delivered</div>
        </Card>

        <Card className="p-3 bg-card border-border shadow-sm">
          <div className="text-muted-foreground text-xs font-medium">Delivery Rate</div>
          <div className="text-xl font-bold mt-1 text-clinical-600">
            {analytics?.deliverySuccessRate ?? 100}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Across WhatsApp/SMS</div>
        </Card>

        <Card className="p-3 bg-card border-border shadow-sm">
          <div className="text-muted-foreground text-xs font-medium flex items-center justify-between">
            <span>Scheduled</span>
            <Clock className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-blue-600">{analytics?.pendingCount ?? 0}</div>
          <div className="text-[11px] text-blue-600/80 mt-0.5">Upcoming reminders</div>
        </Card>

        <Card className="p-3 bg-card border-border shadow-sm">
          <div className="text-muted-foreground text-xs font-medium flex items-center justify-between">
            <span>Dead Letter / Fail</span>
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-rose-600">{analytics?.failedCount ?? 0}</div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">Exhausted attempts</div>
        </Card>

        <Card className="p-3 bg-card border-border shadow-sm">
          <div className="text-muted-foreground text-xs font-medium flex items-center justify-between">
            <span>Suppressed</span>
            <Moon className="h-3.5 w-3.5 text-gray-500" />
          </div>
          <div className="text-xl font-bold mt-1 text-gray-600">{analytics?.suppressedCount ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Quiet hrs / Opt-outs</div>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg border flex flex-wrap">
          <TabsTrigger value="history" className="text-xs font-medium gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Notification History
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs font-medium gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Scheduled Reminders ({jobs.filter((j) => ['SCHEDULED', 'PENDING', 'RETRYING'].includes(j.status)).length})
          </TabsTrigger>
          <TabsTrigger value="failed" className="text-xs font-medium gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Failed Queue ({jobs.filter((j) => ['FAILED', 'DEAD_LETTER'].includes(j.status)).length})
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-xs font-medium gap-1.5">
            <Moon className="h-3.5 w-3.5" />
            Rules & Quiet Hours
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs font-medium gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Multilingual Templates
          </TabsTrigger>
          <TabsTrigger value="inapp" className="text-xs font-medium gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Staff In-App Feed
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: NOTIFICATION HISTORY                                        */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="history" className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-3 border-border">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Channel</label>
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1"
                >
                  <option value="">All Channels</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="IN_APP">In-App</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1"
                >
                  <option value="">All Statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PENDING">Pending</option>
                  <option value="DEAD_LETTER">Dead Letter</option>
                  <option value="SUPPRESSED">Suppressed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Event Type</label>
                <select
                  value={filterEvent}
                  onChange={(e) => setFilterEvent(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1"
                >
                  <option value="">All Events</option>
                  <option value="APPOINTMENT_CONFIRMED">Appointment Confirmed</option>
                  <option value="APPOINTMENT_REMINDER">Appointment Reminder</option>
                  <option value="APPOINTMENT_RESCHEDULED">Appointment Rescheduled</option>
                  <option value="APPOINTMENT_CANCELLED">Appointment Cancelled</option>
                  <option value="TOKEN_GENERATED">Token Generated</option>
                  <option value="TOKEN_CALLED">Token Called</option>
                  <option value="QUEUE_DELAYED">Queue Delayed</option>
                  <option value="SYSTEM_ALERT">System Alert</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterChannel('');
                    setFilterStatus('');
                    setFilterEvent('');
                  }}
                  className="text-xs h-9 w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Job Table */}
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Channel / Event</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Scheduled / Sent</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Attempts</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Loading notifications ledger...
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No notifications found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => {
                      const payload = (job.payload as any) || {};
                      const recipientName =
                        payload.recipient_name || payload.patient_name || payload.name || job.recipientId;
                      const recipientContact = payload.recipient_phone || payload.recipient_email || '';

                      return (
                        <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getChannelIcon(job.channel)}
                              <div>
                                <div className="font-semibold text-foreground">
                                  {job.eventType.replace(/_/g, ' ')}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {job.channel}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-medium text-foreground">{recipientName}</div>
                            <div className="text-[11px] text-muted-foreground">{recipientContact}</div>
                          </td>

                          <td className="p-3">
                            <div className="text-foreground">
                              {job.sentAt
                                ? new Date(job.sentAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : new Date(job.scheduledAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(job.scheduledAt).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="p-3">
                            {getStatusBadge(job.status)}
                            {job.suppressionReason && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[140px]">
                                {job.suppressionReason}
                              </div>
                            )}
                          </td>

                          <td className="p-3 font-mono text-[11px]">
                            {job.attempts} / {job.maxAttempts}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedJob(job);
                                  setJobDetailsOpen(true);
                                }}
                                className="h-7 w-7 p-0"
                                title="View details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {['FAILED', 'DEAD_LETTER'].includes(job.status) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetry(job.id)}
                                  disabled={retryingId === job.id}
                                  className="h-7 px-2 text-[11px] gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Retry
                                </Button>
                              )}

                              {['SCHEDULED', 'PENDING'].includes(job.status) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setJobToCancel(job.id);
                                    setCancelModalOpen(true);
                                  }}
                                  className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-rose-600"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-border bg-muted/20 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: SCHEDULED REMINDERS                                         */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card className="p-4 border-border">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Active Reminder Pipeline
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Automated reminders calculated against clinic operating schedules and timezone boundaries. Invalidation triggers cancel scheduled jobs when appointments are rescheduled.
            </p>

            <div className="space-y-2">
              {jobs
                .filter((j) => ['SCHEDULED', 'PENDING', 'RETRYING'].includes(j.status))
                .map((job) => {
                  const payload = (job.payload as any) || {};
                  return (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-semibold text-xs text-foreground">
                            {job.eventType.replace(/_/g, ' ')} — {payload.patient_name || job.recipientId}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>Target: {payload.appointment_date} at {payload.start_time}</span>
                            <span>•</span>
                            <span>Channel: {job.channel}</span>
                            <span>•</span>
                            <span className="font-mono text-blue-600">
                              Dispatch at: {new Date(job.scheduledAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(job.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setJobToCancel(job.id);
                            setCancelModalOpen(true);
                          }}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-600"
                        >
                          Cancel Reminder
                        </Button>
                      </div>
                    </div>
                  );
                })}

              {jobs.filter((j) => ['SCHEDULED', 'PENDING', 'RETRYING'].includes(j.status)).length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No upcoming scheduled reminders currently pending in the pipeline.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: FAILED & DEAD LETTER QUEUE                                  */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="failed" className="space-y-4">
          <Card className="p-4 border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Dead-Letter & Failed Dispatches</h3>
                <p className="text-xs text-muted-foreground">
                  Notifications that exceeded maximum retry attempts or encountered unrecoverable provider rejections.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {jobs
                .filter((j) => ['FAILED', 'DEAD_LETTER'].includes(j.status))
                .map((job) => (
                  <div
                    key={job.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-rose-200 bg-rose-50/30"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5" />
                      <div>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                          <span>{job.eventType.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-200">
                            {job.attempts}/{job.maxAttempts} attempts
                          </Badge>
                        </div>
                        <div className="text-[11px] text-rose-600 font-medium mt-1">
                          Error: {job.lastError || 'Unknown provider failure'}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Job ID: {job.id} • Channel: {job.channel}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(job.id)}
                      disabled={retryingId === job.id}
                      className="h-8 text-xs gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Force Retry
                    </Button>
                  </div>
                ))}

              {jobs.filter((j) => ['FAILED', 'DEAD_LETTER'].includes(j.status)).length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Clean state! There are no failed or dead-lettered jobs in the queue.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: WORKFLOW RULES & QUIET HOURS                                */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="p-4 border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Clinic Notification Rules</h3>
                <p className="text-xs text-muted-foreground">
                  Trigger mappings, schedule offsets, quiet hours policies (22:00 - 08:00 clinic time), and channel fallbacks.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2.5">Event Type</th>
                    <th className="p-2.5">Primary Channel</th>
                    <th className="p-2.5">Schedule Timing</th>
                    <th className="p-2.5">Quiet Hours Policy</th>
                    <th className="p-2.5">Fallback Policy</th>
                    <th className="p-2.5">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        Using verified system defaults (Appointment Confirmed: Immediate WhatsApp, Reminders: 24h & 2h before, Quiet Hours: Queue until morning).
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">
                          {rule.eventType.replace(/_/g, ' ')}
                        </td>
                        <td className="p-2.5 flex items-center gap-1.5">
                          {getChannelIcon(rule.channel)}
                          <span>{rule.channel}</span>
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          {rule.scheduleOffsetMinutes === 0
                            ? 'Immediate'
                            : `${Math.abs(rule.scheduleOffsetMinutes / 60)} hours prior`}
                        </td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[10px]">
                            {rule.quietHoursPolicy}
                          </Badge>
                        </td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[10px]">
                            {rule.fallbackPolicy}
                          </Badge>
                        </td>
                        <td className="p-2.5">
                          <Badge
                            className={`text-[10px] ${
                              rule.priority === 'URGENT'
                                ? 'bg-rose-500 text-white'
                                : rule.priority === 'HIGH'
                                ? 'bg-amber-500 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {rule.priority}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: MULTILINGUAL TEMPLATES & LIVE PREVIEW TESTER                */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Template Directory */}
            <Card className="p-4 border-border">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Verified Multilingual Templates
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Clinical safety approved templates in English, Urdu, and Pashto.
              </p>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setPreviewTemplateId(tpl.id);
                      setPreviewResult(null);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      previewTemplateId === tpl.id
                        ? 'border-clinical-600 bg-clinical-50/30 ring-1 ring-clinical-600'
                        : 'border-border bg-card hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-xs text-foreground">{tpl.name}</div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {tpl.language}
                        </Badge>
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200">
                          {tpl.approvalStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-1 font-mono">
                      Event: {tpl.eventType} • Channel: {tpl.channel}
                    </div>
                    <div
                      className="text-xs text-foreground/80 line-clamp-2"
                      dir={tpl.language === 'UR' || tpl.language === 'PS' ? 'rtl' : 'ltr'}
                    >
                      {tpl.messageBody}
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    Built-in default templates are active for all appointment, reminder, and token events.
                  </div>
                )}
              </div>
            </Card>

            {/* Live Template Preview Tester */}
            <Card className="p-4 border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">Interactive Template Preview</h3>
                <Button size="sm" onClick={handlePreview} className="text-xs h-7 gap-1">
                  <PlayIcon className="h-3 w-3" />
                  Render Preview
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Test variable interpolation with sample patient and doctor data.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold">patient_name</label>
                    <Input
                      value={previewVars.patient_name}
                      onChange={(e) => setPreviewVars({ ...previewVars, patient_name: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold">doctor_name</label>
                    <Input
                      value={previewVars.doctor_name}
                      onChange={(e) => setPreviewVars({ ...previewVars, doctor_name: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold">appointment_date</label>
                    <Input
                      value={previewVars.appointment_date}
                      onChange={(e) => setPreviewVars({ ...previewVars, appointment_date: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-semibold">start_time</label>
                    <Input
                      value={previewVars.start_time}
                      onChange={(e) => setPreviewVars({ ...previewVars, start_time: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {previewResult && (
                  <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/20">
                    <div className="text-[11px] font-semibold text-emerald-800 uppercase mb-1">
                      Rendered Output
                    </div>
                    {previewResult.subject && (
                      <div className="text-xs font-bold text-foreground mb-1">
                        Subject: {previewResult.subject}
                      </div>
                    )}
                    <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {previewResult.body}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: STAFF IN-APP FEED                                           */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="inapp" className="space-y-4">
          <Card className="p-4 border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Operational In-App Feed</h3>
                <p className="text-xs text-muted-foreground">
                  Persistent administrative alerts for receptionists, clinic admins, and staff members.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await ApiClient.inApp.markAllAsRead();
                  await loadInApp();
                }}
                className="text-xs h-8"
              >
                Mark all as read
              </Button>
            </div>

            <div className="space-y-2">
              {inAppFeed.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-colors flex items-start justify-between gap-3 ${
                    !item.readAt ? 'border-clinical-600 bg-clinical-50/20' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Bell className={`h-4 w-4 mt-0.5 ${!item.readAt ? 'text-clinical-600' : 'text-muted-foreground'}`} />
                    <div>
                      <div className="font-semibold text-xs text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(item.createdAt).toLocaleString()} • Category: {item.category}
                      </div>
                    </div>
                  </div>

                  {!item.readAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await ApiClient.inApp.markAsRead(item.id);
                        await loadInApp();
                      }}
                      className="text-xs h-7 px-2"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}

              {inAppFeed.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No in-app operational alerts right now.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={jobDetailsOpen} onOpenChange={setJobDetailsOpen}>
        <DialogHeader>
          <DialogTitle className="text-base">Notification Job Details</DialogTitle>
          <DialogDescription className="text-xs">
            Audit ledger and delivery attempts for job {selectedJob?.id}
          </DialogDescription>
        </DialogHeader>

        {selectedJob && (
          <div className="space-y-4 my-2 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40">
              <div>
                <span className="text-muted-foreground">Event: </span>
                <span className="font-semibold">{selectedJob.eventType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Channel: </span>
                <span className="font-semibold">{selectedJob.channel}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span>{getStatusBadge(selectedJob.status)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Attempts: </span>
                <span className="font-mono">{selectedJob.attempts}/{selectedJob.maxAttempts}</span>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-1">Payload Variables</div>
              <pre className="p-2.5 rounded-lg bg-muted text-[11px] font-mono overflow-x-auto max-h-40">
                {JSON.stringify(selectedJob.payload, null, 2)}
              </pre>
            </div>

            {selectedJob.lastError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                <div className="font-semibold">Last Provider Error</div>
                <div className="mt-0.5 font-mono text-[11px]">{selectedJob.lastError}</div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setJobDetailsOpen(false)} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-base">Cancel Scheduled Notification</DialogTitle>
          <DialogDescription className="text-xs">
            This will immediately remove the reminder from the dispatch queue.
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 space-y-2">
          <label className="text-xs font-medium text-foreground">Cancellation Reason</label>
          <Input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Patient requested schedule hold"
            className="text-xs h-9"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)} className="text-xs">
            Keep Scheduled
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirmCancel} className="text-xs">
            Confirm Cancel
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
