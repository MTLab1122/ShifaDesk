'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApiClient } from '@/lib/api-client';
import { Doctor, Clinic, Patient, AvailableSlot, Appointment } from '@matabai/shared';
import {
  CheckCircle2,
  Stethoscope,
  ArrowLeft,
  ArrowRight,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function BookAppointmentPage() {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [loadingMeta, setLoadingMeta] = React.useState(true);

  const [selectedClinicId, setSelectedClinicId] = React.useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>('');
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0] || '';
  });
  const [availableSlots, setAvailableSlots] = React.useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<AvailableSlot | null>(null);
  const [reason, setReason] = React.useState('Routine clinical consultation');
  const [submitting, setSubmitting] = React.useState(false);
  const [createdAppointment, setCreatedAppointment] = React.useState<Appointment | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load active clinics, doctors, patients
  React.useEffect(() => {
    async function init() {
      try {
        setLoadingMeta(true);
        const [cRes, dRes, pRes] = await Promise.all([
          ApiClient.clinics.list({ limit: 50, status: 'ACTIVE' }),
          ApiClient.doctors.list({ limit: 50, status: 'ACTIVE' }),
          ApiClient.patients.list({ limit: 50 }),
        ]);

        const cList = cRes.items || [];
        const dList = dRes.items || [];
        const pList = pRes.items || [];

        setClinics(cList);
        setDoctors(dList);
        setPatients(pList);

        if (cList[0]) setSelectedClinicId(cList[0].id);
        if (dList[0]) setSelectedDoctorId(dList[0].id);
        if (pList[0]) setSelectedPatientId(pList[0].id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to initialize booking data';
        setErrorMsg(msg);
      } finally {
        setLoadingMeta(false);
      }
    }
    init();
  }, []);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Load availability
  const loadSlots = async (cId: string, dId: string, date: string) => {
    if (!cId || !dId || !date) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const slots = await ApiClient.availability.get({
        clinicId: cId,
        doctorId: dId,
        date,
      });
      setAvailableSlots(slots || []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSelectDoctorAndContinue = (docId: string, clinicId?: string) => {
    setSelectedDoctorId(docId);
    if (clinicId) setSelectedClinicId(clinicId);
    setStep(2);
    loadSlots(clinicId || selectedClinicId, docId, selectedDate);
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    loadSlots(selectedClinicId, selectedDoctorId, newDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedDoctorId || !selectedClinicId) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const patId = selectedPatientId || (patients[0] ? patients[0].id : '');
      const apt = await ApiClient.appointments.create({
        clinicId: selectedClinicId,
        doctorId: selectedDoctorId,
        patientId: patId,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        bookingSource: 'PATIENT_PORTAL',
        reasonForVisit: reason.trim() || undefined,
      });
      setCreatedAppointment(apt);
      setStep(4);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete appointment booking';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Link href="/patient">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Book Doctor Appointment</h1>
          <p className="text-muted-foreground text-sm">
            Live outpatient OPD booking with instant confirmation.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step Indicators */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div
          className={`p-2 rounded-lg text-center font-medium border ${
            step === 1 ? 'border-clinical-600 bg-clinical-50 text-clinical-700' : 'bg-white text-muted-foreground'
          }`}
        >
          1. Select Doctor
        </div>
        <div
          className={`p-2 rounded-lg text-center font-medium border ${
            step === 2 ? 'border-clinical-600 bg-clinical-50 text-clinical-700' : 'bg-white text-muted-foreground'
          }`}
        >
          2. Time Slot
        </div>
        <div
          className={`p-2 rounded-lg text-center font-medium border ${
            step >= 3 ? 'border-clinical-600 bg-clinical-50 text-clinical-700' : 'bg-white text-muted-foreground'
          }`}
        >
          3. Confirm Visit
        </div>
      </div>

      {loadingMeta ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-clinical-600" />
          <p className="text-sm">Loading clinic practitioners and availability...</p>
        </div>
      ) : (
        <>
          {/* Step 1: Select Doctor */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Specialist / Doctor</CardTitle>
                <CardDescription>Choose from available consultants at the clinic.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {doctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No active doctors registered yet.</p>
                ) : (
                  doctors.map((doc) => {
                    const isSelected = selectedDoctorId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-clinical-600 bg-clinical-50/50 ring-1 ring-clinical-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center font-bold shrink-0">
                            <Stethoscope className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{doc.fullName}</h4>
                            <p className="text-xs text-muted-foreground">
                              {doc.specialty} &bull; {doc.qualification}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Fee: <span className="font-semibold text-foreground">PKR {doc.consultationFee?.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>

                        <Badge variant="clinical" className="text-xs">
                          {doc.status}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-4">
                <Button
                  onClick={() => handleSelectDoctorAndContinue(selectedDoctorId)}
                  disabled={!selectedDoctorId}
                  className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5"
                >
                  Continue to Slots
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 2: Select Date & Time Slot */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Date & Time Slot</CardTitle>
                <CardDescription>
                  Consultation with {selectedDoctor?.fullName} ({selectedDoctor?.specialty})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Appointment Date</label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold block">Available Time Slots</label>
                  {slotsLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1 text-clinical-600" />
                      <p className="text-xs">Calculating available time slots...</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="p-4 rounded-lg bg-muted/20 border text-center text-muted-foreground">
                      <Clock className="h-6 w-6 mx-auto mb-1 text-muted-foreground/40" />
                      <p className="text-xs font-medium">No slots available on this date.</p>
                      <p className="text-[11px]">Please select another date above.</p>
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
                            className={`p-2 rounded-lg border text-xs font-mono font-medium transition-all ${
                              isSelected
                                ? 'border-clinical-600 bg-clinical-600 text-white shadow'
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
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!selectedSlot}
                  className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 3: Confirm Visit Details */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Confirm Appointment</CardTitle>
                <CardDescription>Verify your details before reserving the slot.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} id="book-form" className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consulting Doctor:</span>
                      <span className="font-semibold text-foreground">{selectedDoctor?.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Specialty:</span>
                      <span className="text-foreground">{selectedDoctor?.specialty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Facility / Clinic:</span>
                      <span className="text-foreground">{selectedClinic?.name || 'Clinic'}</span>
                    </div>
                    {selectedPatient && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Patient:</span>
                        <span className="text-foreground">{selectedPatient.fullName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Appointment Date:</span>
                      <span className="font-semibold font-mono text-foreground">{selectedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time Slot:</span>
                      <span className="font-bold text-clinical-700 font-mono">
                        {selectedSlot?.startTime} - {selectedSlot?.endTime}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-muted-foreground">Consultation Fee:</span>
                      <span className="font-bold text-foreground">
                        PKR {selectedDoctor?.consultationFee?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Reason for Visit / Symptoms</label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Seasonal flu, high blood pressure..."
                      className="text-xs"
                    />
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  form="book-form"
                  disabled={submitting}
                  className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reserving Slot...
                    </>
                  ) : (
                    'Confirm Appointment'
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 4: Booking Successful Confirmation */}
          {step === 4 && createdAppointment && (
            <Card className="text-center p-6 space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Appointment Confirmed!</h3>
                <p className="text-xs text-muted-foreground">
                  Your OPD consultation slot has been reserved in the clinic schedule.
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-muted/20 text-xs space-y-2 max-w-sm mx-auto text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Appointment Number:</span>
                  <span className="font-mono font-bold text-clinical-600">{createdAppointment.appointmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor:</span>
                  <span className="font-medium text-foreground">{createdAppointment.doctor?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time:</span>
                  <span className="font-mono text-foreground">
                    {createdAppointment.appointmentDate} at {createdAppointment.startTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="clinical" className="text-xs">{createdAppointment.status}</Badge>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Link href="/patient/appointments">
                  <Button variant="outline" className="text-xs">
                    View My Appointments
                  </Button>
                </Link>
                <Link href="/patient">
                  <Button className="bg-clinical-600 hover:bg-clinical-700 text-white text-xs">
                    Return to Patient Portal
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
