'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  MOCK_APPOINTMENTS,
  MOCK_QUEUE,
  MOCK_NOTIFICATIONS,
} from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
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
  Activity,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { t } = useAuth();

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
          <Button asChild size="sm" className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5">
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
              {t.todayAppointments || "Today's Appointments"}
            </CardTitle>
            <Calendar className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-medium">+12%</span> from yesterday
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
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg. wait: <span className="font-semibold text-foreground">18 mins</span>
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
            <div className="text-2xl font-bold">31</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across 3 consulting rooms
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
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">
              6% of total scheduled
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
                <CardDescription>Scheduled consultations for today</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/dashboard/appointments">
                  View All <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_APPOINTMENTS.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-mono font-bold">#{apt.tokenNumber}</TableCell>
                      <TableCell className="font-semibold">{apt.patientName}</TableCell>
                      <TableCell className="text-muted-foreground">{apt.doctorName}</TableCell>
                      <TableCell>{apt.timeSlot}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            apt.status === 'Confirmed'
                              ? 'clinical'
                              : apt.status === 'Completed'
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
            </CardContent>
          </Card>

          {/* Quick Notice Banner */}
          <div className="p-4 rounded-xl border bg-clinical-50/50 border-clinical-200 text-clinical-900 flex items-start gap-3">
            <Activity className="h-5 w-5 text-clinical-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold">Phase 2 Backend Integration Verified:</span> Organization, Clinic, User Profiles, Memberships, and Audit Logs are powered by the live NestJS & PostgreSQL database. Clinical scheduling tables are running demonstration mock records until Phase 3.
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Live Queue Overview & Recent Notifications */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-clinical-600" />
                Live Waiting Queue
              </CardTitle>
              <Button asChild variant="link" size="sm" className="text-xs p-0 h-auto">
                <Link href="/dashboard/queue">Manage</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_QUEUE.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center font-bold text-sm">
                      #{item.tokenNumber}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.patientName}</div>
                      <div className="text-xs text-muted-foreground">{item.department}</div>
                    </div>
                  </div>
                  <Badge variant={item.status === 'Called' ? 'destructive' : 'outline'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Recent Activity</CardTitle>
              <CardDescription>Live notifications & operational events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_NOTIFICATIONS.map((n) => (
                <div key={n.id} className="text-xs border-b pb-2.5 last:border-0 last:pb-0">
                  <div className="font-semibold text-foreground">{n.title}</div>
                  <p className="text-muted-foreground mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground/70">{n.timestamp}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
