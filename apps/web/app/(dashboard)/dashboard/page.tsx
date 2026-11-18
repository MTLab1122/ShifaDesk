'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/auth-context';
import { ApiClient } from '@/lib/api-client';
import { Appointment, QueueToken, NotificationJob } from '@matabai/shared';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowUpRight,
  UserPlus,
  Play,
  RotateCw,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { user, t } = useAuth();
  const clinicId = user?.clinicId || 'default-clinic';

  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [queueTokens, setQueueTokens] = React.useState<QueueToken[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationJob[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchDashboardData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [aptRes, queueRes, notifRes] = await Promise.allSettled([
        ApiClient.appointments.list({ clinicId, limit: 5 }),
        ApiClient.queueTokens.list({ clinicId }),
        ApiClient.notifications.list({ clinicId, limit: 5 }),
      ]);

      if (aptRes.status === 'fulfilled' && aptRes.value) {
        const items = aptRes.value.items || (aptRes.value as any)?.data || [];
        setAppointments(items);
      }
      if (queueRes.status === 'fulfilled' && queueRes.value) {
        const tokens = queueRes.value.items || (queueRes.value as any)?.data || [];
        setQueueTokens(tokens);
      }
      if (notifRes.status === 'fulfilled' && notifRes.value) {
        const notifItems = notifRes.value.items || (notifRes.value as any)?.data || [];
        setNotifications(notifItems);
      }
    } catch {
      // Gracefully handle offline or network errors
    } finally {
      setIsLoading(false);
    }
  }, [clinicId]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const waitingCount = queueTokens.filter((tk) => tk.status === 'WAITING' || tk.status === 'CALLED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const cancelledCount = appointments.filter((a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW').length;

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {t.dashboard || 'Clinic Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time outpatient reception, waiting queue metrics, and physician schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            <Link href="/dashboard/queue">
              <Play className="h-3.5 w-3.5" />
              {t.callNext || 'Call Next Token'}
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/dashboard/appointments">
              <Plus className="h-3.5 w-3.5" />
              Book Appointment
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/dashboard/patients">
              <UserPlus className="h-3.5 w-3.5" />
              Register Patient
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              {t.todayAppointments || "Scheduled Appointments"}
            </CardTitle>
            <Calendar className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active consultations in database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              {t.waitingPatients || 'Waiting in Queue'}
            </CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Live tokens in clinic lobby
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              {t.completedConsultations || 'Consultations Done'}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed patient encounters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Cancelled / No-Shows
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancelledCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recorded cancellations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Two Columns: Live Queue & Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Appointments */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Appointments</CardTitle>
                <CardDescription>Scheduled consultations from live records</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/dashboard/appointments">
                  View All <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 flex justify-center items-center">
                  <RotateCw className="h-5 w-5 animate-spin text-teal-600" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No appointments scheduled for this clinic yet. Click &quot;Book Appointment&quot; to add one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell className="font-mono text-xs">
                          {apt.startTime || '—'}
                        </TableCell>
                        <TableCell className="font-semibold">{apt.patient?.fullName || 'Patient'}</TableCell>
                        <TableCell className="text-muted-foreground">{apt.doctor?.fullName || 'Doctor'}</TableCell>
                        <TableCell className="text-xs">{apt.bookingSource || 'RECEPTIONIST'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              apt.status === 'CONFIRMED'
                                ? 'default'
                                : apt.status === 'COMPLETED'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {apt.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Live Queue Overview & Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                Live Waiting Queue
              </CardTitle>
              <Button asChild variant="link" size="sm" className="text-xs p-0 h-auto">
                <Link href="/dashboard/queue">Manage</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="py-6 flex justify-center items-center">
                  <RotateCw className="h-4 w-4 animate-spin text-teal-600" />
                </div>
              ) : queueTokens.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  The waiting queue is currently clear.
                </div>
              ) : (
                queueTokens.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                        #{item.tokenNumber}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.patient?.fullName || item.tokenDisplay || `Token #${item.tokenNumber}`}</div>
                        <div className="text-xs text-muted-foreground">{item.priorityType || 'NORMAL'}</div>
                      </div>
                    </div>
                    <Badge variant={item.status === 'CALLED' ? 'destructive' : 'outline'}>
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Recent Activity</CardTitle>
              <CardDescription>Live notifications & operational events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="py-4 flex justify-center items-center">
                  <RotateCw className="h-4 w-4 animate-spin text-teal-600" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No recent notifications recorded.
                </div>
              ) : (
                notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="text-xs border-b pb-2.5 last:border-0 last:pb-0">
                    <div className="font-semibold text-foreground">{n.eventType}</div>
                    <p className="text-muted-foreground mt-0.5">{`Channel: ${n.channel} • ${n.recipientType}`}</p>
                    <span className="text-[10px] text-muted-foreground/70">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
