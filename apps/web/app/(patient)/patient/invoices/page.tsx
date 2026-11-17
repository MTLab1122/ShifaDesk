'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ApiClient } from '@/lib/api-client';
import { Invoice, Payment } from '@matabai/shared';
import {
  Receipt,
  Download,
  FileText,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  QrCode,
} from 'lucide-react';

export default function PatientInvoicesPage() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [payTargetInvoice, setPayTargetInvoice] = React.useState<Invoice | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [userInvoices, userPayments] = await Promise.all([
        ApiClient.finance.getPatientInvoices().catch(() => []),
        ApiClient.finance.getPatientPayments().catch(() => []),
      ]);
      setInvoices(userInvoices);
      setPayments(userPayments);
    } catch (err: any) {
      setError(err.message || 'Failed to load your financial invoices and payments');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const formatPkr = (minorUnits: number) => {
    const pkr = (minorUnits || 0) / 100;
    return `Rs. ${pkr.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Paid in Full</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Partially Paid</Badge>;
      case 'ISSUED':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Payment Due</Badge>;
      case 'DRAFT':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">Draft</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Completed</Badge>;
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Pending</Badge>;
      case 'REFUNDED':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Refunded</Badge>;
      case 'PARTIALLY_REFUNDED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Partially Refunded</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculations
  const totalBilledMinor = invoices.reduce((sum, inv) => sum + (inv.totalMinor || 0), 0);
  const totalPaidMinor = invoices.reduce((sum, inv) => sum + (inv.paidMinor || 0), 0);
  const totalOutstandingMinor = invoices
    .filter((inv) => inv.status !== 'CANCELLED' && inv.status !== 'DRAFT')
    .reduce((sum, inv) => sum + (inv.outstandingMinor || 0), 0);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Invoices & Payments</h1>
          <p className="text-sm text-muted-foreground">
            Review your clinic consultation and diagnostic bills, payment receipts, and outstanding balances.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Invoiced</CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">{formatPkr(totalBilledMinor)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {invoices.length} total invoice{invoices.length === 1 ? '' : 's'} on record
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Paid</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">{formatPkr(totalPaidMinor)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Settled via cash, bank transfer, and card
          </CardContent>
        </Card>

        <Card className={totalOutstandingMinor > 0 ? 'border-amber-200 bg-amber-50/30' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Outstanding Balance</CardDescription>
            <CardTitle className={`text-2xl font-bold ${totalOutstandingMinor > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {formatPkr(totalOutstandingMinor)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {totalOutstandingMinor > 0 ? 'Payable to clinic reception or online' : 'All accounts settled'}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="gap-2">
            <Receipt className="h-4 w-4" />
            Receipts ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Invoices */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-clinical-600" />
                Clinic Invoices
              </CardTitle>
              <CardDescription>
                Detailed itemized billing statements issued by your healthcare provider.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading your invoices...
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No invoices found for your account. Invoices issued during clinic visits or diagnostic tests will appear here.
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{inv.invoiceReference}</span>
                            {getInvoiceStatusBadge(inv.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {inv.clinic?.name || 'Clinic'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Issued: {new Date(inv.issuedAt || inv.createdAt).toLocaleDateString()}
                            </span>
                            {inv.dueAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Due: {new Date(inv.dueAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <div className="text-lg font-bold text-slate-900">{formatPkr(inv.totalMinor)}</div>
                          {inv.outstandingMinor > 0 ? (
                            <p className="text-xs font-semibold text-amber-700">
                              Due: {formatPkr(inv.outstandingMinor)}
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 sm:justify-end">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Fully Paid
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Items Preview */}
                      {inv.items && inv.items.length > 0 && (
                        <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <p className="font-medium text-slate-700">Services & Items:</p>
                          <div className="divide-y divide-slate-200/60">
                            {inv.items.slice(0, 3).map((item) => (
                              <div key={item.id} className="py-1 flex items-center justify-between">
                                <span className="text-slate-800">
                                  {item.descriptionSnapshot} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                                </span>
                                <span className="font-medium text-slate-700">{formatPkr(item.totalMinor)}</span>
                              </div>
                            ))}
                            {inv.items.length > 3 && (
                              <p className="pt-1 text-[11px] text-muted-foreground italic">
                                + {inv.items.length - 3} more item(s)...
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInvoice(inv)}
                            className="text-xs gap-1.5 h-8"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View Line Items
                          </Button>

                          <a
                            href={ApiClient.finance.getPatientPdfUrl(inv.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex"
                          >
                            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                          </a>
                        </div>

                        {inv.outstandingMinor > 0 && inv.status !== 'CANCELLED' && (
                          <Button
                            size="sm"
                            onClick={() => setPayTargetInvoice(inv)}
                            className="text-xs gap-1.5 h-8 bg-clinical-600 hover:bg-clinical-700 text-white"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Pay Outstanding ({formatPkr(inv.outstandingMinor)})
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Payment Receipts */}
        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-clinical-600" />
                Payment Receipts
              </CardTitle>
              <CardDescription>
                Official financial acknowledgments for cash and electronic payments received.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading payment receipts...
                </div>
              ) : payments.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No payment transactions recorded yet. Payments settled at the clinic or online will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((pmt) => (
                    <div
                      key={pmt.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{pmt.paymentReference}</span>
                          {getPaymentStatusBadge(pmt.status)}
                          <Badge variant="outline" className="text-[11px] font-mono">
                            {pmt.method.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Clinic: {pmt.clinic?.name || 'Healthcare Facility'}</span>
                          <span>•</span>
                          <span>{new Date(pmt.createdAt).toLocaleString()}</span>
                          {pmt.bankReference && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px]">Ref: {pmt.bankReference}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <span className="text-lg font-bold text-emerald-700">{formatPkr(pmt.amountMinor)}</span>
                        </div>
                        <a
                          href={ApiClient.finance.getPatientReceiptUrl(pmt.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                            <Download className="h-3.5 w-3.5" />
                            Receipt
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-clinical-600" />
                  {selectedInvoice.invoiceReference}
                </DialogTitle>
                {getInvoiceStatusBadge(selectedInvoice.status)}
              </div>
              <DialogDescription>
                Issued by {selectedInvoice.clinic?.name || 'Clinic'} on{' '}
                {new Date(selectedInvoice.issuedAt || selectedInvoice.createdAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              {/* Itemized Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Description</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <p className="font-medium text-slate-800">{item.descriptionSnapshot}</p>
                            <p className="text-[11px] text-muted-foreground">{item.itemType}</p>
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600">{item.quantity}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{formatPkr(item.unitPriceMinor)}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900">{formatPkr(item.totalMinor)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted-foreground">
                          No itemized details recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPkr(selectedInvoice.subtotalMinor)}</span>
                </div>
                {selectedInvoice.discountMinor > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>- {formatPkr(selectedInvoice.discountMinor)}</span>
                  </div>
                )}
                {selectedInvoice.taxMinor > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax</span>
                    <span>{formatPkr(selectedInvoice.taxMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200 text-sm">
                  <span>Total Amount</span>
                  <span>{formatPkr(selectedInvoice.totalMinor)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Amount Paid</span>
                  <span>{formatPkr(selectedInvoice.paidMinor)}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold border-t border-dashed border-slate-200 pt-1">
                  <span>Outstanding Due</span>
                  <span>{formatPkr(selectedInvoice.outstandingMinor)}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="p-2.5 rounded bg-amber-50/60 border border-amber-200/70 text-xs text-amber-800">
                  <span className="font-semibold">Notes:</span> {selectedInvoice.notes}
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <a
                href={ApiClient.finance.getPatientPdfUrl(selectedInvoice.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" /> Download Official PDF
                </Button>
              </a>
              <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Settlement Guidance Modal */}
      {payTargetInvoice && (
        <Dialog open={!!payTargetInvoice} onOpenChange={(open) => !open && setPayTargetInvoice(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-clinical-600" />
                Settle Outstanding Balance
              </DialogTitle>
              <DialogDescription>
                Invoice #{payTargetInvoice.invoiceReference} • Balance Due: {formatPkr(payTargetInvoice.outstandingMinor)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <Building2 className="h-4 w-4" />
                  Clinic Reception Cash Desk
                </div>
                <p className="text-emerald-700">
                  You can pay directly in cash or via card swipe at {payTargetInvoice.clinic?.name || 'the clinic'} front desk. An instant physical thermal receipt will be issued.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                  <QrCode className="h-4 w-4" />
                  Raast P2M & Bank Wire Transfer
                </div>
                <p className="text-blue-700">
                  Transfer to the clinic verified account using State Bank of Pakistan Raast or IBAN. Mention invoice reference <span className="font-mono font-bold">{payTargetInvoice.invoiceReference}</span> in the payment description for immediate automated ledger reconciliation.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-slate-600">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-clinical-600" />
                  Online Gateway Compliance
                </div>
                <p className="text-[11px] leading-relaxed">
                  Digital payment links are processed under State Bank of Pakistan (SBP) and Pakistan Telecommunication Authority (PTA) licensed payment service aggregators.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button className="w-full bg-clinical-600 hover:bg-clinical-700 text-white" onClick={() => setPayTargetInvoice(null)}>
                Got It
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
