'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApiClient } from '@/lib/api-client';
import { PublicQueueDisplay } from '@matabai/shared';
import { Volume2, RefreshCw, Stethoscope, AlertCircle } from 'lucide-react';

export default function PublicQueuePage() {
  const params = useParams();
  const publicQueueId = params?.publicQueueId as string;

  const [data, setData] = React.useState<PublicQueueDisplay | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState<string>('');

  // Clock ticker
  React.useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch queue data
  const fetchData = React.useCallback(async () => {
    if (!publicQueueId) return;
    try {
      const res = await ApiClient.publicQueue.get(publicQueueId);
      setData(res);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load public queue:', err);
      setError(err.message || 'Queue display unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [publicQueueId]);

  React.useEffect(() => {
    fetchData();
    // Fast polling for TV display (5 seconds)
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <RefreshCw className="h-10 w-10 animate-spin text-clinical-400 mb-4" />
        <h2 className="text-xl font-bold">Connecting to Live Queue Board...</h2>
        <p className="text-slate-400 text-sm mt-1">Please wait a moment</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-4" />
        <h2 className="text-2xl font-bold">Queue Display Unavailable</h2>
        <p className="text-slate-400 text-sm max-w-md mt-2">
          {error || 'This public queue screen has been disabled or expired. Please contact reception.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top Banner: Clinic Name, Queue Name, Clock */}
      <header className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold uppercase tracking-widest text-clinical-400">
              Live Waiting Room Monitor
            </span>
            <Badge
              className={`text-xs uppercase px-2.5 py-0.5 ${
                data.status === 'ACTIVE'
                  ? 'bg-emerald-600 text-white'
                  : data.status === 'PAUSED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {data.status}
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 text-slate-100">
            {data.clinicName}
          </h1>
          <div className="text-slate-400 text-base mt-1 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-clinical-400" />
            <span>{data.queueName}</span>
            {data.doctorName && <span>• {data.doctorName}</span>}
          </div>
        </div>

        {/* Live Clock */}
        <div className="text-right">
          <div className="text-3xl sm:text-5xl font-mono font-bold tracking-tight text-slate-200">
            {currentTime}
          </div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Main Center Grid: NOW SERVING vs RECENTLY CALLED */}
      <main className="my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Giant Now Serving Token Display (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <Card className="bg-slate-900 border-2 border-clinical-500/60 shadow-2xl overflow-hidden">
            <div className="bg-clinical-600/30 border-b border-clinical-500/40 p-4 text-center">
              <span className="text-base sm:text-lg font-bold uppercase tracking-widest text-clinical-300">
                NOW CALLING / SERVING
              </span>
            </div>
            <CardContent className="p-8 sm:p-14 text-center flex flex-col items-center justify-center">
              {data.currentServingToken ? (
                <>
                  <div className="text-7xl sm:text-9xl font-black text-white tracking-tight drop-shadow-md">
                    {data.currentServingToken}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-emerald-400 text-lg font-semibold animate-pulse">
                    <Volume2 className="h-6 w-6" />
                    <span>Please proceed to the Consultation Room</span>
                  </div>
                </>
              ) : (
                <div className="py-8 text-slate-500 text-2xl font-medium">
                  Waiting for Next Patient...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recently Called & Queue Stats (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          {/* Recently Called Ticker */}
          <Card className="bg-slate-900 border border-slate-800 flex-1">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Recently Called Tokens
              </span>
              <Volume2 className="h-4 w-4 text-slate-500" />
            </div>
            <CardContent className="p-4 space-y-2">
              {data.recentlyCalledTokens.length > 0 ? (
                data.recentlyCalledTokens.map((tok, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between"
                  >
                    <span className="font-mono font-bold text-xl text-slate-200">
                      Token #{tok}
                    </span>
                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                      Called
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-sm text-center py-6">
                  No recently called tokens yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Waiting Stats Banner */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <div className="text-xs uppercase font-semibold text-slate-400">Patients Waiting</div>
              <div className="text-3xl font-extrabold text-clinical-400 mt-1">
                {data.waitingCount}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <div className="text-xs uppercase font-semibold text-slate-400">Est. Average Wait</div>
              <div className="text-3xl font-extrabold text-amber-400 mt-1">
                ~{data.estimatedWaitMinutes || 0} min
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info & Privacy Guarantee */}
      <footer className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div>
          Powered by <span className="font-bold text-clinical-400">MatabAI (ShifaDesk)</span> • Real-Time Digital Token Display
        </div>
        <div className="flex items-center gap-4">
          <span>Privacy Guaranteed: No patient names or sensitive data displayed</span>
          <span>Synced: {new Date(data.lastUpdated).toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
}
