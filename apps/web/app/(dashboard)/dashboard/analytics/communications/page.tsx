'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiClient } from '@/lib/api-client';
import { CommunicationAnalytics, Clinic } from '@matabai/shared';
import {
  MessageSquare,
  ArrowLeft,
  PhoneCall,
  CheckCircle2,
  Users,
  Clock,
  Globe,
} from 'lucide-react';

export default function CommunicationsAnalyticsPage() {
  const [data, setData] = React.useState<CommunicationAnalytics | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<string>('30d');
  const [clinicId, setClinicId] = React.useState<string>('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.analytics.getCommunications({
        period: period as any,
        clinicId: clinicId || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load communication analytics', err);
    } finally {
      setLoading(false);
    }
  }, [period, clinicId]);

  React.useEffect(() => {
    ApiClient.clinics.list().then((res) => {
      if (res?.items) setClinics(res.items);
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Executive Analytics
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Communication & Telephony Analytics</h1>
          <p className="text-sm text-muted-foreground">
            WhatsApp Business API delivery tracking, incoming voice IVR calls, and human receptionist handovers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            className="h-9 px-3 text-sm rounded-md border border-input bg-background"
          >
            <option value="">All Clinics</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex rounded-md bg-muted p-1 text-xs">
            {['today', '7d', '30d', 'this_month'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded font-medium ${
                  period === p ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7d' ? '7D' : p === '30d' ? '30D' : 'Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 bg-muted/20" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Section 1: WhatsApp Analytics */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Official Meta WhatsApp Business API
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Delivery Success Rate</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{data.whatsapp.deliverySuccessRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Delivered / read across all outbound messages
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Inbound Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-sky-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.whatsapp.inboundMessages}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Received from patients and visitors
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Outbound Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.whatsapp.outboundMessages}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notifications, reminders & AI responses ({data.whatsapp.failedMessages} failed)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Conversations</CardTitle>
                  <Users className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600">{data.whatsapp.conversations}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.whatsapp.humanHandovers} escalated to human receptionist
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section 2: AI Voice Telephony & IVR */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              AI Voice Telephony & Telephony Inbound
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Total Incoming Calls</CardTitle>
                  <PhoneCall className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.voice.totalCalls}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.voice.completedCalls} completed, {data.voice.missedCalls} missed/busy
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Answered Rate</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {data.voice.totalCalls > 0
                      ? Math.round((data.voice.answeredCalls / data.voice.totalCalls) * 100)
                      : 0}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.voice.answeredCalls} calls answered by IVR / AI
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Average Call Duration</CardTitle>
                  <Clock className="h-4 w-4 text-sky-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-sky-600">{data.voice.avgDurationSeconds}s</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average conversation length per completed call
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Transferred Calls</CardTitle>
                  <Users className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{data.voice.transferredCalls}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Transferred to clinic front-desk line
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Voice Language Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spoken Language Distribution</CardTitle>
              <CardDescription>Detected caller languages for voice reception</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(data.voice.languageDistribution).map(([lang, count]) => (
                  <div key={lang} className="p-4 rounded-lg border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold text-sm">
                          {lang === 'ur' ? 'Urdu (اردو)' : lang === 'ps' ? 'Pashto (پښتو)' : 'English'}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase">{lang}</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold">{count} calls</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
