'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiClient } from '@/lib/api-client';
import { ShieldCheck, Lock, Download, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function PublicReportAccessPage() {
  const params = useParams();
  const token = params?.token as string;

  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [yearOfBirth, setYearOfBirth] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verifiedReport, setVerifiedReport] = React.useState<{
    reportReference: string;
    fileName: string;
    fileSizeBytes: number;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber && !yearOfBirth) {
      setError('Please provide your registered phone number or year of birth to verify access.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await ApiClient.laboratory.verifyPublicReport(token, {
        phoneNumber: phoneNumber.trim() || undefined,
        yearOfBirth: yearOfBirth ? Number(yearOfBirth) : undefined,
      });

      setVerifiedReport(result);
    } catch (err: any) {
      setError(
        err.message ||
          'Verification failed. Please ensure the information matches the phone number or birth year registered with the clinic.',
      );
    } finally {
      setLoading(false);
    }
  };

  const streamUrl = verifiedReport
    ? ApiClient.laboratory.getPublicStreamUrl(token, {
        phone: phoneNumber.trim() || undefined,
        dobYear: yearOfBirth ? Number(yearOfBirth) : undefined,
      })
    : '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-clinical-600 text-white shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Secure Diagnostic Report Portal
          </h1>
          <p className="text-xs text-muted-foreground">
            MatabAI (ShifaDesk) • Encrypted Healthcare Report Delivery
          </p>
        </div>

        {verifiedReport ? (
          /* Report Verified & Ready */
          <Card className="border-emerald-200 bg-white shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl text-slate-900">Identity Verified</CardTitle>
              <CardDescription>
                Your diagnostic laboratory report is authenticated and ready for secure download.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Report Reference:</span>
                  <span className="font-semibold text-slate-900">{verifiedReport.reportReference}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Format:</span>
                  <Badge variant="outline" className="font-mono text-xs">PDF Document</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="text-xs text-slate-700">
                    {Math.round(verifiedReport.fileSizeBytes / 1024)} KB
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">Confidential Medical Document</p>
                <p>
                  This official pathology report was reviewed and electronically validated by clinic staff.
                  Keep this copy safe for your doctor.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex"
              >
                <Button className="w-full bg-clinical-600 hover:bg-clinical-700 text-white gap-2 h-11 text-base">
                  <Download className="h-5 w-5" />
                  View & Download Report (PDF)
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVerifiedReport(null)}
                className="text-xs text-muted-foreground"
              >
                Verify another factor
              </Button>
            </CardFooter>
          </Card>
        ) : (
          /* Verification Prompt Form */
          <Card className="shadow-lg border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-clinical-600" />
                Patient Identity Verification
              </CardTitle>
              <CardDescription>
                To safeguard sensitive health data, please enter your registered phone number or year of birth.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleVerify}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">
                    Registered Mobile Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. 03001234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    The contact number provided during your clinic registration.
                  </p>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-2 text-[11px] text-muted-foreground uppercase font-semibold">
                    OR
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">
                    Year of Birth
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 1990"
                    min="1900"
                    max="2026"
                    value={yearOfBirth}
                    onChange={(e) => setYearOfBirth(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    4-digit birth year registered on your patient record.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-clinical-600 hover:bg-clinical-700 text-white h-10 gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Verifying Access...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Verify & Access Report
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground">
          Need assistance? Contact your clinic receptionist or visit the clinic with your token reference.
        </div>
      </div>
    </div>
  );
}
