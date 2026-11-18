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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiClient } from '@/lib/api-client';
import { AIUsageAnalytics, Clinic } from '@matabai/shared';
import {
  Bot,
  ArrowLeft,
  CheckCircle2,
  CalendarCheck,
  Coins,
} from 'lucide-react';

export default function AIUsageAnalyticsPage() {
  const [data, setData] = React.useState<AIUsageAnalytics | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<string>('30d');
  const [clinicId, setClinicId] = React.useState<string>('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.analytics.getAIUsage({
        period: period as any,
        clinicId: clinicId || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load AI usage analytics', err);
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
          <h1 className="text-2xl font-bold tracking-tight">AI Receptionist Usage & Telemetry</h1>
          <p className="text-sm text-muted-foreground">
            Multilingual AI conversational turns, tool execution reliability, booking conversion, token consumption, and costs.
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
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Conversational Turns</CardTitle>
                <Bot className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalInteractions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Urdu, Pashto & English interactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Tool Success Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{data.toolExecutionSuccessRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {data.toolExecutionsCount} automated backend tool calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">AI Booking Conversion</CardTitle>
                <CalendarCheck className="h-4 w-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-600">
                  {data.appointmentBookingsCompleted} / {data.appointmentBookingsAttempted}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Successfully completed appointments via AI
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Estimated AI Cost</CardTitle>
                <Coins className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">PKR {data.estimatedCostPkr}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.totalTokens.toLocaleString()} total tokens consumed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Intent Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recognized Patient Intents</CardTitle>
                <CardDescription>NLP classification distribution of incoming inquiries</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Intent</TableHead>
                      <TableHead className="text-right">Interactions</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data.intentDistribution).length > 0 ? (
                      Object.entries(data.intentDistribution).map(([intent, count]) => {
                        const share = data.totalInteractions > 0 ? Math.round((count / data.totalInteractions) * 100) : 0;
                        return (
                          <TableRow key={intent}>
                            <TableCell className="font-mono text-xs">{intent}</TableCell>
                            <TableCell className="text-right">{count}</TableCell>
                            <TableCell className="text-right">{share}%</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No intent classification data found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Token Consumption & Cost Telemetry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Token & Cost Telemetry</CardTitle>
                <CardDescription>Granular token allocation across prompts and model generations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">Input (Prompt) Tokens</div>
                    <div className="text-xs text-muted-foreground">Inbound patient text + system prompts</div>
                  </div>
                  <div className="font-mono font-bold text-sm">{data.totalInputTokens.toLocaleString()}</div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">Output (Generated) Tokens</div>
                    <div className="text-xs text-muted-foreground">Assistant conversational responses</div>
                  </div>
                  <div className="font-mono font-bold text-sm">{data.totalOutputTokens.toLocaleString()}</div>
                </div>

                <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-primary">Human Receptionist Handover Rate</div>
                    <div className="text-xs text-muted-foreground">
                      {data.handoverCount} escalations requiring front-desk staff
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-primary">{data.handoverRate}%</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
