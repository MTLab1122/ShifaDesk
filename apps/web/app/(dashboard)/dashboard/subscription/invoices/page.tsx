'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { SubscriptionInvoice, SaasPaymentMethod } from '@matabai/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  RotateCw,
  Printer,
  AlertCircle,
  Loader2,
  Building2,
} from 'lucide-react';

export default function SubscriptionInvoicesPage() {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Pay modal
  const [payingInvoice, setPayingInvoice] = useState<SubscriptionInvoice | null>(null);
  const [payMethod, setPayMethod] = useState<SaasPaymentMethod>(SaasPaymentMethod.MANUAL_BANK_TRANSFER);
  const [paymentRef, setPaymentRef] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.subscription.getInvoices(1, 50);
      setInvoices(res.items || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleOpenPay = (inv: SubscriptionInvoice) => {
    setPayingInvoice(inv);
    setPaymentRef('');
    setProofUrl('');
    setPayError(null);
    setPaySuccess(null);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    setPayLoading(true);
    setPayError(null);
    setPaySuccess(null);

    try {
      if (payMethod === SaasPaymentMethod.MANUAL_BANK_TRANSFER) {
        await ApiClient.subscription.submitManualPayment({
          invoiceId: payingInvoice.id,
          paymentMethod: 'MANUAL_BANK_TRANSFER',
          paymentReference: paymentRef,
          proofDocumentUrl: proofUrl || undefined,
          amountPaisa: payingInvoice.outstandingPaisa,
        });

        setPaySuccess('Bank transfer reference submitted successfully! Our platform administrator will verify funds and activate your subscription.');
        await fetchInvoices();
        setTimeout(() => setPayingInvoice(null), 2500);
      } else {
        const checkout = await ApiClient.subscription.initiateCardPayment(payingInvoice.id);
        if (checkout.status === 'BLOCKED') {
          setPayError(checkout.message);
        } else if (checkout.checkoutUrl) {
          window.location.href = checkout.checkoutUrl;
        }
      }
    } catch (err: any) {
      setPayError(err?.message || 'Failed to submit payment reference.');
    } finally {
      setPayLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">PAID</Badge>;
      case 'ISSUED':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">ISSUED (UNPAID)</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">OVERDUE</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">
          Official receipts and payment status for your clinic SaaS subscription.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base text-slate-900">Billing History</CardTitle>
          <CardDescription>All subscription invoices issued to your clinic organization</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No subscription invoices generated yet. Invoices are issued at the start of each billing period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total (PKR)</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {new Date(inv.billingPeriodStart).toLocaleDateString()} —{' '}
                        {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        PKR {(inv.totalPaisa / 100).toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {inv.outstandingPaisa > 0 ? (
                          <span className="text-rose-600">
                            PKR {(inv.outstandingPaisa / 100).toLocaleString('en-PK')}
                          </span>
                        ) : (
                          <span className="text-emerald-600">PKR 0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/v1/subscription/invoices/${inv.id}/download`, '_blank')}
                          className="text-xs h-8"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" /> View / Print
                        </Button>
                        {inv.outstandingPaisa > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPay(inv)}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" /> Pay Now
                          </Button>
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

      {/* Pay Now Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-600" />
                Pay Invoice: {payingInvoice.invoiceNumber}
              </h3>
              <button
                onClick={() => setPayingInvoice(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {payError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{payError}</span>
              </div>
            )}

            {paySuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                {paySuccess}
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Total:</span>
                  <span className="font-semibold text-slate-800">
                    PKR {(payingInvoice.totalPaisa / 100).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Due:</span>
                  <span className="font-bold text-rose-600 text-sm">
                    PKR {(payingInvoice.outstandingPaisa / 100).toLocaleString('en-PK')}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setPayMethod(SaasPaymentMethod.MANUAL_BANK_TRANSFER)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      payMethod === SaasPaymentMethod.MANUAL_BANK_TRANSFER
                        ? 'border-teal-600 bg-teal-50 text-teal-800 ring-1 ring-teal-600'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Direct Bank Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod(SaasPaymentMethod.CARD)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      payMethod === SaasPaymentMethod.CARD
                        ? 'border-teal-600 bg-teal-50 text-teal-800 ring-1 ring-teal-600'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Card / Safepay
                  </button>
                </div>
              </div>

              {payMethod === SaasPaymentMethod.MANUAL_BANK_TRANSFER ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg text-[11px] text-teal-900 leading-relaxed">
                    <strong>Bank Account Details:</strong><br />
                    Meezan Bank Ltd | MatabAI (Pvt) Ltd<br />
                    IBAN: <span className="font-mono">PK36MEZN0001234567890123</span>
                  </div>

                  <div>
                    <Label htmlFor="paymentRef" className="text-xs">
                      Bank Transaction Reference / Cheque # *
                    </Label>
                    <Input
                      id="paymentRef"
                      placeholder="e.g. TXN-123456789"
                      required
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label htmlFor="proofUrl" className="text-xs">
                      Proof Document / Screenshot URL (Optional)
                    </Label>
                    <Input
                      id="proofUrl"
                      placeholder="https://..."
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  You will be redirected to Safepay / Card Gateway to complete your online card payment.
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setPayingInvoice(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={payLoading || (payMethod === SaasPaymentMethod.MANUAL_BANK_TRANSFER && !paymentRef)}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {payLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Submitting...
                    </>
                  ) : (
                    'Submit Payment'
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
