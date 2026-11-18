'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';
import { SubscriptionPlan, TenantSubscription, BillingInterval } from '@matabai/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Zap,
  ArrowLeft,
  RotateCw,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function SubscriptionPlansPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<TenantSubscription | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(BillingInterval.MONTHLY);
  const [loading, setLoading] = useState(true);

  // Upgrade / Downgrade modal
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [actionType, setActionType] = useState<'UPGRADE' | 'DOWNGRADE' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        ApiClient.subscription.getPlans(),
        ApiClient.subscription.getCurrent(),
      ]);
      setPlans(plansRes);
      setCurrentSub(subRes);
      if (subRes?.billingInterval) {
        setBillingInterval(subRes.billingInterval);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (!currentSub) return;
    if (plan.id === currentSub.planId) return;

    setActionError(null);
    setSelectedPlan(plan);

    // Determine upgrade vs downgrade
    const currentPrice = currentSub.unitPricePaisa;
    const newPrice =
      billingInterval === BillingInterval.ANNUAL ? plan.annualPricePaisa : plan.monthlyPricePaisa;

    if (newPrice > currentPrice || currentSub.status === 'TRIALING') {
      setActionType('UPGRADE');
    } else {
      setActionType('DOWNGRADE');
    }
  };

  const executePlanChange = async () => {
    if (!selectedPlan || !currentSub) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (actionType === 'UPGRADE') {
        const res = await ApiClient.subscription.upgrade({
          newPlanCode: selectedPlan.code,
          billingInterval,
          applyCredit: true,
        });
        alert(`Plan upgraded successfully to ${selectedPlan.name}! Invoice ${res.invoice.invoiceNumber} has been generated.`);
      } else {
        await ApiClient.subscription.downgrade({
          newPlanCode: selectedPlan.code,
          effectiveImmediately: false,
        });
        alert(`Plan scheduled to downgrade to ${selectedPlan.name} at the end of the current billing cycle.`);
      }

      setSelectedPlan(null);
      await fetchData();
      router.push('/dashboard/subscription');
    } catch (err: any) {
      setActionError(err?.message || 'Plan transition failed. Please verify resource limits and try again.');
    } finally {
      setActionLoading(false);
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
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-600">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Subscription
        </Button>
      </div>

      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Flexible Subscription Plans for Healthcare Operations
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose the optimal tier for your clinic, polyclinic, or diagnostic laboratory with transparent, all-inclusive pricing.
        </p>

        {/* Interval toggle */}
        <div className="mt-6 inline-flex items-center p-1 bg-slate-200/80 rounded-lg">
          <button
            type="button"
            onClick={() => setBillingInterval(BillingInterval.MONTHLY)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              billingInterval === BillingInterval.MONTHLY
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval(BillingInterval.ANNUAL)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              billingInterval === BillingInterval.ANNUAL
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual Billing
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentSub?.planId === plan.id;
          const displayPricePaisa =
            billingInterval === BillingInterval.ANNUAL
              ? Math.round(plan.annualPricePaisa / 12)
              : plan.monthlyPricePaisa;
          const displayPriceFormatted = (displayPricePaisa / 100).toLocaleString('en-PK');

          return (
            <Card
              key={plan.id}
              className={`border transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-teal-600 ring-2 ring-teal-600 shadow-md bg-white'
                  : 'border-slate-200 hover:border-slate-300 shadow-sm bg-white'
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center mb-1">
                  <CardTitle className="text-xl text-slate-900 font-bold">{plan.name}</CardTitle>
                  {isCurrent && (
                    <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 text-[10px]">CURRENT PLAN</Badge>
                  )}
                </div>
                <CardDescription className="text-xs min-h-[32px]">{plan.description}</CardDescription>
                <div className="pt-4">
                  <div className="text-3xl font-extrabold text-slate-900">
                    PKR {displayPriceFormatted}
                    <span className="text-xs font-normal text-slate-500"> /month</span>
                  </div>
                  {billingInterval === BillingInterval.ANNUAL && (
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      Billed annually (PKR {(plan.annualPricePaisa / 100).toLocaleString('en-PK')}/yr)
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Features Included:</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  {plan.code === 'STARTER' && (
                    <>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> 1 Doctor & 3 Staff Accounts</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> Online & In-Clinic Appointments</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> Real-Time Digital Queue Management</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> Clinical Encounters & Prescriptions</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> 500 WhatsApp Messages / month</li>
                    </>
                  )}
                  {plan.code === 'PROFESSIONAL' && (
                    <>
                      <li className="flex items-center gap-2 font-semibold text-slate-900"><Check className="w-4 h-4 text-teal-600" /> Everything in Starter, plus:</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> Up to 5 Doctors & 15 Staff</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> AI Multilingual Receptionist (Urdu, Pashto)</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> AI Voice Telephony (200 minutes/mo)</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> Advanced Analytics & Custom Reports</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> 2,000 WhatsApp Messages / month</li>
                    </>
                  )}
                  {plan.code === 'LABORATORY' && (
                    <>
                      <li className="flex items-center gap-2 font-semibold text-slate-900"><Check className="w-4 h-4 text-teal-600" /> Everything in Professional, plus:</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> Diagnostic Pathology Laboratory Suite</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> Specimen Tracking & Encrypted PDFs</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> Up to 10 Doctors & 25 Staff</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> 5,000 WhatsApp Messages / month</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" /> 500 Voice Minutes / month</li>
                    </>
                  )}
                </ul>

                <div className="pt-4">
                  {isCurrent ? (
                    <Button disabled className="w-full bg-slate-100 text-slate-400 font-semibold text-xs">
                      Active Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5 mr-1.5" />
                      Switch to {plan.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                Confirm Plan {actionType === 'UPGRADE' ? 'Upgrade' : 'Downgrade'}
              </h3>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3 text-sm text-slate-600">
              <p>
                You are transitioning from <strong>{currentSub?.plan?.name}</strong> to{' '}
                <strong className="text-teal-700">{selectedPlan.name}</strong>.
              </p>

              {actionType === 'UPGRADE' ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <p className="font-semibold text-slate-800">Upgrade Billing Terms:</p>
                  <p>• A new SaaS invoice will be generated for the new plan period.</p>
                  <p>• Any unused prorated credit from your current billing cycle will be credited automatically.</p>
                  <p>• New feature entitlements and higher usage limits activate immediately.</p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <p className="font-semibold text-slate-800">Downgrade Terms:</p>
                  <p>• The lower plan tier will become effective at the end of your current paid billing period.</p>
                  <p>• No clinic or patient data will ever be deleted.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedPlan(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={executePlanChange}
                disabled={actionLoading}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Processing...
                  </>
                ) : (
                  `Confirm ${actionType === 'UPGRADE' ? 'Upgrade' : 'Downgrade'}`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
