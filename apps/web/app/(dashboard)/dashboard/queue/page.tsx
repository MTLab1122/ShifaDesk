'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClient } from '@/lib/api-client';
import {
  QueueToken,
  ClinicQueueSession,
  ClinicQueueSettings,
  Clinic,
  Appointment,
  Patient,
  QueueSessionStatus,
  QueueTokenStatus,
  TokenPriorityType,
} from '@matabai/shared';
import {
  Play,
  Pause,
  StopCircle,
  CheckCircle2,
  SkipForward,
  Clock,
  RefreshCw,
  UserPlus,
  ExternalLink,
  Volume2,
  XCircle,
  RotateCcw,
  Sparkles,
  Search,
} from 'lucide-react';

export default function QueuePage() {
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = React.useState<string>('');
  const [queueSettings, setQueueSettings] = React.useState<ClinicQueueSettings[]>([]);
  const [selectedSettingId, setSelectedSettingId] = React.useState<string>('');
  const [session, setSession] = React.useState<ClinicQueueSession | null>(null);
  const [tokens, setTokens] = React.useState<QueueToken[]>([]);
  const [activeCalled, setActiveCalled] = React.useState<QueueToken | null>(null);
  const [activeServing, setActiveServing] = React.useState<QueueToken | null>(null);

  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
  const [stats, setStats] = React.useState({
    waitingCount: 0,
    servingCount: 0,
    completedCount: 0,
    skippedCount: 0,
    cancelledCount: 0,
  });

  // Modal dialog states
  const [isCheckInOpen, setIsCheckInOpen] = React.useState<boolean>(false);
  const [checkInTab, setCheckInTab] = React.useState<'appointment' | 'walkin'>('appointment');
  const [todayAppointments, setTodayAppointments] = React.useState<Appointment[]>([]);
  const [appointmentSearch, setAppointmentSearch] = React.useState<string>('');
  const [allPatients, setAllPatients] = React.useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = React.useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>('');
  const [walkInPriority, setWalkInPriority] = React.useState<string>(TokenPriorityType.NORMAL);
  const [walkInNotes, setWalkInNotes] = React.useState<string>('');
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<'waiting' | 'skipped' | 'completed'>('waiting');

  // Load initial clinics
  React.useEffect(() => {
    async function loadClinics() {
      try {
        const res = await ApiClient.clinics.list();
        const list = res.items || (res as any).data || [];
        if (list.length > 0) {
          setClinics(list);
          const firstClinic = list[0];
          if (firstClinic) {
            setSelectedClinicId(firstClinic.id);
          }
        }
      } catch (err) {
        console.error('Failed to load clinics:', err);
      }
    }
    loadClinics();
  }, []);

  // When clinic changes, load settings & sessions
  const loadQueueData = React.useCallback(async () => {
    if (!selectedClinicId) return;
    try {
      setIsRefreshing(true);
      // Load queue settings
      const settings = await ApiClient.queueSettings.list({ clinicId: selectedClinicId });
      setQueueSettings(settings);

      const targetSetting = settings.find((s) => s.id === selectedSettingId) || settings[0];
      if (targetSetting && targetSetting.id !== selectedSettingId) {
        setSelectedSettingId(targetSetting.id);
      }

      // Load today's session
      const sessionsRes = await ApiClient.queueSessions.list({
        clinicId: selectedClinicId,
      });

      const sessionList = (sessionsRes as any).items || (sessionsRes as any).data || [];
      if (sessionList.length > 0) {
        const todaySession = sessionList[0];
        if (todaySession) {
          const detail = await ApiClient.queueSessions.get(todaySession.id);
          setSession(detail);
          setStats(detail.stats || {
            waitingCount: 0,
            servingCount: 0,
            completedCount: 0,
            skippedCount: 0,
            cancelledCount: 0,
          });
          setActiveCalled(detail.activeCalledToken || null);
          setActiveServing(detail.activeServingToken || null);

          // Load tokens
          const tokensRes = await ApiClient.queueTokens.list({
            queueSessionId: todaySession.id,
          });
          const tokenList = (tokensRes as any).items || (tokensRes as any).data || [];
          setTokens(tokenList);
        }
      } else {
        setSession(null);
        setTokens([]);
        setActiveCalled(null);
        setActiveServing(null);
      }
    } catch (err) {
      console.error('Failed to load queue data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedClinicId, selectedSettingId]);

  React.useEffect(() => {
    loadQueueData();
    // Auto-refresh interval
    const interval = setInterval(loadQueueData, 8000);
    return () => clearInterval(interval);
  }, [loadQueueData]);

  // Load appointments and patients when opening check-in modal
  const handleOpenCheckIn = async () => {
    setIsCheckInOpen(true);
    try {
      if (selectedClinicId) {
        const apptRes = await ApiClient.appointments.list({
          clinicId: selectedClinicId,
          status: 'CONFIRMED',
        });
        setTodayAppointments((apptRes as any).items || (apptRes as any).data || []);

        const patRes = await ApiClient.patients.list({
          clinicId: selectedClinicId,
          limit: 100,
        });
        setAllPatients((patRes as any).items || (patRes as any).data || []);
      }
    } catch (err) {
      console.error('Failed to fetch check-in candidates:', err);
    }
  };

  // Session Control Actions
  const handleStartSession = async () => {
    if (!session) return;
    try {
      await ApiClient.queueSessions.start(session.id);
      loadQueueData();
    } catch (err) {
      console.error('Failed to start queue:', err);
    }
  };

  const handlePauseSession = async () => {
    if (!session) return;
    try {
      await ApiClient.queueSessions.pause(session.id);
      loadQueueData();
    } catch (err) {
      console.error('Failed to pause queue:', err);
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    if (confirm('Are you sure you want to close this queue session for today?')) {
      try {
        await ApiClient.queueSessions.close(session.id, true);
        loadQueueData();
      } catch (err) {
        console.error('Failed to close queue:', err);
      }
    }
  };

  // Queue Operations
  const handleCallNext = async () => {
    if (!session) return;
    setActionLoading(true);
    try {
      await ApiClient.queueTokens.callNext(session.id);
      await loadQueueData();
    } catch (err: any) {
      alert(err.message || 'Failed to call next patient');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecall = async (tokenId: string) => {
    try {
      await ApiClient.queueTokens.recall(tokenId);
      alert('Patient recalled! Audio broadcast sent.');
    } catch (err: any) {
      alert(err.message || 'Failed to recall patient');
    }
  };

  const handleStartServing = async (tokenId: string) => {
    setActionLoading(true);
    try {
      await ApiClient.queueTokens.startServing(tokenId);
      await loadQueueData();
    } catch (err: any) {
      alert(err.message || 'Failed to start serving');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteToken = async (tokenId: string) => {
    setActionLoading(true);
    try {
      await ApiClient.queueTokens.complete(tokenId);
      await loadQueueData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkipToken = async (tokenId: string) => {
    setActionLoading(true);
    try {
      await ApiClient.queueTokens.skip(tokenId, 'Patient absent at call time');
      await loadQueueData();
    } catch (err: any) {
      alert(err.message || 'Failed to skip token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreToken = async (tokenId: string) => {
    setActionLoading(true);
    try {
      await ApiClient.queueTokens.restore(tokenId);
      await loadQueueData();
    } catch (err: any) {
      alert(err.message || 'Failed to restore token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelToken = async (tokenId: string) => {
    if (!confirm('Cancel this token? This will release the queue slot.')) return;
    setActionLoading(true);
    try {
      await ApiClient.queueTokens.cancel(tokenId, 'Cancelled by receptionist');
      await loadQueueData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePriority = async (token: QueueToken) => {
    const nextPriority =
      token.priorityType === TokenPriorityType.PRIORITY
        ? TokenPriorityType.NORMAL
        : TokenPriorityType.PRIORITY;
    try {
      await ApiClient.queueTokens.setPriority(
        token.id,
        nextPriority,
        'Staff adjusted priority level',
      );
      await loadQueueData();
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    }
  };

  // Submit Check-in
  const handleCheckInAppointment = async (appointmentId: string) => {
    setActionLoading(true);
    try {
      const res = await ApiClient.queueTokens.checkInAppointment(appointmentId);
      alert(`Token generated: ${res.tokenDisplay}!`);
      setIsCheckInOpen(false);
      await loadQueueData();
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckInWalkIn = async () => {
    if (!selectedPatientId || !selectedClinicId) {
      alert('Please select a patient');
      return;
    }
    setActionLoading(true);
    try {
      const res = await ApiClient.queueTokens.checkInWalkIn({
        clinicId: selectedClinicId,
        patientId: selectedPatientId,
        queueSettingsId: selectedSettingId,
        priorityType: walkInPriority,
        notes: walkInNotes,
      });
      alert(`Walk-in Token Issued: ${res.tokenDisplay}!`);
      setIsCheckInOpen(false);
      setSelectedPatientId('');
      setWalkInNotes('');
      await loadQueueData();
    } catch (err: any) {
      alert(err.message || 'Walk-in check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered lists
  const waitingTokens = tokens.filter((t) => t.status === QueueTokenStatus.WAITING);
  const skippedTokens = tokens.filter((t) => t.status === QueueTokenStatus.SKIPPED);
  const completedTokens = tokens.filter((t) => t.status === QueueTokenStatus.COMPLETED);

  const activeSetting = queueSettings.find((s) => s.id === selectedSettingId);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Outpatient Queue</h1>
          <p className="text-muted-foreground text-sm">
            Digital token dispatcher, real-time calling engine, and waiting room monitor.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Clinic Selector */}
          {clinics.length > 1 && (
            <select
              aria-label="Filter by Clinic Location"
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="text-xs rounded-md border border-input bg-background px-3 py-1.5 shadow-sm focus:outline-none"
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadQueueData}
            disabled={isRefreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync
          </Button>

          {/* Public Display Link */}
          {activeSetting?.publicQueueId && (
            <a
              href={`/queue/${activeSetting.publicQueueId}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" />
                Public Display
              </Button>
            </a>
          )}

          {/* Check In Patient Button */}
          <Button
            onClick={handleOpenCheckIn}
            className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Check-In Patient
          </Button>
        </div>
      </div>

      {/* Session Status & Quick Controls */}
      <Card className="bg-slate-50/70 border">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Queue Status:
            </span>
            <Badge
              className={`text-xs px-2.5 py-0.5 ${
                session?.status === QueueSessionStatus.ACTIVE
                  ? 'bg-emerald-600 text-white'
                  : session?.status === QueueSessionStatus.PAUSED
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-600 text-white'
              }`}
            >
              {session?.status || 'NOT_STARTED'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Today: {session?.sessionDate || 'N/A'} • Prefix: {activeSetting?.tokenPrefix || 'A'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {session?.status === QueueSessionStatus.PAUSED && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartSession}
                className="gap-1 text-xs text-emerald-700 border-emerald-300"
              >
                <Play className="h-3.5 w-3.5" /> Resume Queue
              </Button>
            )}
            {session?.status === QueueSessionStatus.ACTIVE && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePauseSession}
                className="gap-1 text-xs text-amber-700 border-amber-300"
              >
                <Pause className="h-3.5 w-3.5" /> Pause Queue
              </Button>
            )}
            {session && session.status !== QueueSessionStatus.CLOSED && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCloseSession}
                className="gap-1 text-xs text-rose-700 border-rose-300"
              >
                <StopCircle className="h-3.5 w-3.5" /> Close Session
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hero Now Serving / Active Called Card */}
      <Card className="border-2 border-clinical-500 bg-clinical-50/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge variant="clinical" className="w-fit text-xs uppercase tracking-wider">
              {activeServing ? 'Currently Serving' : 'Now Calling'}
            </Badge>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCallNext}
                disabled={waitingTokens.length === 0 || actionLoading}
                className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5 text-xs"
              >
                <Play className="h-3.5 w-3.5" />
                Call Next Patient ({waitingTokens.length} waiting)
              </Button>
            </div>
          </div>

          <CardTitle className="text-4xl font-extrabold flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
            {activeServing ? (
              <div className="flex items-baseline gap-3">
                <span className="text-slate-900">{activeServing.tokenDisplay}</span>
                <span className="text-xl font-normal text-muted-foreground">
                  • {activeServing.patient?.fullName || 'Patient'}
                </span>
              </div>
            ) : activeCalled ? (
              <div className="flex items-baseline gap-3">
                <span className="text-emerald-700 animate-pulse">{activeCalled.tokenDisplay}</span>
                <span className="text-xl font-normal text-muted-foreground">
                  • {activeCalled.patient?.fullName || 'Patient'}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground text-2xl font-normal">
                No active patient called
              </span>
            )}

            {/* Calling Controls */}
            {(activeCalled || activeServing) && (
              <div className="flex items-center gap-2 flex-wrap text-sm">
                {activeCalled && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRecall(activeCalled.id)}
                      className="gap-1 text-xs"
                    >
                      <Volume2 className="h-3.5 w-3.5" /> Recall
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStartServing(activeCalled.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs"
                    >
                      <Play className="h-3.5 w-3.5" /> Start Serving
                    </Button>
                  </>
                )}

                {activeServing && (
                  <Button
                    size="sm"
                    onClick={() => handleCompleteToken(activeServing.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete Consultation
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSkipToken((activeServing || activeCalled)!.id)}
                  className="gap-1 text-xs text-amber-600 border-amber-300"
                >
                  <SkipForward className="h-3.5 w-3.5" /> Skip
                </Button>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            {activeServing
              ? `Consultation in progress since ${new Date(activeServing.serviceStartedAt || activeServing.updatedAt).toLocaleTimeString()}`
              : activeCalled
              ? `Patient notified at ${new Date(activeCalled.calledAt || activeCalled.updatedAt).toLocaleTimeString()}`
              : 'Queue is waiting for staff to call the next patient.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waitingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In reception waiting room</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Consultation</CardTitle>
            <Play className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.servingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">With practitioner now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Finished today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Skipped</CardTitle>
            <SkipForward className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.skippedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for restoration</p>
          </CardContent>
        </Card>
      </div>

      {/* Token List Tabs: Waiting, Skipped, Completed */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="waiting" className="gap-1.5">
            Waiting ({waitingTokens.length})
          </TabsTrigger>
          <TabsTrigger value="skipped" className="gap-1.5">
            Skipped ({skippedTokens.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            Completed ({completedTokens.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Waiting Tokens */}
        <TabsContent value="waiting" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Waiting Queue Order</CardTitle>
              <CardDescription>
                Tokens ordered by priority and check-in time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {waitingTokens.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No patients are currently waiting. Click &quot;Check-In Patient&quot; above to issue a token.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Pos</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Checked In</TableHead>
                      <TableHead>Est. Wait</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitingTokens.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-bold text-slate-500">#{t.queuePosition}</TableCell>
                        <TableCell className="font-extrabold text-clinical-700">
                          {t.tokenDisplay}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{t.patient?.fullName || 'Walk-in'}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {t.patient?.patientNumber || 'MRN-N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {t.appointmentId ? 'Appointment' : 'Walk-in'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`cursor-pointer text-xs ${
                              t.priorityType === TokenPriorityType.PRIORITY
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                            onClick={() => handleTogglePriority(t)}
                          >
                            {t.priorityType === TokenPriorityType.PRIORITY ? '⭐ Priority' : 'Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(t.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          ~{t.estimatedWaitMinutes || 0} min
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTogglePriority(t)}
                            title="Toggle Priority"
                            className="h-8 w-8 p-0"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSkipToken(t.id)}
                            title="Skip Patient"
                            className="h-8 w-8 p-0 text-muted-foreground"
                          >
                            <SkipForward className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelToken(t.id)}
                            title="Cancel Token"
                            className="h-8 w-8 p-0 text-rose-500"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Skipped Tokens */}
        <TabsContent value="skipped" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skipped Tokens</CardTitle>
              <CardDescription>
                Patients who were absent when called. Restore them to the queue when they return.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {skippedTokens.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No skipped tokens.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Skipped At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skippedTokens.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-bold text-amber-700">{t.tokenDisplay}</TableCell>
                        <TableCell>
                          <div className="font-medium">{t.patient?.fullName}</div>
                          <div className="text-xs text-muted-foreground">{t.patient?.phone}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.skippedAt ? new Date(t.skippedAt).toLocaleTimeString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreToken(t.id)}
                            className="gap-1 text-xs text-clinical-600 border-clinical-300"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restore to Queue
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Completed Tokens */}
        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completed Consultations</CardTitle>
              <CardDescription>Finished tokens for today.</CardDescription>
            </CardHeader>
            <CardContent>
              {completedTokens.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No completed consultations yet today.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Completed At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTokens.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-bold text-slate-800">{t.tokenDisplay}</TableCell>
                        <TableCell>{t.patient?.fullName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.completedAt ? new Date(t.completedAt).toLocaleTimeString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-600 text-white text-xs">Completed</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Patient Check-In Modal */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Patient OPD Check-In</DialogTitle>
            <DialogDescription>
              Issue a token for an appointment or a walk-in patient.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={checkInTab} onValueChange={(val) => setCheckInTab(val as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="appointment">Appointment Check-In</TabsTrigger>
              <TabsTrigger value="walkin">Walk-in Check-In</TabsTrigger>
            </TabsList>

            {/* Sub-tab A: Appointment Check-in */}
            <TabsContent value="appointment" className="space-y-4 pt-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search confirmed appointments by patient..."
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  className="pl-8 text-xs"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {todayAppointments
                  .filter((a) =>
                    appointmentSearch
                      ? a.patient?.fullName.toLowerCase().includes(appointmentSearch.toLowerCase())
                      : true,
                  )
                  .map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-lg border flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{apt.patient?.fullName}</div>
                        <div className="text-muted-foreground">
                          Time: {apt.startTime} - {apt.endTime} • Dr. {apt.doctor?.fullName}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCheckInAppointment(apt.id)}
                        disabled={actionLoading}
                        className="bg-clinical-600 hover:bg-clinical-700 text-white text-xs"
                      >
                        Check In
                      </Button>
                    </div>
                  ))}

                {todayAppointments.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    No confirmed appointments found for check-in today.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Sub-tab B: Walk-in Check-in */}
            <TabsContent value="walkin" className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Select Patient</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patient directory..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-8 text-xs mb-2"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto border rounded-md p-1 space-y-1">
                  {allPatients
                    .filter((p) =>
                      patientSearch
                        ? p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
                          p.patientNumber.toLowerCase().includes(patientSearch.toLowerCase())
                        : true,
                    )
                    .map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatientId(p.id)}
                        className={`p-2 rounded cursor-pointer text-xs flex justify-between items-center ${
                          selectedPatientId === p.id
                            ? 'bg-clinical-50 border border-clinical-300 font-bold text-clinical-900'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        <span>{p.fullName}</span>
                        <span className="font-mono text-muted-foreground">{p.patientNumber}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Priority Level</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={TokenPriorityType.NORMAL}
                      checked={walkInPriority === TokenPriorityType.NORMAL}
                      onChange={() => setWalkInPriority(TokenPriorityType.NORMAL)}
                    />
                    Normal
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={TokenPriorityType.PRIORITY}
                      checked={walkInPriority === TokenPriorityType.PRIORITY}
                      onChange={() => setWalkInPriority(TokenPriorityType.PRIORITY)}
                    />
                    ⭐ Priority (Elderly, Child, Urgent)
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Reason / Intake Notes</label>
                <Input
                  placeholder="e.g. High fever, blood pressure check"
                  value={walkInNotes}
                  onChange={(e) => setWalkInNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              <Button
                onClick={handleCheckInWalkIn}
                disabled={!selectedPatientId || actionLoading}
                className="w-full bg-clinical-600 hover:bg-clinical-700 text-white text-xs mt-2"
              >
                Issue Walk-in Token
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsCheckInOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
