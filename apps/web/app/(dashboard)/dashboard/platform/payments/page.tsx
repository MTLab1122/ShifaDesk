'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { SubscriptionPayment } from '@matabai/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  RotateCw,
  ExternalLink,
  Loader2,
} from 'lucide-react';

export default function PlatformPaymentsPage() {
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Review modal
  const [reviewPayment, setReviewPayment] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'VERIFY' | 'REJECT'>('VERIFY');
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.platform.getPayments({
        status: statusFilter || undefined,
        page: 1,
        limit: 50,
      });
      setPayments(res.items || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleOpenReview = (payment: any, action: 'VERIFY' | 'REJECT') => {
    setReviewPayment(payment);
    setReviewAction(action);
    setReviewNotes('');
    setRejectionReason('');
    setActionError(null);
  };

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewPayment) return;

    setActionLoading(true);
    setActionError(null);

    try {
      if (reviewAction === 'VERIFY') {
        await ApiClient.platform.verifyPayment(reviewPayment.id, reviewNotes || undefined);
        alert(`Payment ${reviewPayment.paymentNumber} verified successfully! Invoice settled and subscription activated.`);
      } else {
        await ApiClient.platform.rejectPayment(reviewPayment.id, rejectionReason);
        alert(`Payment ${reviewPayment.paymentNumber} rejected.`);
      }

      setReviewPayment(null);
      await fetchPayments();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to process payment review');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">COMPLETED</Badge>;
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">PENDING REVIEW</Badge>;
      case 'FAILED':
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">REJECTED / FAILED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SaaS Payments & Verification Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review clinic bank transfer receipts, verify payments, and trigger automated subscription settlements.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-900">Payment Transactions</CardTitle>
            <CardDescription>Direct bank transfers, Raast payments, and online card attempts</CardDescription>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-md border border-slate-300 px-3 py-1.5 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING REVIEW</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED / REJECTED</option>
          </select>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center">
              <RotateCw className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No payment records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                    <th className="py-3 px-4">Payment #</th>
                    <th className="py-3 px-4">Clinic Facility</th>
                    <th className="py-3 px-4">Method / Reference</th>
                    <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.paymentNumber}</td>
                      <td className="py-3 px-4 text-slate-800">{p.organization?.name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{p.paymentMethod}</div>
                        <div className="font-mono text-slate-500 text-[11px] flex items-center gap-1.5">
                          {p.paymentReference}
                          {p.proofDocumentUrl && (
                            <a
                              href={p.proofDocumentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-teal-600 hover:text-teal-700 inline-flex items-center"
                            >
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        PKR {(p.amountPaisa / 100).toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {p.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleOpenReview(p, 'VERIFY')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReview(p, 'REJECT')}
                              className="text-rose-600 border-rose-300 hover:bg-rose-50 text-[11px] h-7"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {reviewPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600" />
              {reviewAction === 'VERIFY' ? 'Approve Payment' : 'Reject Payment'}
            </h3>

            {actionError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                {actionError}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 mb-4">
              <p><strong>Payment #:</strong> {reviewPayment.paymentNumber}</p>
              <p><strong>Clinic:</strong> {reviewPayment.organization?.name}</p>
              <p><strong>Amount:</strong> PKR {(reviewPayment.amountPaisa / 100).toLocaleString('en-PK')}</p>
              <p><strong>Reference / Txn:</strong> {reviewPayment.paymentReference}</p>
            </div>

            <form onSubmit={handleExecuteReview} className="space-y-4 text-xs">
              {reviewAction === 'VERIFY' ? (
                <div>
                  <Label className="text-xs">Verification Notes (Optional)</Label>
                  <Input
                    placeholder="e.g. Verified in Meezan Bank account statement"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Approving this payment will mark invoice as PAID and activate the clinic's subscription automatically.
                  </p>
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Rejection Reason *</Label>
                  <Input
                    required
                    placeholder="e.g. Transaction reference not found in bank ledger"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setReviewPayment(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={actionLoading || (reviewAction === 'REJECT' && !rejectionReason)}
                  className={
                    reviewAction === 'VERIFY'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }
                >
                  {actionLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : reviewAction === 'VERIFY' ? (
                    'Confirm Approval'
                  ) : (
                    'Confirm Rejection'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
