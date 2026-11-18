'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { SubscriptionPlan } from '@matabai/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  RotateCw,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    monthlyPricePkr: '6999',
    annualPricePkr: '69990',
    trialDays: 14,
    doctorsCount: 1,
    staffCount: 3,
    branchesCount: 1,
    whatsappMessages: 500,
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.platform.getPlans();
      setPlans(res);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      monthlyPricePkr: '6999',
      annualPricePkr: '69990',
      trialDays: 14,
      doctorsCount: 1,
      staffCount: 3,
      branchesCount: 1,
      whatsappMessages: 500,
    });
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      monthlyPricePkr: (plan.monthlyPricePaisa / 100).toString(),
      annualPricePkr: (plan.annualPricePaisa / 100).toString(),
      trialDays: plan.trialDays,
      doctorsCount: 1,
      staffCount: 3,
      branchesCount: 1,
      whatsappMessages: 500,
    });
    setModalError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      const monthlyPaisa = Math.round(parseFloat(formData.monthlyPricePkr) * 100);
      const annualPaisa = Math.round(parseFloat(formData.annualPricePkr) * 100);

      if (editingPlan) {
        await ApiClient.platform.updatePlan(editingPlan.id, {
          name: formData.name,
          description: formData.description,
          monthlyPricePaisa: monthlyPaisa,
          annualPricePaisa: annualPaisa,
          trialDays: formData.trialDays,
        });
      } else {
        await ApiClient.platform.createPlan({
          name: formData.name,
          code: formData.code.toUpperCase(),
          description: formData.description,
          monthlyPricePaisa: monthlyPaisa,
          annualPricePaisa: annualPaisa,
          trialDays: formData.trialDays,
          currency: 'PKR',
          isActive: true,
          displayOrder: 0,
          gracePeriodDays: 7,
          overagePolicy: 'BLOCK',
          features: ['APPOINTMENTS_BASIC', 'QUEUE_MANAGEMENT', 'EMR_LITE'],
          limits: {
            DOCTORS_COUNT: formData.doctorsCount,
            STAFF_ACCOUNTS: formData.staffCount,
            CLINIC_BRANCHES: formData.branchesCount,
            MONTHLY_WHATSAPP_MESSAGES: formData.whatsappMessages,
          },
        });
      }

      setModalOpen(false);
      await fetchPlans();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save plan configuration');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!confirm(`Are you sure you want to deactivate plan '${plan.name}'?`)) return;
    try {
      await ApiClient.platform.deletePlan(plan.id);
      await fetchPlans();
    } catch (err: any) {
      alert(err?.message || 'Failed to deactivate plan');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Plans</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure multi-tenant SaaS tiers, monthly/annual pricing, and versioned feature allocations.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9">
          <Plus className="w-4 h-4 mr-1.5" /> Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 p-8 flex justify-center">
            <RotateCw className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="border-slate-200 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center mb-1">
                  <CardTitle className="text-lg text-slate-900">{plan.name}</CardTitle>
                  <Badge variant={plan.isActive ? 'default' : 'secondary'} className="text-[10px]">
                    {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
                <CardDescription className="font-mono text-xs text-slate-400">{plan.code}</CardDescription>
                <div className="pt-2">
                  <div className="text-2xl font-extrabold text-teal-700">
                    PKR {(plan.monthlyPricePaisa / 100).toLocaleString('en-PK')}
                    <span className="text-xs font-normal text-slate-500"> /mo</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Annual: PKR {(plan.annualPricePaisa / 100).toLocaleString('en-PK')}/yr
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-xs text-slate-600 min-h-[32px]">{plan.description}</p>
                <div className="text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-3">
                  <span>Trial Period:</span>
                  <strong>{plan.trialDays} Days</strong>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(plan)} className="text-xs h-7">
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  {plan.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(plan)}
                      className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Deactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create Subscription Plan'}
            </h3>

            {modalError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Plan Name *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Plan Code (UPPERCASE) *</Label>
                  <Input
                    required
                    disabled={Boolean(editingPlan)}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="mt-1 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Monthly Price (PKR) *</Label>
                  <Input
                    type="number"
                    required
                    value={formData.monthlyPricePkr}
                    onChange={(e) => setFormData({ ...formData, monthlyPricePkr: e.target.value })}
                    className="mt-1 text-xs font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs">Annual Price (PKR) *</Label>
                  <Input
                    type="number"
                    required
                    value={formData.annualPricePkr}
                    onChange={(e) => setFormData({ ...formData, annualPricePkr: e.target.value })}
                    className="mt-1 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Trial Days</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.trialDays}
                  onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value, 10) })}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={modalLoading}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {modalLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : 'Save Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
