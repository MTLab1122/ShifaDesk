'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  RotateCw,
  Sliders,
  Gift,
  Loader2,
} from 'lucide-react';

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Action Modal State
  const [activeModal, setActiveModal] = useState<'ACTION' | 'OVERRIDE' | 'CREDIT' | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form fields
  const [actionType, setActionType] = useState<'SUSPEND' | 'REACTIVATE' | 'EXTEND_TRIAL'>('SUSPEND');
  const [actionReason, setActionReason] = useState('');
  const [extendDays, setExtendDays] = useState(7);

  // Override fields
  const [overrideFeature, setOverrideFeature] = useState('WHATSAPP_RECEPTIONIST');
  const [overrideIncluded, setOverrideIncluded] = useState(true);
  const [overrideLimit, setOverrideLimit] = useState<string>('5000');
  const [overrideReason, setOverrideReason] = useState('');

  // Credit fields
  const [creditAmountPkr, setCreditAmountPkr] = useState('5000');
  const [creditReason, setCreditReason] = useState('');

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.platform.getTenants({
        search: search || undefined,
        status: statusFilter || undefined,
        planCode: planFilter || undefined,
        page: 1,
        limit: 50,
      });
      setTenants(res.items || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [statusFilter, planFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTenants();
  };

  const handleOpenAction = (tenant: any) => {
    setSelectedTenant(tenant);
    setActionType('SUSPEND');
    setActionReason('');
    setExtendDays(7);
    setModalError(null);
    setActiveModal('ACTION');
  };

  const handleOpenOverride = (tenant: any) => {
    setSelectedTenant(tenant);
    setOverrideFeature('WHATSAPP_RECEPTIONIST');
    setOverrideIncluded(true);
    setOverrideLimit('5000');
    setOverrideReason('');
    setModalError(null);
    setActiveModal('OVERRIDE');
  };

  const handleOpenCredit = (tenant: any) => {
    setSelectedTenant(tenant);
    setCreditAmountPkr('5000');
    setCreditReason('');
    setModalError(null);
    setActiveModal('CREDIT');
  };

  const submitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setModalLoading(true);
    setModalError(null);

    try {
      await ApiClient.platform.handleTenantAction(selectedTenant.id, {
        action: actionType,
        reason: actionReason,
        extendDays: actionType === 'EXTEND_TRIAL' ? extendDays : undefined,
      });
      setActiveModal(null);
      await fetchTenants();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to execute tenant action');
    } finally {
      setModalLoading(false);
    }
  };

  const submitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setModalLoading(true);
    setModalError(null);

    try {
      await ApiClient.platform.grantOverride(selectedTenant.id, {
        featureCode: overrideFeature,
        isIncluded: overrideIncluded,
        limitValue: overrideLimit ? parseInt(overrideLimit, 10) : null,
        grantedReason: overrideReason,
      });
      setActiveModal(null);
      alert('Custom entitlement override applied successfully');
    } catch (err: any) {
      setModalError(err?.message || 'Failed to grant entitlement override');
    } finally {
      setModalLoading(false);
    }
  };

  const submitCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setModalLoading(true);
    setModalError(null);

    try {
      const amountPaisa = Math.round(parseFloat(creditAmountPkr) * 100);
      await ApiClient.platform.grantCredit(selectedTenant.id, {
        amountPaisa,
        reason: creditReason,
      });
      setActiveModal(null);
      alert(`Granted PKR ${creditAmountPkr} in promotional credits successfully`);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to grant promotional credit');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant & Clinic Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage multi-tenant healthcare facilities, trial extensions, and administrative overrides.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search by clinic name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-md border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-xs rounded-md border border-slate-300 px-3 py-2 bg-white"
            >
              <option value="">All Plans</option>
              <option value="STARTER">STARTER</option>
              <option value="PROFESSIONAL">PROFESSIONAL</option>
              <option value="LABORATORY">LABORATORY</option>
            </select>

            <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base text-slate-900">Registered Facilities</CardTitle>
          <CardDescription>All provisioned organizations with active subscriptions and primary contacts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center">
              <RotateCw className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No clinic organizations found matching criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                    <th className="py-3 px-4">Clinic Facility</th>
                    <th className="py-3 px-4">Owner / Contact</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Subscription</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map((tenant) => {
                    const owner = tenant.memberships?.[0]?.userProfile;
                    const sub = tenant.subscriptions?.[0];

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{tenant.name}</p>
                          <p className="font-mono text-slate-400 text-[10px]">{tenant.slug}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <p className="font-medium text-slate-800">{owner?.fullName || 'N/A'}</p>
                          <p className="text-slate-400 text-[11px]">{owner?.email || 'N/A'}</p>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {sub?.plan?.name || 'Starter'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[10px] ${
                              sub?.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                                : sub?.status === 'TRIALING'
                                ? 'bg-teal-100 text-teal-800 hover:bg-teal-100'
                                : sub?.status === 'SUSPENDED'
                                ? 'bg-rose-100 text-rose-800 hover:bg-rose-100'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {sub?.status || 'NO SUB'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAction(tenant)}
                            className="text-[11px] h-7"
                          >
                            Status
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenOverride(tenant)}
                            className="text-[11px] h-7"
                          >
                            <Sliders className="w-3 h-3 mr-1" /> Overrides
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCredit(tenant)}
                            className="text-[11px] h-7 text-emerald-700"
                          >
                            <Gift className="w-3 h-3 mr-1" /> Credit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Modal (Suspend / Reactivate / Extend Trial) */}
      {activeModal === 'ACTION' && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Manage Status: {selectedTenant.name}
            </h3>

            {modalError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={submitAction} className="space-y-4 text-xs">
              <div>
                <Label className="text-xs">Select Action</Label>
                <select
                  value={actionType}
                  onChange={(e: any) => setActionType(e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="SUSPEND">Suspend Subscription (Retains Clinic Data)</option>
                  <option value="REACTIVATE">Reactivate Subscription</option>
                  <option value="EXTEND_TRIAL">Extend Free Trial Days</option>
                </select>
              </div>

              {actionType === 'EXTEND_TRIAL' && (
                <div>
                  <Label className="text-xs">Days to Extend</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={extendDays}
                    onChange={(e) => setExtendDays(parseInt(e.target.value, 10))}
                    className="mt-1 text-xs"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs">Audit Justification / Reason *</Label>
                <Input
                  required
                  placeholder="Reason for administrative override"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={modalLoading || !actionReason}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {modalLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : 'Confirm Action'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {activeModal === 'OVERRIDE' && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-600" /> Entitlement Override: {selectedTenant.name}
            </h3>

            {modalError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={submitOverride} className="space-y-4 text-xs">
              <div>
                <Label className="text-xs">Feature Code</Label>
                <Input
                  value={overrideFeature}
                  onChange={(e) => setOverrideFeature(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ovInc"
                  checked={overrideIncluded}
                  onChange={(e) => setOverrideIncluded(e.target.checked)}
                />
                <Label htmlFor="ovInc" className="text-xs">Is Feature Included / Enabled</Label>
              </div>

              <div>
                <Label className="text-xs">Custom Limit Value (Leave blank for unlimited)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={overrideLimit}
                  onChange={(e) => setOverrideLimit(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Administrative Justification *</Label>
                <Input
                  required
                  placeholder="e.g. VIP partner quota grant"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={modalLoading || !overrideReason}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {modalLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : 'Save Override'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Modal */}
      {activeModal === 'CREDIT' && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-600" /> Grant Promotional Credit: {selectedTenant.name}
            </h3>

            {modalError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={submitCredit} className="space-y-4 text-xs">
              <div>
                <Label className="text-xs">Credit Amount (PKR) *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={creditAmountPkr}
                  onChange={(e) => setCreditAmountPkr(e.target.value)}
                  className="mt-1 text-xs font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs">Grant Reason / Memo *</Label>
                <Input
                  required
                  placeholder="e.g. Courtesy waiver / Pilot launch gift"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={modalLoading || !creditReason}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {modalLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : 'Issue Credit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
