'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { SubscriptionInvoice } from '@matabai/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RotateCw,
  Printer,
} from 'lucide-react';

export default function PlatformInvoicesPage() {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.platform.getInvoices(1, 50);
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Platform SaaS Invoices</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Global subscription invoices issued to clinic tenants across the platform.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base text-slate-900">Issued Invoices Ledger</CardTitle>
          <CardDescription>Multi-tenant subscription invoices with payment statuses</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No platform invoices generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Clinic Facility</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Total (PKR)</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{inv.organization?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(inv.billingPeriodStart).toLocaleDateString()} —{' '}
                        {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        PKR {(inv.totalPaisa / 100).toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {inv.outstandingPaisa > 0 ? (
                          <span className="text-rose-600">
                            PKR {(inv.outstandingPaisa / 100).toLocaleString('en-PK')}
                          </span>
                        ) : (
                          <span className="text-emerald-600">PKR 0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/v1/subscription/invoices/${inv.id}/download`, '_blank')}
                          className="text-xs h-7"
                        >
                          <Printer className="w-3 h-3 mr-1" /> View HTML
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
