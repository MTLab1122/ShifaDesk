'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiClient } from '@/lib/api-client';
import {
  FileText,
  Stethoscope,
  Pill,
  Clock,
  Printer,
  RefreshCw,
  AlertCircle,
  Building2,
} from 'lucide-react';

export default function PatientConsultationsPortalPage() {
  const [encounters, setEncounters] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Print modal
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [printHtml, setPrintHtml] = React.useState('');

  const loadEncounters = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.encounter.getPatientEncounters();
      setEncounters(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load your consultations history');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadEncounters();
  }, [loadEncounters]);

  const handlePrintPrescription = async (prescriptionId: string) => {
    try {
      const res = await ApiClient.encounter.getPrescriptionHtml(prescriptionId);
      setPrintHtml(res.html);
      setIsPrintModalOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to load prescription');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-clinical-600" />
            My Consultations & Prescriptions
          </h1>
          <p className="text-xs text-muted-foreground">
            Review your doctor consultation summaries, diagnoses, medication advice, and follow-ups.
          </p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={() => loadEncounters()} disabled={loading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Consultations List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground text-xs">
          <RefreshCw className="h-6 w-6 animate-spin text-clinical-600 mb-2" />
          Loading your consultations...
        </div>
      ) : encounters.length === 0 ? (
        <Card className="border border-slate-200 text-center py-12">
          <CardContent className="space-y-3">
            <FileText className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="font-semibold text-slate-800 text-base">No Consultations Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You do not have any recorded consultations on file. Book an appointment or visit the clinic.
            </p>
            <Link href="/patient/book-appointment">
              <Button size="sm" className="bg-clinical-600 hover:bg-clinical-700 text-white text-xs mt-2">
                Book An Appointment
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {encounters.map((enc) => (
            <Card key={enc.id} className="border border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 pb-3 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">
                      Consultation Visit
                    </span>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {enc.encounterDate}
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                      {enc.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {enc.clinic?.name || 'Clinic'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Doctor details */}
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-clinical-50 flex items-center justify-center text-clinical-600 font-bold text-xs">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{enc.doctor?.fullName}</h4>
                    <p className="text-[11px] text-muted-foreground">{enc.doctor?.specialty || 'Physician'}</p>
                  </div>
                </div>

                {/* Diagnoses */}
                {enc.diagnoses && enc.diagnoses.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-slate-700 block">Diagnoses / Assessment:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-800">
                      {enc.diagnoses.map((d: any, idx: number) => (
                        <li key={idx}>
                          {d.diagnosisDescription}
                          {d.diagnosisCode ? ` (${d.diagnosisCode})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prescriptions */}
                {enc.prescriptions && enc.prescriptions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Pill className="h-3.5 w-3.5 text-clinical-600" />
                        Prescribed Medications
                      </span>
                      {enc.prescriptions[0] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintPrescription(enc.prescriptions[0].id)}
                          className="text-xs h-7"
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          View / Print Prescription
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {enc.prescriptions.flatMap((rx: any) => rx.items || []).map((med: any, i: number) => (
                        <div key={i} className="p-2.5 border rounded-md bg-white text-xs space-y-0.5">
                          <span className="font-bold text-slate-900 block">{med.medicationName}</span>
                          <span className="text-muted-foreground block text-[11px]">
                            {med.strength} — {med.dosage} ({med.frequency}) for {med.duration}
                          </span>
                          {med.instructions && (
                            <span className="text-clinical-700 block text-[11px] italic font-medium">
                              Note: {med.instructions}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up Note */}
                {enc.followups && enc.followups.length > 0 && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs flex items-start gap-2 text-amber-900">
                    <Clock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-semibold block">
                        Doctor Follow-Up Recommendation: Return on {enc.followups[0].recommendedDate}
                      </span>
                      <p className="text-amber-800 text-[11px] mt-0.5">{enc.followups[0].instructions}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Print Modal */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-clinical-600" />
              Prescription Document
            </DialogTitle>
          </DialogHeader>

          <div className="border rounded-md p-4 bg-white">
            <iframe
              srcDoc={printHtml}
              title="Prescription Preview"
              className="w-full h-[550px] border-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                const w = window.open('', '_blank');
                if (w) {
                  w.document.write(printHtml);
                  w.document.close();
                  w.focus();
                  w.print();
                }
              }}
              className="bg-clinical-600 hover:bg-clinical-700 text-white"
            >
              Print Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
