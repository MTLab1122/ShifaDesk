'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MOCK_DOCTORS } from '@/lib/mock-data';
import { CheckCircle2, Stethoscope, ArrowLeft, ArrowRight } from 'lucide-react';

export default function BookAppointmentPage() {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>(MOCK_DOCTORS[0]?.id || '');
  const [selectedDate, setSelectedDate] = React.useState<string>('2026-11-10');
  const [selectedSlot, setSelectedSlot] = React.useState<string>('10:00 AM');
  const [patientName, setPatientName] = React.useState('Usman Ali');
  const [patientPhone, setPatientPhone] = React.useState('03211122334');
  const [reason, setReason] = React.useState('Routine seasonal checkup and blood pressure review');

  const selectedDoctor = MOCK_DOCTORS.find((d) => d.id === selectedDoctorId) || MOCK_DOCTORS[0];

  const slots = [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
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
            Schedule an outpatient OPD visit with a specialist in under 2 minutes.
          </p>
        </div>
      </div>

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

      {/* Step 1: Select Doctor */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Specialist / Doctor</CardTitle>
            <CardDescription>Choose from available consultants at the clinic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_DOCTORS.map((doc) => {
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
                    <div className="h-10 w-10 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center font-bold">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{doc.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {doc.specialty} • {doc.qualifications}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {doc.roomNumber} • Fee: <span className="font-semibold text-foreground">{doc.consultationFee} PKR</span>
                      </p>
                    </div>
                  </div>

                  <Badge variant={doc.status === 'Available' ? 'clinical' : 'outline'} className="text-xs">
                    {doc.status}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button onClick={() => setStep(2)} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5">
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
              Appointments for {selectedDoctor?.name} ({selectedDoctor?.specialty})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Consultation Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min="2026-11-09"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Available Time Slots</label>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-clinical-600 bg-clinical-600 text-white font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5">
              Patient Details
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Patient Details & Confirm */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Confirm Patient Information</CardTitle>
              <CardDescription>Provide outpatient details to finalize token allocation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border text-xs space-y-1">
                <div className="font-semibold text-slate-800">Booking Summary:</div>
                <div className="text-muted-foreground">Doctor: {selectedDoctor?.name} ({selectedDoctor?.specialty})</div>
                <div className="text-muted-foreground">Date & Slot: {selectedDate} at {selectedSlot}</div>
                <div className="text-muted-foreground">Fee Payable at Clinic: {selectedDoctor?.consultationFee} PKR</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Patient Full Name</label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mobile Phone (for WhatsApp SMS Confirmation)</label>
                <Input
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for Visit / Symptoms</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Fever, cough, follow up"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white">
                Confirm & Book Appointment
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {/* Step 4: Booking Completed Confirmation */}
      {step === 4 && (
        <Card className="border-2 border-emerald-500 bg-emerald-50/20 text-center p-6 space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div>
            <Badge className="bg-emerald-600 text-white mb-2">Booking Confirmed</Badge>
            <h2 className="text-2xl font-bold text-slate-900">Your Appointment is Set!</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Token #104 has been generated and sent to {patientPhone} via WhatsApp.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-white border text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Doctor:</span>
              <span className="font-semibold">{selectedDoctor?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-semibold">{selectedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slot:</span>
              <span className="font-semibold">{selectedSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room:</span>
              <span className="font-semibold">{selectedDoctor?.roomNumber}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Link href="/patient/tokens">
              <Button className="bg-clinical-600 hover:bg-clinical-700 text-white">
                Track Live Queue
              </Button>
            </Link>
            <Link href="/patient">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
