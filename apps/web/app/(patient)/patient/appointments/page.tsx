'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MOCK_APPOINTMENTS, MockAppointment } from '@/lib/mock-data';
import { Calendar, Clock, Plus, ArrowLeft } from 'lucide-react';

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = React.useState<MockAppointment[]>(MOCK_APPOINTMENTS);
  const [tab, setTab] = React.useState<'upcoming' | 'past'>('upcoming');

  const handleCancel = (id: string) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'Cancelled' as const } : a)
      );
    }
  };

  const filtered = appointments.filter(a => {
    if (tab === 'upcoming') {
      return a.status === 'Confirmed' || a.status === 'Pending';
    }
    return a.status === 'Completed' || a.status === 'Cancelled';
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

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={tab === 'upcoming' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('upcoming')}
          className={tab === 'upcoming' ? 'bg-clinical-600 text-white hover:bg-clinical-700' : ''}
        >
          Upcoming Appointments
        </Button>
        <Button
          variant={tab === 'past' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('past')}
          className={tab === 'past' ? 'bg-clinical-600 text-white hover:bg-clinical-700' : ''}
        >
          Past History
        </Button>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
            <p>No appointments found in this category.</p>
          </Card>
        ) : (
          filtered.map((apt) => (
            <Card key={apt.id} className="shadow-sm">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-clinical-50 text-clinical-600 flex flex-col items-center justify-center font-bold shrink-0 border border-clinical-200">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Token</span>
                    <span className="text-base text-clinical-700 font-extrabold">#{apt.tokenNumber}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-base text-slate-900">{apt.doctorName}</h4>
                      <Badge
                        variant={
                          apt.status === 'Confirmed'
                            ? 'clinical'
                            : apt.status === 'Cancelled'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {apt.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{apt.specialty}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-clinical-600" />
                        {apt.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-clinical-600" />
                        {apt.timeSlot}
                      </span>
                    </div>
                  </div>
                </div>

                {tab === 'upcoming' && apt.status !== 'Cancelled' && (
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <Link href="/patient/tokens">
                      <Button size="sm" variant="outline" className="text-xs h-8 border-clinical-300 text-clinical-700">
                        Track Token
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(apt.id)}
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
