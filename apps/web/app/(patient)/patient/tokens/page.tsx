'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiClient } from '@/lib/api-client';
import { QueueToken, QueueTokenStatus } from '@matabai/shared';
import { RefreshCw, ArrowLeft, CheckCircle2, Clock, MapPin } from 'lucide-react';

export default function PatientTokensPage() {
  const [tokens, setTokens] = React.useState<QueueToken[]>([]);
  const [selectedTokenDetail, setSelectedTokenDetail] = React.useState<
    (QueueToken & { currentActiveToken?: any; patientsAhead: number }) | null
  >(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  const fetchTokens = React.useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await ApiClient.patientTokens.list();
      const list = res.data || [];
      setTokens(list);

      if (list.length > 0) {
        // Fetch detailed active token (prefer WAITING, CALLED, or SERVING)
        const active = list.find((t) =>
          [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED, QueueTokenStatus.SERVING].includes(
            t.status as QueueTokenStatus,
          ),
        ) || list[0];

        if (active) {
          const detail = await ApiClient.patientTokens.get(active.id);
          setSelectedTokenDetail(detail);
        }
      } else {
        setSelectedTokenDetail(null);
      }
    } catch (err) {
      console.error('Failed to load patient tokens:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTokens();
    const interval = setInterval(fetchTokens, 6000);
    return () => clearInterval(interval);
  }, [fetchTokens]);

  const activeToken = selectedTokenDetail;

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
          onClick={fetchTokens}
          disabled={isRefreshing}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-clinical-600" />
          Loading your clinic tokens...
        </Card>
      ) : activeToken ? (
        <>
          {/* Main Calling Board Display */}
          <Card
            className={`border-2 shadow-lg transition-all ${
              activeToken.status === QueueTokenStatus.CALLED
                ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-500/20'
                : activeToken.status === QueueTokenStatus.SERVING
                ? 'border-blue-500 bg-blue-50/40'
                : 'border-clinical-500 bg-white'
            }`}
          >
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                {activeToken.status === QueueTokenStatus.CALLED ? (
                  <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 gap-1.5 uppercase tracking-wider animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    NOW CALLING YOUR TOKEN!
                  </Badge>
                ) : activeToken.status === QueueTokenStatus.SERVING ? (
                  <Badge className="bg-blue-600 text-white text-xs px-3 py-1">
                    NOW IN CONSULTATION
                  </Badge>
                ) : activeToken.status === QueueTokenStatus.COMPLETED ? (
                  <Badge className="bg-slate-600 text-white text-xs px-3 py-1">
                    CONSULTATION COMPLETED
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
                {activeToken.tokenDisplay}
              </div>
              <CardTitle className="text-base text-slate-700">
                {activeToken.queueSession?.doctor?.fullName
                  ? `Consultation with ${activeToken.queueSession.doctor.fullName}`
                  : activeToken.queueSession?.queueSettings?.queueName || 'General OPD'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              {activeToken.status === QueueTokenStatus.CALLED && (
                <div className="p-4 rounded-xl bg-emerald-100/70 border border-emerald-300 text-center space-y-1">
                  <div className="font-bold text-emerald-900 text-base flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    Please proceed to Consultation Room now!
                  </div>
                  <div className="text-xs text-emerald-800">
                    Your token was called at {new Date(activeToken.calledAt || activeToken.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              )}

              {/* Waiting Stats Banner */}
              {activeToken.status === QueueTokenStatus.WAITING && (
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs text-muted-foreground">Patients Ahead</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {activeToken.patientsAhead}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs text-muted-foreground">Estimated Wait</div>
                    <div className="text-2xl font-bold text-clinical-600">
                      ~{activeToken.estimatedWaitMinutes || 0} min
                    </div>
                  </div>
                </div>
              )}

              {/* Clinic & Current Doctor info */}
              <div className="pt-2 border-t space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    {activeToken.queueSession?.clinic?.name || 'Clinic'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    Checked in at {new Date(activeToken.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {activeToken.currentActiveToken && (
                  <div className="flex items-center justify-between font-medium text-slate-700 bg-slate-50 p-2 rounded">
                    <span>Doctor Currently Serving:</span>
                    <span className="font-extrabold text-clinical-700">
                      Token #{activeToken.currentActiveToken.tokenDisplay}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Previous Tokens List */}
          {tokens.length > 1 && (
            <div className="space-y-2 pt-4">
              <h3 className="text-sm font-semibold text-slate-700">Token History</h3>
              <div className="space-y-2">
                {tokens.map((t) => (
                  <div
                    key={t.id}
                    onClick={() =>
                      ApiClient.patientTokens.get(t.id).then((d) => setSelectedTokenDetail(d))
                    }
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      t.id === activeToken.id
                        ? 'border-clinical-400 bg-clinical-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{t.tokenDisplay}</span>
                      <span className="text-muted-foreground">
                        {t.queueSession?.clinic?.name || 'Clinic'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="p-8 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Clock className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">No Active OPD Tokens</CardTitle>
          <CardDescription>
            You do not have any active queue tokens for today. If you have an appointment, you can check in at the clinic reception to receive your token.
          </CardDescription>
          <Link href="/patient/book-appointment">
            <Button size="sm" className="bg-clinical-600 hover:bg-clinical-700 text-white mt-2">
              Book New Appointment
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
