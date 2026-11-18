'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api-client';
import { TenantSubscription, SubscriptionStatus } from '@matabai/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  ShieldCheck,
  Calendar,
  Zap,
  Activity,
  FileText,
  AlertTriangle,
  RotateCw,
  XCircle,
  CheckCircle,
} from 'lucide-react';

export default function SubscriptionOverviewPage() {
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.subscription.getCurrent();
      setSubscription(res);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription at the end of the current billing cycle?')) {
      return;
    }
    setCancelling(true);
    try {
      await ApiClient.subscription.cancel({
        reason: 'Requested from clinic dashboard',
        immediately: false,
      });
      await fetchSubscription();
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await ApiClient.subscription.reactivate();
      await fetchSubscription();
    } catch (err: any) {
      alert(err?.message || 'Failed to reactivate subscription');
    } finally {
      setReactivating(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus | string) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">ACTIVE</Badge>;
      case SubscriptionStatus.TRIALING:
        return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">TRIALING (14 DAYS)</Badge>;
      case SubscriptionStatus.GRACE_PERIOD:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">GRACE PERIOD</Badge>;
      case SubscriptionStatus.SUSPENDED:
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">SUSPENDED</Badge>;
      case SubscriptionStatus.CANCELLED:
        return <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">CANCELLED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RotateCw className="w-6 h-6 animate-spin text-teal-600" />
          <p className="text-sm text-slate-500">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const currentPlanName = subscription?.plan?.name || 'Starter Plan';
  const priceFormatted = subscription ? (subscription.unitPricePaisa / 100).toLocaleString('en-PK') : '0';
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription & Billing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your clinic subscription tier, metered usage limits, and platform invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/subscription/plans">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">
              <Zap className="w-4 h-4 mr-2" />
              Change Plan
            </Button>
          </Link>
        </div>
      </div>

      {/* Warning banner if grace period or suspended */}
      {subscription?.status === SubscriptionStatus.GRACE_PERIOD && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-900 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Subscription Grace Period Active</p>
            <p>Your subscription billing period has ended. Please settle your outstanding SaaS invoice within 7 days to maintain uninterrupted service.</p>
          </div>
        </div>
      )}

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <Card className="border-slate-200 shadow-sm md:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-slate-900">Active Subscription Plan</CardTitle>
              <CardDescription>Multi-tenant SaaS tier assigned to your clinic facility</CardDescription>
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">{currentPlanName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Billed {subscription?.billingInterval?.toLowerCase() || 'monthly'}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-teal-700">
                  PKR {priceFormatted}
                  <span className="text-xs font-normal text-slate-500">
                    /{subscription?.billingInterval === 'ANNUAL' ? 'yr' : 'mo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <Calendar className="w-5 h-5 text-teal-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Renewal / Expiry Date</p>
                  <p className="font-medium text-slate-900">{periodEnd}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Auto-Renewal</p>
                  <p className="font-medium text-slate-900">
                    {subscription?.cancelAtPeriodEnd ? 'Cancels at Period End' : 'Enabled'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              {subscription?.cancelAtPeriodEnd || subscription?.status === SubscriptionStatus.CANCELLED ? (
                <Button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  variant="outline"
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Reactivate Subscription
                </Button>
              ) : (
                <Button
                  onClick={handleCancel}
                  disabled={cancelling}
                  variant="ghost"
                  className="text-slate-500 hover:text-rose-600 text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Cancel Subscription
                </Button>
              )}

              <Link href="/dashboard/subscription/plans">
                <Button variant="outline" className="text-xs">
                  Compare All Plans
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links & Shortcuts */}
        <div className="space-y-4">
          <Link href="/dashboard/subscription/usage" className="block">
            <Card className="border-slate-200 shadow-sm hover:border-teal-500 transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Metered Feature Usage</h4>
                  <p className="text-xs text-slate-500">Track doctor, staff, and message limits</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/subscription/invoices" className="block">
            <Card className="border-slate-200 shadow-sm hover:border-teal-500 transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Subscription Invoices</h4>
                  <p className="text-xs text-slate-500">View receipts and submit bank payments</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <CreditCard className="w-4 h-4 text-teal-600" /> Need Billing Assistance?
            </div>
            <p>Our SaaS support team is available via verified WhatsApp support or email at billing@matabai.local.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
