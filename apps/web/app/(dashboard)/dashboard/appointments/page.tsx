'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MOCK_APPOINTMENTS,
  MOCK_DOCTORS,
  MOCK_PATIENTS,
  MockAppointment,
} from '@/lib/mock-data';
import { Calendar, Plus, Search, Clock, Stethoscope, User } from 'lucide-react';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = React.useState<MockAppointment[]>(MOCK_APPOINTMENTS);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [modalOpen, setModalOpen] = React.useState(false);

  // Form State
  const [patientName, setPatientName] = React.useState(MOCK_PATIENTS[0]?.name || 'Usman Ali');
  const [doctorName, setDoctorName] = React.useState(MOCK_DOCTORS[0]?.name || 'Dr. Muhammad Talha');
  const [specialty, setSpecialty] = React.useState('Internal Medicine');
  const [date, setDate] = React.useState('2026-11-10');
  const [timeSlot, setTimeSlot] = React.useState('11:00 AM - 11:20 AM');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newApt: MockAppointment = {
      id: `apt-${Date.now()}`,
      patientName,
      doctorName,
      specialty,
      date,
      timeSlot,
      status: 'Confirmed',
      tokenNumber: appointments.length + 1,
    };
    setAppointments([newApt, ...appointments]);
    setModalOpen(false);
  };

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(search.toLowerCase()) ||
      a.doctorName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments Schedule</h1>
          <p className="text-muted-foreground text-sm">
            Doctor availability, patient consultation bookings, and status tracking.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patient or doctor..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total Scheduled: <span className="font-bold text-foreground">{appointments.length}</span>
            </div>
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              <TabsTrigger value="Confirmed">Confirmed</TabsTrigger>
              <TabsTrigger value="Pending">Pending</TabsTrigger>
              <TabsTrigger value="Completed">Completed</TabsTrigger>
              <TabsTrigger value="Cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Consulting Doctor</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Date & Slot</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((apt) => (
                <TableRow key={apt.id}>
                  <TableCell className="font-mono font-bold text-xs text-clinical-600">
                    #{apt.tokenNumber}
                  </TableCell>
                  <TableCell className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{apt.patientName}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="h-3 w-3 text-clinical-600" />
                      {apt.doctorName}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{apt.specialty}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 font-medium text-foreground">
                      <Calendar className="h-3 w-3" /> {apt.date}
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      <Clock className="h-3 w-3" /> {apt.timeSlot}
                    </div>
                  </TableCell>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>New Appointment Booking</DialogTitle>
            <DialogDescription>
              Schedule consultation slot and assign token.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Select Patient</label>
              <select
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {MOCK_PATIENTS.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.mrn})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Doctor</label>
                <select
                  value={doctorName}
                  onChange={(e) => {
                    setDoctorName(e.target.value);
                    const doc = MOCK_DOCTORS.find((d) => d.name === e.target.value);
                    if (doc) setSpecialty(doc.specialty);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  {MOCK_DOCTORS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Specialty</label>
                <Input value={specialty} readOnly className="bg-muted text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Consultation Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Time Slot</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="10:00 AM - 10:20 AM">10:00 AM - 10:20 AM</option>
                  <option value="10:30 AM - 10:50 AM">10:30 AM - 10:50 AM</option>
                  <option value="11:00 AM - 11:20 AM">11:00 AM - 11:20 AM</option>
                  <option value="11:30 AM - 11:50 AM">11:30 AM - 11:50 AM</option>
                  <option value="02:00 PM - 02:20 PM">02:00 PM - 02:20 PM</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white">
              Confirm Appointment
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

