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
import { FinancialAnalyticsSummary, Clinic } from '@matabai/shared';
import {
  Receipt,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export default function FinancialAnalyticsPage() {
  const [data, setData] = React.useState<FinancialAnalyticsSummary | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<string>('30d');
  const [clinicId, setClinicId] = React.useState<string>('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.analytics.getFinance({
        period: period as any,
        clinicId: clinicId || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load financial analytics', err);
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

  const formatPkr = (paisa: number) => {
    return 'PKR ' + (paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 });
  };

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
          <h1 className="text-2xl font-bold tracking-tight">Financial Analytics & Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            Authoritative revenue collections, outstanding receivables, operating expenses, and payment channels.
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
            {['today', '7d', '30d', 'this_month', 'last_month'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded font-medium ${
                  period === p ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7d' ? '7D' : p === '30d' ? '30D' : p === 'this_month' ? 'This Month' : 'Last Month'}
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
          {/* Key Balances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Collected Cash & Digital</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatPkr(data.totalCollectedPaisa)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Physical cash: {formatPkr(data.cashRegisterCollectionsPaisa)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Invoiced Total</CardTitle>
                <Receipt className="h-4 w-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-600">{formatPkr(data.totalInvoicedPaisa)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active patient bills issued
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Outstanding Receivables</CardTitle>
                <Wallet className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatPkr(data.outstandingReceivablesPaisa)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Uncollected patient balances
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Net Operating Balance</CardTitle>
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{formatPkr(data.netOperatingBalancePaisa)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Less {formatPkr(data.totalExpensesPaisa)} expenses, {formatPkr(data.totalRefundsPaisa)} refunds
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tender / Payment Channel Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Method Distribution</CardTitle>
                <CardDescription>Breakdown by Cash, Raast, Manual Bank Transfer, and Card</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel / Method</TableHead>
                      <TableHead className="text-right">Collected Amount</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data.paymentMethodDistribution).length > 0 ? (
                      Object.entries(data.paymentMethodDistribution).map(([method, paisa]) => {
                        const share = data.totalCollectedPaisa > 0 ? Math.round((paisa / data.totalCollectedPaisa) * 100) : 0;
                        return (
                          <TableRow key={method}>
                            <TableCell className="font-medium">{method}</TableCell>
                            <TableCell className="text-right font-semibold">{formatPkr(paisa)}</TableCell>
                            <TableCell className="text-right">{share}%</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No payment records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Operating Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Operating Expense Breakdown</CardTitle>
                <CardDescription>Supplies, facility utilities, maintenance, and administrative costs</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense Category</TableHead>
                      <TableHead className="text-right">Disbursed (PKR)</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expenseCategoryBreakdown.length > 0 ? (
                      data.expenseCategoryBreakdown.map((exp) => {
                        const share = data.totalExpensesPaisa > 0 ? Math.round((exp.amountPaisa / data.totalExpensesPaisa) * 100) : 0;
                        return (
                          <TableRow key={exp.category}>
                            <TableCell className="font-medium">{exp.category}</TableCell>
                            <TableCell className="text-right">{formatPkr(exp.amountPaisa)}</TableCell>
                            <TableCell className="text-right">{share}%</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No operating expenses logged for this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
