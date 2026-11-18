'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api-client';
import { PlatformOverviewMetrics } from '@matabai/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  TrendingUp,
  CreditCard,
  Users,
  AlertTriangle,
  RotateCw,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function PlatformOverviewPage() {
  const [metrics, setMetrics] = useState<PlatformOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.platform.getOverview();
      setMetrics(res);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RotateCw className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const mrrFormatted = metrics ? (metrics.mrrPaisa / 100).toLocaleString('en-PK') : '0';
  const arrFormatted = metrics ? (metrics.arrPaisa / 100).toLocaleString('en-PK') : '0';
  const unpaidFormatted = metrics ? (metrics.outstandingInvoicesPaisa / 100).toLocaleString('en-PK') : '0';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" /> SUPER-ADMIN CONSOLE
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Administration</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cross-tenant SaaS metrics, recurring revenue, plan distribution, and platform governance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/platform/payments">
            <Button variant="outline" size="sm" className="text-xs h-9">
              <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Review Payments
            </Button>
          </Link>
          <Link href="/dashboard/platform/tenants">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 font-semibold">
              <Building2 className="w-3.5 h-3.5 mr-1.5" /> Manage Tenants
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Level Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 uppercase">Monthly Recurring Revenue</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-teal-700">PKR {mrrFormatted}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Normalized active subscriptions</span>
          </CardContent>
        </Card>

        {/* ARR */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 uppercase">Annual Run Rate (ARR)</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900">PKR {arrFormatted}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500">
            <span>Projected annualized recurring revenue</span>
          </CardContent>
        </Card>

        {/* Total Tenants */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 uppercase">Registered Clinics / Tenants</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900">
              {metrics?.totalTenants ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 flex items-center gap-2">
            <span className="text-emerald-700 font-bold">{metrics?.activeSubscriptions ?? 0} Active</span>
            <span>•</span>
            <span className="text-teal-700 font-bold">{metrics?.trialingSubscriptions ?? 0} Trialing</span>
          </CardContent>
        </Card>

        {/* Unpaid SaaS Receivables */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 uppercase">Outstanding Invoices</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-amber-700">PKR {unpaidFormatted}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Uncollected subscription balances</span>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <Card className="border-slate-200 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-slate-900">Plan Distribution</CardTitle>
            <CardDescription>Breakdown of active clinic subscriptions by tier</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {metrics?.planDistribution.map((item) => (
              <div key={item.planCode} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{item.planName}</span>
                  <span>{item.count} clinics ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Platform Churn Rate:</span>
              <strong className="text-slate-800">{metrics?.churnRatePercent ?? 0}%</strong>
            </div>
          </CardContent>
        </Card>

        {/* Recent Clinic Signups */}
        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-900">Recent Clinic Onboardings</CardTitle>
              <CardDescription>Latest healthcare facilities provisioned on the platform</CardDescription>
            </div>
            <Link href="/dashboard/platform/tenants">
              <Button variant="ghost" size="sm" className="text-xs text-teal-600 font-semibold">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                    <th className="py-2.5 px-4">Clinic Facility</th>
                    <th className="py-2.5 px-4">Slug</th>
                    <th className="py-2.5 px-4">Plan</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics?.recentSignups.map((signup) => (
                    <tr key={signup.organizationId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{signup.organizationName}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{signup.slug}</td>
                      <td className="py-2.5 px-4">{signup.planName}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          className={`text-[10px] ${
                            signup.subscriptionStatus === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-teal-100 text-teal-800 hover:bg-teal-100'
                          }`}
                        >
                          {signup.subscriptionStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {new Date(signup.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
        <Link href="/dashboard/platform/tenants" className="block">
          <Card className="hover:border-teal-500 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="w-5 h-5 text-teal-600" />
              <div>
                <p className="text-xs font-semibold text-slate-900">Tenants & Clinics</p>
                <p className="text-[11px] text-slate-500">Directory & Suspensions</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/platform/payments" className="block">
          <Card className="hover:border-teal-500 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-teal-600" />
              <div>
                <p className="text-xs font-semibold text-slate-900">Payments Queue</p>
                <p className="text-[11px] text-slate-500">Manual Transfer Reviews</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/platform/plans" className="block">
          <Card className="hover:border-teal-500 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-teal-600" />
              <div>
                <p className="text-xs font-semibold text-slate-900">SaaS Plans</p>
                <p className="text-[11px] text-slate-500">Pricing & Limits Config</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/platform/audit-logs" className="block">
          <Card className="hover:border-teal-500 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-teal-600" />
              <div>
                <p className="text-xs font-semibold text-slate-900">Audit Ledger</p>
                <p className="text-[11px] text-slate-500">Super-Admin Actions</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
