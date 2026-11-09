'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiClient } from '@/lib/api-client';
import { Appointment } from '@matabai/shared';
import {
  Calendar,
  Clock,
  Plus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'upcoming' | 'past'>('upcoming');
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const fetchPatientAppointments = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ApiClient.appointments.list({ limit: 50 });
      setAppointments(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load appointments';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPatientAppointments();
  }, [fetchPatientAppointments]);

  const handleCancel = async (id: string, aptNumber: string) => {
    const reason = prompt('Please enter the reason for cancellation:');
    if (!reason || reason.trim().length < 3) return;

    try {
      await ApiClient.appointments.cancel(id, { reason: reason.trim() });
      setSuccessMsg(`Appointment ${aptNumber} cancelled. Slot has been released.`);
      await fetchPatientAppointments();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel appointment';
      setErrorMsg(msg);
    }
  };

  const filtered = appointments.filter((a) => {
    if (tab === 'upcoming') {
      return a.status === 'CONFIRMED' || a.status === 'PENDING';
    }
    return a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'NO_SHOW';
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/patient">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Appointments</h1>
            <p className="text-muted-foreground text-sm">
              View and manage your upcoming and past clinic consultations.
            </p>
          </div>
        </div>

        <Link href="/patient/book-appointment">
          <Button className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2 text-xs">
            <Plus className="h-4 w-4" />
            Book New
          </Button>
        </Link>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={tab === 'upcoming' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('upcoming')}
          className={tab === 'upcoming' ? 'bg-clinical-600 text-white hover:bg-clinical-700' : ''}
        >
          Upcoming Consultations
        </Button>
        <Button
          variant={tab === 'past' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('past')}
          className={tab === 'past' ? 'bg-clinical-600 text-white hover:bg-clinical-700' : ''}
        >
          Past Encounters
        </Button>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-clinical-600" />
            <p className="text-sm">Loading your appointment records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">No appointments found in this category.</p>
          </Card>
        ) : (
          filtered.map((apt) => (
            <Card key={apt.id} className="shadow-sm">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-clinical-50 text-clinical-600 flex flex-col items-center justify-center font-bold shrink-0 border border-clinical-200">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">APT</span>
                    <span className="text-xs text-clinical-700 font-extrabold font-mono">
                      {apt.appointmentNumber.split('-')[2] || '001'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-base text-slate-900">{apt.doctor?.fullName || 'Physician'}</h4>
                      <Badge
                        variant={apt.status === 'CONFIRMED' ? 'clinical' : 'outline'}
                        className="text-xs"
                      >
                        {apt.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{apt.doctor?.specialty}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-clinical-600" />
                        {apt.appointmentDate}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5 text-clinical-600" />
                        {apt.startTime} - {apt.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-clinical-600" />
                        {apt.clinic?.name || 'Clinic'}
                      </span>
                    </div>
                  </div>
                </div>

                {tab === 'upcoming' && apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(apt.id, apt.appointmentNumber)}
                      className="text-xs h-8 text-destructive hover:bg-destructive/10"
                    >
                      Cancel Visit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
