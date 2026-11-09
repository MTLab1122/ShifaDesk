'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Volume2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PatientTokensPage() {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [audioEnabled, setAudioEnabled] = React.useState(true);

  // Simulated live queue state
  const [myToken] = React.useState({
    tokenNumber: 101,
    doctorName: 'Dr. Muhammad Talha',
    specialty: 'Internal Medicine',
    room: 'Consultation Room 101',
    status: 'Called', // 'Waiting' | 'Called' | 'Completed'
    currentServing: 101,
    estimatedWaitMinutes: 0,
    patientsAhead: 0,
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patient">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live OPD Queue Tracker</h1>
            <p className="text-muted-foreground text-sm">
              Real-time waiting room calling board and estimated wait status.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Calling Board Display */}
      <Card
        className={`border-2 shadow-lg transition-all ${
          myToken.status === 'Called'
            ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-500/20'
            : 'border-clinical-500 bg-white'
        }`}
      >
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            {myToken.status === 'Called' ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 gap-1.5 uppercase tracking-wider animate-pulse">
                <span className="h-2 w-2 rounded-full bg-white" />
                NOW CALLING YOUR TOKEN!
              </Badge>
            ) : (
              <Badge variant="clinical" className="text-xs px-3 py-1">
                IN QUEUE — PLEASE WAIT
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
            Your OPD Token
          </CardDescription>
          <div className="text-6xl font-black text-slate-900 tracking-tight my-2">
            #{myToken.tokenNumber}
          </div>
          <CardTitle className="text-base text-slate-700">
            Assigned to {myToken.doctorName}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {myToken.status === 'Called' ? (
            <div className="p-4 rounded-xl bg-emerald-100/70 border border-emerald-300 text-center space-y-1">
              <div className="font-bold text-emerald-900 text-base flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                Proceed to {myToken.room}
              </div>
              <p className="text-xs text-emerald-800">
                Doctor is ready to see you. Please step into the examination room now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-slate-50 border">
                <span className="text-xs text-muted-foreground block">Currently Serving</span>
                <span className="text-xl font-bold text-slate-800">#{myToken.currentServing}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border">
                <span className="text-xs text-muted-foreground block">Estimated Wait</span>
                <span className="text-xl font-bold text-clinical-600">~{myToken.estimatedWaitMinutes} mins</span>
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-white p-3 space-y-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Department / OPD:</span>
              <span className="font-semibold text-slate-800">{myToken.specialty}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Room Location:</span>
              <span className="font-semibold text-slate-800">{myToken.room}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Patients Ahead:</span>
              <span className="font-semibold text-slate-800">{myToken.patientsAhead} patients</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 border-t flex items-center justify-between py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Volume2 className="h-4 w-4 text-clinical-600" />
            <span>Audio Chime: {audioEnabled ? 'Active' : 'Muted'}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="text-xs h-7"
          >
            {audioEnabled ? 'Mute Chime' : 'Unmute Chime'}
          </Button>
        </CardFooter>
      </Card>

      {/* Patient Waiting Room Guidance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Clinic Waiting Room Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>• Please keep your mobile phone ringer volume audible or monitor this screen.</p>
          <p>• When your token is called, please present yourself directly at {myToken.room}.</p>
          <p>• If you need to step out briefly, please inform the reception desk to prevent token skip.</p>
        </CardContent>
      </Card>
    </div>
  );
}
