'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api-client';
import { TenantUsageSummary } from '@matabai/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Calendar,
  RotateCw,
  Zap,
} from 'lucide-react';

export default function SubscriptionUsagePage() {
  const [usage, setUsage] = useState<TenantUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.subscription.getUsage();
      setUsage(res);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const getStatusChip = (status: 'NORMAL' | 'WARNING' | 'EXCEEDED') => {
    switch (status) {
      case 'EXCEEDED':
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 text-[10px]">LIMIT REACHED</Badge>;
      case 'WARNING':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">NEAR LIMIT</Badge>;
      default:
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">HEALTHY</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RotateCw className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feature Entitlements & Usage</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time telemetry and plan limits for your clinic operations in the current billing cycle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/subscription/plans">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs">
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Upgrade Capacity
            </Button>
          </Link>
        </div>
      </div>

      {/* Cycle Indicator */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600" />
          <span>
            Current Period:{' '}
            <strong>
              {usage ? new Date(usage.billingPeriodStart).toLocaleDateString() : ''} to{' '}
              {usage ? new Date(usage.billingPeriodEnd).toLocaleDateString() : ''}
            </strong>
          </span>
        </div>
        <div>
          <span className="font-semibold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
            {usage?.daysRemainingInPeriod ?? 0} days remaining
          </span>
        </div>
      </div>

      {/* Usage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usage?.items.map((item) => {
          const isUnlimited = item.isUnlimited;
          const pct = Math.min(100, item.percentageUsed);

          let barColor = 'bg-teal-600';
          if (item.status === 'WARNING') barColor = 'bg-amber-500';
          if (item.status === 'EXCEEDED') barColor = 'bg-rose-500';

          return (
            <Card key={item.featureCode} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">{item.label}</CardTitle>
                  <CardDescription className="text-xs">Feature: {item.featureCode}</CardDescription>
                </div>
                {getStatusChip(item.status)}
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {item.currentUsage.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">
                    {isUnlimited ? (
                      <span className="text-emerald-700 font-semibold">Unlimited Allowance</span>
                    ) : (
                      `Limit: ${item.limitValue.toLocaleString()} ${item.unit}`
                    )}
                  </span>
                </div>

                {!isUnlimited && (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span>{pct}% Consumed</span>
                      <span>
                        {Math.max(0, item.limitValue - item.currentUsage).toLocaleString()} {item.unit} remaining
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            Need higher WhatsApp message or doctor allowances? Upgrades take effect immediately with zero downtime.
          </span>
        </div>
        <Link href="/dashboard/subscription/plans">
          <Button size="sm" variant="outline" className="text-teal-800 border-teal-300 hover:bg-teal-100 text-xs">
            Explore Tiers
          </Button>
        </Link>
      </div>
    </div>
  );
}
