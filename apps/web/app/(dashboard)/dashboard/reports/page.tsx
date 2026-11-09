'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileBarChart,
  Download,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
} from 'lucide-react';

export default function ReportsAnalyticsPage() {
  const [timeframe, setTimeframe] = React.useState<'day' | 'week' | 'month'>('week');

  const stats = {
    day: { consultations: 42, revenue: '105,000 PKR', avgWait: '18 mins', labOrders: 28 },
    week: { consultations: 286, revenue: '715,000 PKR', avgWait: '16 mins', labOrders: 194 },
    month: { consultations: 1240, revenue: '3,100,000 PKR', avgWait: '15 mins', labOrders: 820 },
  }[timeframe];

  const handleExport = () => {
    alert(`Exporting MatabAI clinical encounter report (${timeframe}) to CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Clinical Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Outpatient volume metrics, doctor productivity, financial revenue, and queue efficiency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-muted p-1 text-xs">
            <button
              onClick={() => setTimeframe('day')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                timeframe === 'day' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                timeframe === 'week' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                timeframe === 'month' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              This Month
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultations Completed</CardTitle>
            <Users className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consultations}</div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +14% vs previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenue}</div>
            <p className="text-xs text-muted-foreground mt-1">Consultation & Lab tariff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Patient Wait</CardTitle>
            <Clock className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWait}</div>
            <p className="text-xs text-emerald-600 mt-1">Within optimal 20m target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pathology Tests Run</CardTitle>
            <FileBarChart className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.labOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Outpatient orders logged</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Department / Specialty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Department Volume Breakdown</CardTitle>
            <CardDescription>Patient distribution across outpatient clinical specialties.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Internal Medicine (Dr. Talha)</span>
                <span className="text-muted-foreground">48% (138 encounters)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-clinical-600 rounded-full" style={{ width: '48%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Pediatrics (Dr. Ayesha)</span>
                <span className="text-muted-foreground">32% (92 encounters)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '32%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Cardiology (Dr. Tariq)</span>
                <span className="text-muted-foreground">20% (56 encounters)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '20%' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctor Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Doctor Productivity Summary</CardTitle>
            <CardDescription>Clinical encounters and consultations recorded per clinician.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Patients</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Dr. Muhammad Talha</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Internal Med</TableCell>
                  <TableCell>138</TableCell>
                  <TableCell className="text-right font-semibold">345,000 PKR</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Dr. Ayesha Malik</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Pediatrics</TableCell>
                  <TableCell>92</TableCell>
                  <TableCell className="text-right font-semibold">184,000 PKR</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Dr. Tariq Khan</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Cardiology</TableCell>
                  <TableCell>56</TableCell>
                  <TableCell className="text-right font-semibold">196,000 PKR</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
