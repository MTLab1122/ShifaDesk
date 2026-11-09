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
import { ApiClient } from '@/lib/api-client';
import {
  Appointment,
  Clinic,
  Doctor,
  Patient,
  AvailableSlot,
  DoctorWorkingHours,
} from '@matabai/shared';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Clock,
  Stethoscope,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Ban,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  CalendarDays,
  ListFilter,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filters & Pagination
  const [viewMode, setViewMode] = React.useState<'table' | 'calendar'>('table');
  const [calendarView, setCalendarView] = React.useState<'day' | 'week' | 'month'>('month');
  const [currentCalendarDate, setCurrentCalendarDate] = React.useState<Date>(new Date());
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [clinicFilter, setClinicFilter] = React.useState('ALL');
  const [doctorFilter, setDoctorFilter] = React.useState('ALL');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Guided Booking Modal (Steps 1 to 8)
  const [bookModalOpen, setBookModalOpen] = React.useState(false);
  const [bookStep, setBookStep] = React.useState<number>(1);
  const [selectedClinicId, setSelectedClinicId] = React.useState('');
  const [selectedDoctorId, setSelectedDoctorId] = React.useState('');
  const [selectedPatientId, setSelectedPatientId] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0] || '';
  });
  const [availableSlots, setAvailableSlots] = React.useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<AvailableSlot | null>(null);
  const [reasonForVisit, setReasonForVisit] = React.useState('');
  const [bookingSubmitting, setBookingSubmitting] = React.useState(false);

  // Appointment Details & Action Modals
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);

  // Reschedule Modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = React.useState(false);
  const [rescheduleDate, setRescheduleDate] = React.useState('');
  const [rescheduleSlots, setRescheduleSlots] = React.useState<AvailableSlot[]>([]);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = React.useState<AvailableSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = React.useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = React.useState(false);

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [cancelSubmitting, setCancelSubmitting] = React.useState(false);

  // Doctor Schedule Management Modal
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [scheduleDoctorId, setScheduleDoctorId] = React.useState('');
  const [scheduleClinicId, setScheduleClinicId] = React.useState('');
  const [doctorSchedules, setDoctorSchedules] = React.useState<DoctorWorkingHours[]>([]);
  const [scheduleLoading, setScheduleLoading] = React.useState(false);
  const [newDayOfWeek, setNewDayOfWeek] = React.useState(1);
  const [newStartTime, setNewStartTime] = React.useState('09:00');
  const [newEndTime, setNewEndTime] = React.useState('17:00');
  const [newDuration, setNewDuration] = React.useState(20);
  const [newBreakStart, setNewBreakStart] = React.useState('13:00');
  const [newBreakEnd, setNewBreakEnd] = React.useState('14:00');
  const [hasBreak, setHasBreak] = React.useState(true);
  const [scheduleSubmitting, setScheduleSubmitting] = React.useState(false);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Initial dependencies load
  React.useEffect(() => {
    async function loadMeta() {
      try {
        const [cRes, dRes, pRes] = await Promise.all([
          ApiClient.clinics.list({ limit: 100 }),
          ApiClient.doctors.list({ limit: 100 }),
          ApiClient.patients.list({ limit: 100 }),
        ]);
        setClinics(cRes.items || []);
        setDoctors(dRes.items || []);
        setPatients(pRes.items || []);

        if (cRes.items && cRes.items[0]) {
          setSelectedClinicId(cRes.items[0].id);
          setScheduleClinicId(cRes.items[0].id);
        }
        if (dRes.items && dRes.items[0]) {
          setSelectedDoctorId(dRes.items[0].id);
          setScheduleDoctorId(dRes.items[0].id);
        }
        if (pRes.items && pRes.items[0]) {
          setSelectedPatientId(pRes.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load clinic/doctor/patient dropdown data', err);
      }
    }
    loadMeta();
  }, []);

  const fetchAppointments = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await ApiClient.appointments.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        clinicId: clinicFilter !== 'ALL' ? clinicFilter : undefined,
        doctorId: doctorFilter !== 'ALL' ? doctorFilter : undefined,
      });
      setAppointments(res.items || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.totalItems || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch appointments from database';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, clinicFilter, doctorFilter]);

  React.useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load available slots when date/doctor/clinic changes in booking flow
  const loadSlots = async (cId: string, dId: string, dt: string) => {
    if (!cId || !dId || !dt) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const slots = await ApiClient.availability.get({
        clinicId: cId,
        doctorId: dId,
        date: dt,
      });
      setAvailableSlots(slots || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load doctor availability slots';
      setErrorMsg(msg);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Open guided booking modal
  const handleOpenBookModal = () => {
    setBookStep(1);
    setSelectedSlot(null);
    setReasonForVisit('');
    setBookModalOpen(true);
  };

  const handleNextStep = async () => {
    if (bookStep === 3) {
      // Transitioning to Step 4/5: Load availability slots
      await loadSlots(selectedClinicId, selectedDoctorId, selectedDate);
    }
    setBookStep((s) => Math.min(8, s + 1));
  };

  const handlePrevStep = () => {
    setBookStep((s) => Math.max(1, s - 1));
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedClinicId || !selectedDoctorId || !selectedPatientId) return;

    setBookingSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await ApiClient.appointments.create({
        clinicId: selectedClinicId,
        doctorId: selectedDoctorId,
        patientId: selectedPatientId,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        bookingSource: 'RECEPTIONIST',
        reasonForVisit: reasonForVisit.trim() || undefined,
      });
      setSuccessMsg(`Appointment booked successfully! Number: ${created.appointmentNumber}`);
      setBookModalOpen(false);
      await fetchAppointments();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm appointment booking';
      setErrorMsg(msg);
    } finally {
      setBookingSubmitting(false);
    }
  };

  // View Details
  const handleViewDetails = async (apt: Appointment) => {
    try {
      const full = await ApiClient.appointments.get(apt.id);
      setSelectedAppointment(full);
      setDetailModalOpen(true);
    } catch {
      setSelectedAppointment(apt);
      setDetailModalOpen(true);
    }
  };

  // Reschedule
  const handleOpenReschedule = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setRescheduleDate(apt.appointmentDate);
    setRescheduleSelectedSlot(null);
    setRescheduleReason('');
    setRescheduleModalOpen(true);
    loadRescheduleSlots(apt.clinicId, apt.doctorId, apt.appointmentDate);
  };

  const loadRescheduleSlots = async (cId: string, dId: string, dt: string) => {
    try {
      const slots = await ApiClient.availability.get({
        clinicId: cId,
        doctorId: dId,
        date: dt,
      });
      setRescheduleSlots(slots || []);
    } catch {
      setRescheduleSlots([]);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedAppointment || !rescheduleSelectedSlot) return;
    setRescheduleSubmitting(true);
    setErrorMsg(null);
    try {
      await ApiClient.appointments.reschedule(selectedAppointment.id, {
        appointmentDate: rescheduleDate,
        startTime: rescheduleSelectedSlot.startTime,
        endTime: rescheduleSelectedSlot.endTime,
        reason: rescheduleReason.trim() || undefined,
      });
      setSuccessMsg(`Appointment ${selectedAppointment.appointmentNumber} rescheduled to ${rescheduleDate} at ${rescheduleSelectedSlot.startTime}`);
      setRescheduleModalOpen(false);
      setDetailModalOpen(false);
      await fetchAppointments();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reschedule appointment';
      setErrorMsg(msg);
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // Cancel
  const handleOpenCancel = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAppointment || !cancelReason.trim()) return;
    setCancelSubmitting(true);
    setErrorMsg(null);
    try {
      await ApiClient.appointments.cancel(selectedAppointment.id, {
        reason: cancelReason.trim(),
      });
      setSuccessMsg(`Appointment ${selectedAppointment.appointmentNumber} cancelled. Slot has been released.`);
      setCancelModalOpen(false);
      setDetailModalOpen(false);
      await fetchAppointments();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel appointment';
      setErrorMsg(msg);
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Status update
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await ApiClient.appointments.updateStatus(id, { status });
      setSuccessMsg(`Appointment status updated to ${status}`);
      if (selectedAppointment && selectedAppointment.id === id) {
        setSelectedAppointment({ ...selectedAppointment, status });
      }
      await fetchAppointments();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      setErrorMsg(msg);
    }
  };

  // Schedule Editor Load
  const loadDoctorSchedules = async (dId: string, cId?: string) => {
    if (!dId) return;
    setScheduleLoading(true);
    try {
      const res = await ApiClient.workingHours.list(dId, cId || undefined);
      setDoctorSchedules(res || []);
    } catch (err) {
      console.error('Failed to load doctor working hours', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleOpenScheduleModal = () => {
    setScheduleModalOpen(true);
    if (scheduleDoctorId) {
      loadDoctorSchedules(scheduleDoctorId, scheduleClinicId);
    }
  };

  const handleCreateWorkingHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDoctorId || !scheduleClinicId) return;
    setScheduleSubmitting(true);
    setErrorMsg(null);
    try {
      await ApiClient.workingHours.create(scheduleDoctorId, {
        clinicId: scheduleClinicId,
        dayOfWeek: Number(newDayOfWeek),
        startTime: newStartTime,
        endTime: newEndTime,
        slotDurationMinutes: Number(newDuration),
        breakStartTime: hasBreak ? newBreakStart : null,
        breakEndTime: hasBreak ? newBreakEnd : null,
        isActive: true,
      });
      setSuccessMsg('Doctor working period added successfully');
      await loadDoctorSchedules(scheduleDoctorId, scheduleClinicId);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add working period';
      setErrorMsg(msg);
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleDeleteWorkingHours = async (id: string) => {
    try {
      await ApiClient.workingHours.delete(scheduleDoctorId, id);
      setSuccessMsg('Working period deleted');
      await loadDoctorSchedules(scheduleDoctorId, scheduleClinicId);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete period';
      setErrorMsg(msg);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="clinical" className="text-xs">Confirmed</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">Cancelled</Badge>;
      case 'NO_SHOW':
        return <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700">No Show</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  // Calendar calculations
  const calendarDays = React.useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];
    // padding previous month
    for (let i = 0; i < firstDay; i++) {
      days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dayNumber: d,
        dateStr: `${year}-${mStr}-${dStr}`,
        isCurrentMonth: true,
      });
    }
    return days;
  }, [currentCalendarDate]);

  return (
    <div className="space-y-6">
      {/* Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments & Scheduling</h1>
          <p className="text-muted-foreground text-sm">
            Doctor availability calendars, consultation slot reservations, and booking management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleOpenScheduleModal}
            className="gap-2 text-xs"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Manage Schedules
          </Button>
          <Button
            onClick={handleOpenBookModal}
            className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Main Container */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient, doctor, or APT#..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <select
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={clinicFilter}
                onChange={(e) => {
                  setClinicFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Clinics</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={doctorFilter}
                onChange={(e) => {
                  setDoctorFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>

            {/* View Switcher: Table vs Calendar */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-sm font-medium transition-all ${
                    viewMode === 'table' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <ListFilter className="h-3.5 w-3.5 inline mr-1" />
                  List View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-sm font-medium transition-all ${
                    viewMode === 'calendar' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5 inline mr-1" />
                  Calendar
                </button>
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="ALL">All Appointments</TabsTrigger>
              <TabsTrigger value="CONFIRMED">Confirmed</TabsTrigger>
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
              <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
              <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
              <TabsTrigger value="NO_SHOW">No Show</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-clinical-600 mb-2" />
              <p className="text-sm">Loading appointment records from database...</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            appointments.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm">No appointments found matching current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>APT Number</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Consulting Doctor</TableHead>
                      <TableHead>Clinic Facility</TableHead>
                      <TableHead>Date & Time Slot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell className="font-mono text-xs font-bold text-clinical-600">
                          {apt.appointmentNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm">{apt.patient?.fullName || 'Patient'}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {apt.patient?.patientNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-3.5 w-3.5 text-clinical-600 shrink-0" />
                            <div>
                              <span className="font-semibold text-xs block">{apt.doctor?.fullName}</span>
                              <span className="text-[11px] text-muted-foreground">{apt.doctor?.specialty}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {apt.clinic?.name || 'Clinic'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium text-foreground">{apt.appointmentDate}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {apt.startTime} - {apt.endTime}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(apt.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewDetails(apt)}
                              title="View Full Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                  onClick={() => handleOpenReschedule(apt)}
                                  title="Reschedule Appointment"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                                  onClick={() => handleOpenCancel(apt)}
                                  title="Cancel Appointment"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <div>
                      Page {page} of {totalPages} &bull; Total {totalCount} appointments
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="h-8 gap-1"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="h-8 gap-1"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Interactive Calendar View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">
                    {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const prev = new Date(currentCalendarDate);
                        prev.setMonth(prev.getMonth() - 1);
                        setCurrentCalendarDate(prev);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setCurrentCalendarDate(new Date())}
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        const next = new Date(currentCalendarDate);
                        next.setMonth(next.getMonth() + 1);
                        setCurrentCalendarDate(next);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-1 border rounded-md p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setCalendarView('month')}
                    className={`px-2.5 py-1 rounded ${calendarView === 'month' ? 'bg-clinical-600 text-white font-medium' : 'text-muted-foreground'}`}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarView('week')}
                    className={`px-2.5 py-1 rounded ${calendarView === 'week' ? 'bg-clinical-600 text-white font-medium' : 'text-muted-foreground'}`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarView('day')}
                    className={`px-2.5 py-1 rounded ${calendarView === 'day' ? 'bg-clinical-600 text-white font-medium' : 'text-muted-foreground'}`}
                  >
                    Day
                  </button>
                </div>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="bg-muted/50 p-2 text-center text-xs font-semibold text-muted-foreground">
                    {d}
                  </div>
                ))}
                {calendarDays.map((cell, idx) => {
                  const dayApts = appointments.filter((a) => a.appointmentDate === cell.dateStr);
                  const isToday = cell.dateStr === new Date().toISOString().split('T')[0];
                  return (
                    <div
                      key={idx}
                      className={`min-h-[90px] p-1.5 bg-background transition-colors ${
                        !cell.isCurrentMonth ? 'bg-muted/10 opacity-40' : ''
                      } ${isToday ? 'ring-1 ring-clinical-500 bg-clinical-50/20' : ''}`}
                    >
                      {cell.dayNumber > 0 && (
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              isToday ? 'bg-clinical-600 text-white' : 'text-foreground'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>
                          {dayApts.length > 0 && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {dayApts.length} apt
                            </span>
                          )}
                        </div>
                      )}
                      <div className="space-y-1 overflow-y-auto max-h-[70px]">
                        {dayApts.slice(0, 3).map((a) => (
                          <div
                            key={a.id}
                            onClick={() => handleViewDetails(a)}
                            className="text-[10px] p-1 rounded bg-clinical-50 border border-clinical-200 text-clinical-900 truncate cursor-pointer hover:bg-clinical-100 font-medium"
                            title={`${a.startTime} - ${a.patient?.fullName}`}
                          >
                            <span className="font-mono">{a.startTime}</span> {a.patient?.fullName?.split(' ')[0]}
                          </div>
                        ))}
                        {dayApts.length > 3 && (
                          <div className="text-[9px] text-muted-foreground text-center">
                            +{dayApts.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guided 8-Step Booking Modal */}
      <Dialog open={bookModalOpen} onOpenChange={setBookModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle>Book Patient Consultation</DialogTitle>
            <DialogDescription>
              Step {bookStep} of 8: {
                bookStep === 1 ? 'Select Clinic Facility' :
                bookStep === 2 ? 'Select Consulting Physician' :
                bookStep === 3 ? 'Select Patient Record' :
                bookStep === 4 ? 'Select Appointment Date' :
                bookStep === 5 ? 'Select Available Time Slot' :
                bookStep === 6 ? 'Review Consultation Fee' :
                bookStep === 7 ? 'Enter Clinical Reason' : 'Confirm & Schedule'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Select Clinic */}
          {bookStep === 1 && (
            <div className="space-y-2 py-2">
              <label className="text-xs font-semibold">Select Clinic Facility</label>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {clinics.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClinicId(c.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      selectedClinicId === c.id ? 'border-clinical-600 bg-clinical-50 ring-1 ring-clinical-600' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-sm block">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.address || c.slug}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">{c.timezone}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Doctor */}
          {bookStep === 2 && (
            <div className="space-y-2 py-2">
              <label className="text-xs font-semibold">Select Doctor</label>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {doctors.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDoctorId(d.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDoctorId === d.id ? 'border-clinical-600 bg-clinical-50 ring-1 ring-clinical-600' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-clinical-600 shrink-0" />
                      <div>
                        <span className="font-semibold text-sm block">{d.fullName}</span>
                        <span className="text-xs text-muted-foreground">{d.specialty} &bull; {d.qualification}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-clinical-700">
                      PKR {d.consultationFee?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Select Patient */}
          {bookStep === 3 && (
            <div className="space-y-2 py-2">
              <label className="text-xs font-semibold">Select Patient Record</label>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      selectedPatientId === p.id ? 'border-clinical-600 bg-clinical-50 ring-1 ring-clinical-600' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-sm block">{p.fullName}</span>
                      <span className="text-xs text-muted-foreground font-mono">{p.patientNumber} &bull; {p.phone}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{p.gender || 'Patient'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Pick Date */}
          {bookStep === 4 && (
            <div className="space-y-3 py-2">
              <label className="text-xs font-semibold">Select Appointment Date</label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Availability will be calculated in the clinic's local timezone.
              </p>
            </div>
          )}

          {/* Step 5: Select Available Slot */}
          {bookStep === 5 && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Available Consultation Slots on {selectedDate}</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadSlots(selectedClinicId, selectedDoctorId, selectedDate)}
                  className="h-7 text-xs"
                >
                  Refresh Slots
                </Button>
              </div>

              {slotsLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-clinical-600 mb-1" />
                  <span className="text-xs">Computing real-time doctor availability...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground border rounded-lg p-4 bg-muted/20">
                  <Clock className="h-8 w-8 mx-auto mb-1 text-muted-foreground/40" />
                  <p className="text-xs font-medium">No available slots on this date.</p>
                  <p className="text-[11px] text-muted-foreground">Doctor may be off, on leave, or all consultation slots booked.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {availableSlots.map((slot, idx) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2 rounded-md border text-center font-mono text-xs transition-all ${
                          isSelected
                            ? 'border-clinical-600 bg-clinical-600 text-white font-bold shadow'
                            : 'hover:bg-clinical-50 text-foreground border-border'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review Fee */}
          {bookStep === 6 && (
            <div className="p-4 rounded-lg bg-muted/30 border space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Consultation Specialty</span>
                <span className="font-semibold">{doctors.find((d) => d.id === selectedDoctorId)?.specialty}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Doctor</span>
                <span className="font-semibold">{doctors.find((d) => d.id === selectedDoctorId)?.fullName}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground font-semibold">Standard Consultation Fee</span>
                <span className="text-sm font-bold text-clinical-700">
                  PKR {doctors.find((d) => d.id === selectedDoctorId)?.consultationFee?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          )}

          {/* Step 7: Reason for visit */}
          {bookStep === 7 && (
            <div className="space-y-2 py-2">
              <label className="text-xs font-semibold">Clinical Reason for Visit (Optional)</label>
              <textarea
                className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-sm"
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                placeholder="Fever, cough for 3 days, seasonal allergy symptoms..."
              />
            </div>
          )}

          {/* Step 8: Final Review & Confirm */}
          {bookStep === 8 && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-4 rounded-lg border bg-clinical-50/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Facility:</span>
                  <span className="font-semibold">{clinics.find((c) => c.id === selectedClinicId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor:</span>
                  <span className="font-semibold">{doctors.find((d) => d.id === selectedDoctorId)?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-semibold">{patients.find((p) => p.id === selectedPatientId)?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Appointment Slot:</span>
                  <span className="font-bold text-clinical-700 font-mono">
                    {selectedDate} &bull; {selectedSlot?.startTime} - {selectedSlot?.endTime}
                  </span>
                </div>
                {reasonForVisit && (
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-muted-foreground">Reason:</span>
                    <span className="italic">{reasonForVisit}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            {bookStep > 1 ? (
              <Button type="button" variant="outline" size="sm" onClick={handlePrevStep} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setBookModalOpen(false)}>
                Cancel
              </Button>
            )}

            {bookStep < 8 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNextStep}
                disabled={
                  (bookStep === 1 && !selectedClinicId) ||
                  (bookStep === 2 && !selectedDoctorId) ||
                  (bookStep === 3 && !selectedPatientId) ||
                  (bookStep === 4 && !selectedDate) ||
                  (bookStep === 5 && !selectedSlot)
                }
                className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1"
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={bookingSubmitting}
                onClick={handleConfirmBooking}
                className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
              >
                {bookingSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm & Reserve Appointment'
                )}
              </Button>
            )}
          </DialogFooter>
        </div>
      </Dialog>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-clinical-600" />
                <span>Appointment {selectedAppointment.appointmentNumber}</span>
              </DialogTitle>
              <DialogDescription>
                Outpatient Booking Details & Transition History
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 text-xs py-2">
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Patient</span>
                <span className="font-medium text-foreground">{selectedAppointment.patient?.fullName}</span>
                <span className="text-muted-foreground block font-mono text-[11px]">{selectedAppointment.patient?.patientNumber}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Physician</span>
                <span className="font-medium text-foreground">{selectedAppointment.doctor?.fullName}</span>
                <span className="text-muted-foreground block text-[11px]">{selectedAppointment.doctor?.specialty}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Clinic Branch</span>
                <span>{selectedAppointment.clinic?.name}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Status</span>
                <div>{getStatusBadge(selectedAppointment.status)}</div>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Date & Time</span>
                <span className="font-mono text-foreground font-semibold">
                  {selectedAppointment.appointmentDate} &bull; {selectedAppointment.startTime} - {selectedAppointment.endTime}
                </span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Booking Source</span>
                <Badge variant="outline" className="text-xs">{selectedAppointment.bookingSource}</Badge>
              </div>
            </div>

            {selectedAppointment.reasonForVisit && (
              <div className="p-3 bg-muted/30 rounded-md text-xs">
                <span className="font-semibold text-muted-foreground block">Reason for Visit</span>
                <p className="text-foreground">{selectedAppointment.reasonForVisit}</p>
              </div>
            )}

            {/* Status History Timeline */}
            {selectedAppointment.statusHistory && selectedAppointment.statusHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t text-xs">
                <span className="font-semibold text-muted-foreground block">Status Audit Trail</span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {selectedAppointment.statusHistory.map((h) => (
                    <div key={h.id} className="p-2 rounded bg-muted/20 border text-[11px] flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-foreground">
                          {h.previousStatus ? `${h.previousStatus} → ` : ''}{h.newStatus}
                        </span>
                        {h.changeReason && <span className="text-muted-foreground block">{h.changeReason}</span>}
                      </div>
                      <span className="text-muted-foreground font-mono">{new Date(h.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {selectedAppointment.status === 'CONFIRMED' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-blue-600 hover:text-blue-700"
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'COMPLETED')}
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-slate-600 hover:text-slate-700"
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'NO_SHOW')}
                    >
                      No Show
                    </Button>
                  </>
                )}
                {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-blue-600"
                      onClick={() => handleOpenReschedule(selectedAppointment)}
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-rose-600"
                      onClick={() => handleOpenCancel(selectedAppointment)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new consultation date and available slot for {selectedAppointment?.appointmentNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Pick New Date</label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  if (selectedAppointment) {
                    loadRescheduleSlots(selectedAppointment.clinicId, selectedAppointment.doctorId, e.target.value);
                  }
                }}
              />
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Pick New Available Slot</label>
              {rescheduleSlots.length === 0 ? (
                <div className="p-3 bg-muted/20 border rounded text-center text-muted-foreground">
                  No slots available on this date.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                  {rescheduleSlots.map((s, idx) => {
                    const isSelected = rescheduleSelectedSlot?.startTime === s.startTime;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setRescheduleSelectedSlot(s)}
                        className={`p-1.5 rounded border text-center font-mono text-xs ${
                          isSelected ? 'bg-clinical-600 text-white font-bold' : 'hover:bg-muted/40'
                        }`}
                      >
                        {s.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Reason for Rescheduling</label>
              <Input
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Patient schedule change..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={rescheduleSubmitting || !rescheduleSelectedSlot}
              onClick={handleConfirmReschedule}
              className="bg-clinical-600 hover:bg-clinical-700 text-white"
            >
              {rescheduleSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              This will release the reserved time slot back into doctor availability.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            <label className="font-semibold text-muted-foreground block">Cancellation Reason *</label>
            <textarea
              className="w-full min-h-[70px] p-2 rounded-md border text-sm"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Patient requested cancellation due to symptom resolution..."
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              size="sm"
              disabled={cancelSubmitting || cancelReason.trim().length < 3}
              onClick={handleConfirmCancel}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Doctor Schedule Management Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <div className="space-y-4 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-clinical-600" />
              <span>Doctor Schedule & Working Hours</span>
            </DialogTitle>
            <DialogDescription>
              Configure weekly operational periods, consultation duration, and breaks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Doctor and Clinic selector */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Doctor</label>
                <select
                  className="w-full h-9 px-2 rounded border bg-background text-sm"
                  value={scheduleDoctorId}
                  onChange={(e) => {
                    setScheduleDoctorId(e.target.value);
                    loadDoctorSchedules(e.target.value, scheduleClinicId);
                  }}
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Clinic Branch</label>
                <select
                  className="w-full h-9 px-2 rounded border bg-background text-sm"
                  value={scheduleClinicId}
                  onChange={(e) => {
                    setScheduleClinicId(e.target.value);
                    loadDoctorSchedules(scheduleDoctorId, e.target.value);
                  }}
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Existing periods */}
            <div className="space-y-2">
              <span className="font-semibold text-muted-foreground block">Active Working Periods</span>
              {scheduleLoading ? (
                <div className="py-4 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
                  Loading schedules...
                </div>
              ) : doctorSchedules.length === 0 ? (
                <div className="p-3 bg-muted/20 border rounded text-center text-muted-foreground">
                  No active working hours configured for this doctor at this branch.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {doctorSchedules.map((wh) => (
                    <div
                      key={wh.id}
                      className="p-2 rounded border bg-background flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-semibold text-[11px]">
                          {dayNames[wh.dayOfWeek]}
                        </Badge>
                        <span className="font-mono">
                          {wh.startTime} - {wh.endTime}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          ({wh.slotDurationMinutes} min slots)
                        </span>
                        {wh.breakStartTime && (
                          <span className="text-[11px] text-amber-600 font-mono">
                            Break: {wh.breakStartTime}-{wh.breakEndTime}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-rose-600"
                        onClick={() => handleDeleteWorkingHours(wh.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new period form */}
            <form onSubmit={handleCreateWorkingHours} className="p-3 border rounded-lg bg-muted/20 space-y-3">
              <span className="font-semibold text-foreground block">Add Weekly Working Period</span>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block">Day of Week</label>
                  <select
                    className="w-full h-8 px-2 rounded border bg-background text-xs"
                    value={newDayOfWeek}
                    onChange={(e) => setNewDayOfWeek(Number(e.target.value))}
                  >
                    {dayNames.map((n, idx) => (
                      <option key={idx} value={idx}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block">Start Time</label>
                  <Input
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    placeholder="09:00"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block">End Time</label>
                  <Input
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    placeholder="17:00"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block">Slot (Min)</label>
                  <Input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={hasBreak}
                    onChange={(e) => setHasBreak(e.target.checked)}
                  />
                  <span>Include Lunch/Prayer Break</span>
                </label>
                {hasBreak && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newBreakStart}
                      onChange={(e) => setNewBreakStart(e.target.value)}
                      placeholder="13:00"
                      className="h-7 w-20 text-xs"
                    />
                    <span>to</span>
                    <Input
                      value={newBreakEnd}
                      onChange={(e) => setNewBreakEnd(e.target.value)}
                      placeholder="14:00"
                      className="h-7 w-20 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={scheduleSubmitting}
                  className="bg-clinical-600 hover:bg-clinical-700 text-white h-8 text-xs"
                >
                  {scheduleSubmitting ? 'Saving...' : 'Add Working Period'}
                </Button>
              </div>
            </form>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setScheduleModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
