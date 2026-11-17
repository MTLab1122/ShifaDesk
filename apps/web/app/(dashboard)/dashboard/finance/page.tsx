'use client';

import * as React from 'react';
import { ApiClient } from '@/lib/api-client';
import {
  Invoice,
  Payment,
  Refund,
  Expense,
  ExpenseCategory,
  CashRegisterSession,
  FinancialAnalytics,
  InvoiceItemType,
  Patient,
  Clinic,
} from '@matabai/shared';
import {
  DollarSign,
  Receipt,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Printer,
  Download,
  XCircle,
  FileText,
  Wallet,
  RotateCcw,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function FinanceDashboardPage() {
  const [activeTab, setActiveTab] = React.useState('invoices');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Core Data
  const [analytics, setAnalytics] = React.useState<FinancialAnalytics | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [refunds, setRefunds] = React.useState<Refund[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [activeCashSession, setActiveCashSession] = React.useState<CashRegisterSession | null>(null);
  const [cashSessions, setCashSessions] = React.useState<CashRegisterSession[]>([]);
  const [reconciliation, setReconciliation] = React.useState<any>(null);
  const [gatewayStatus, setGatewayStatus] = React.useState<any>(null);

  // Aux Data
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [selectedClinicId, setSelectedClinicId] = React.useState<string>('');

  // Search & Filter
  const [invoiceSearch, setInvoiceSearch] = React.useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = React.useState('ALL');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = React.useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = React.useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = React.useState(false);
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = React.useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
  const [isManualReconcileModalOpen, setIsManualReconcileModalOpen] = React.useState(false);

  // Selected for Actions
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null);
  const [receiptHtmlUrl, setReceiptHtmlUrl] = React.useState<string>('');

  // Form States
  const [invoiceForm, setInvoiceForm] = React.useState<{
    patientId: string;
    discountPkr: number;
    taxRatePercent: number;
    dueDays: number;
    notes: string;
    items: Array<{
      itemType: InvoiceItemType;
      description: string;
      quantity: number;
      unitPricePkr: number;
      discountPkr: number;
    }>;
  }>({
    patientId: '',
    discountPkr: 0,
    taxRatePercent: 0,
    dueDays: 7,
    notes: '',
    items: [
      {
        itemType: 'CONSULTATION' as InvoiceItemType,
        description: 'General Outpatient Consultation',
        quantity: 1,
        unitPricePkr: 1500,
        discountPkr: 0,
      },
    ],
  });

  const [paymentForm, setPaymentForm] = React.useState<{
    amountPkr: number;
    method: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'RAAST' | 'OTHER';
    bankName: string;
    bankReference: string;
    notes: string;
  }>({
    amountPkr: 0,
    method: 'CASH',
    bankName: '',
    bankReference: '',
    notes: '',
  });

  const [refundForm, setRefundForm] = React.useState({
    amountPkr: 0,
    reason: '',
  });

  const [cancelReason, setCancelReason] = React.useState('');

  const [expenseForm, setExpenseForm] = React.useState({
    categoryId: '',
    description: '',
    amountPkr: 0,
    paymentMethod: 'CASH' as const,
    vendor: '',
    referenceNumber: '',
  });

  const [openCashForm, setOpenCashForm] = React.useState({
    openingBalancePkr: 5000,
  });

  const [closeCashForm, setCloseCashForm] = React.useState({
    actualClosingPkr: 0,
    discrepancyReason: '',
  });

  const [manualReconcileForm, setManualReconcileForm] = React.useState({
    reference: '',
    matchedReference: '',
    notes: '',
  });

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [clisRes, patsRes, statsRes] = await Promise.all([
        ApiClient.clinics.list(),
        ApiClient.patients.list({ limit: 100 }),
        ApiClient.finance.getPaymentMethodsStatus().catch(() => null),
      ]);

      const cliList = (clisRes as any)?.data || (clisRes as any)?.items || (Array.isArray(clisRes) ? clisRes : []);
      setClinics(cliList);

      const defaultClinicId = cliList[0]?.id || '';
      setSelectedClinicId(defaultClinicId);

      const patList = (patsRes as any)?.items || (patsRes as any)?.data || (Array.isArray(patsRes) ? patsRes : []);
      setPatients(patList);
      setGatewayStatus(statsRes);

      // Fetch financial metrics & tables
      const [analyticsRes, invsRes, paysRes, refsRes, expsRes, catsRes, cashRes] = await Promise.all([
        ApiClient.finance.getAnalytics({ clinicId: defaultClinicId || undefined }),
        ApiClient.finance.listInvoices({ clinicId: defaultClinicId || undefined, limit: 50 }),
        ApiClient.finance.listPayments({ clinicId: defaultClinicId || undefined, limit: 50 }),
        ApiClient.finance.listRefunds({ clinicId: defaultClinicId || undefined, limit: 50 }),
        ApiClient.finance.listExpenses({ clinicId: defaultClinicId || undefined, limit: 50 }),
        ApiClient.finance.listExpenseCategories(),
        defaultClinicId ? ApiClient.finance.getActiveCashSession(defaultClinicId).catch(() => null) : Promise.resolve(null),
      ]);

      setAnalytics(analyticsRes);
      setInvoices(invsRes.items || []);
      setPayments(paysRes.items || []);
      setRefunds(refsRes.items || []);
      setExpenses(expsRes.items || []);
      setExpenseCategories(catsRes || []);
      setActiveCashSession(cashRes);

      if (defaultClinicId) {
        const [reconcileRes, sessionsRes] = await Promise.all([
          ApiClient.finance.getReconciliation({ clinicId: defaultClinicId }).catch(() => null),
          ApiClient.finance.listCashSessions({ clinicId: defaultClinicId, limit: 20 }).catch(() => ({ items: [] })),
        ]);
        setReconciliation(reconcileRes);
        setCashSessions(sessionsRes.items || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load financial records');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.patientId || invoiceForm.items.length === 0) {
      setError('Please select a patient and add at least one line item');
      return;
    }

    try {
      setLoading(true);
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + Number(invoiceForm.dueDays || 7));

      await ApiClient.finance.createInvoice({
        clinicId: selectedClinicId,
        patientId: invoiceForm.patientId,
        items: invoiceForm.items.map((it) => ({
          itemType: it.itemType,
          description: it.description,
          quantity: Number(it.quantity),
          unitPriceMinor: Math.round(Number(it.unitPricePkr) * 100),
          discountMinor: Math.round(Number(it.discountPkr) * 100),
          taxMinor: 0,
        })),
        discountMinor: Math.round(Number(invoiceForm.discountPkr) * 100),
        taxRatePercent: Number(invoiceForm.taxRatePercent),
        dueAt: dueAt.toISOString(),
        notes: invoiceForm.notes.trim() || undefined,
        currency: 'PKR',
      });

      showSuccess('Draft invoice created successfully.');
      setIsInvoiceModalOpen(false);
      setInvoiceForm({
        patientId: '',
        discountPkr: 0,
        taxRatePercent: 0,
        dueDays: 7,
        notes: '',
        items: [
          {
            itemType: 'CONSULTATION' as InvoiceItemType,
            description: 'General Outpatient Consultation',
            quantity: 1,
            unitPricePkr: 1500,
            discountPkr: 0,
          },
        ],
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  // Handle Issue Invoice
  const handleIssueInvoice = async (inv: Invoice) => {
    try {
      setLoading(true);
      await ApiClient.finance.issueInvoice(inv.id);
      showSuccess(`Invoice ${inv.invoiceReference} issued. Notification sent to patient.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to issue invoice');
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel Invoice
  const handleCancelInvoice = async () => {
    if (!selectedInvoice || !cancelReason.trim()) {
      setError('Cancellation reason is required');
      return;
    }

    try {
      setLoading(true);
      await ApiClient.finance.cancelInvoice(selectedInvoice.id, {
        cancellationReason: cancelReason.trim(),
      });
      showSuccess(`Invoice ${selectedInvoice.invoiceReference} cancelled.`);
      setIsCancelModalOpen(false);
      setCancelReason('');
      setSelectedInvoice(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel invoice');
    } finally {
      setLoading(false);
    }
  };

  // Handle Collect Payment
  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    if (Number(paymentForm.amountPkr) <= 0) {
      setError('Payment amount must be greater than zero');
      return;
    }

    const maxPkr = selectedInvoice.outstandingMinor / 100;
    if (Number(paymentForm.amountPkr) > maxPkr) {
      setError(`Payment cannot exceed outstanding balance of PKR ${maxPkr.toFixed(2)}`);
      return;
    }

    try {
      setLoading(true);
      const provider =
        paymentForm.method === 'CASH'
          ? 'CASH'
          : paymentForm.method === 'BANK_TRANSFER'
          ? 'MANUAL_BANK'
          : paymentForm.method === 'RAAST'
          ? 'RAAST_SBP'
          : 'PAYMOB';

      const res = await ApiClient.finance.collectPayment({
        clinicId: selectedInvoice.clinicId,
        invoiceId: selectedInvoice.id,
        amountMinor: Math.round(Number(paymentForm.amountPkr) * 100),
        method: paymentForm.method,
        provider,
        bankName: paymentForm.bankName.trim() || undefined,
        bankReference: paymentForm.bankReference.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });

      showSuccess(`Payment of PKR ${Number(paymentForm.amountPkr).toFixed(2)} collected successfully (${res.paymentReference}).`);
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      setPaymentForm({
        amountPkr: 0,
        method: 'CASH',
        bankName: '',
        bankReference: '',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  // Handle Request Refund
  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    if (Number(refundForm.amountPkr) <= 0 || !refundForm.reason.trim()) {
      setError('Valid refund amount and justification reason are required');
      return;
    }

    try {
      setLoading(true);
      await ApiClient.finance.requestRefund({
        paymentId: selectedPayment.id,
        amountMinor: Math.round(Number(refundForm.amountPkr) * 100),
        reason: refundForm.reason.trim(),
      });

      showSuccess('Refund requested and submitted for administrative approval.');
      setIsRefundModalOpen(false);
      setSelectedPayment(null);
      setRefundForm({ amountPkr: 0, reason: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to request refund');
    } finally {
      setLoading(false);
    }
  };

  // Handle Approve / Reject Refund
  const handleReviewRefund = async (refundId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      setLoading(true);
      await ApiClient.finance.reviewRefund(refundId, { action });
      showSuccess(`Refund ${action === 'APPROVE' ? 'approved and processed' : 'rejected'}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || `Failed to ${action.toLowerCase()} refund`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.categoryId || !expenseForm.description.trim() || Number(expenseForm.amountPkr) <= 0) {
      setError('Please fill in all required expense fields');
      return;
    }

    try {
      setLoading(true);
      await ApiClient.finance.createExpense({
        clinicId: selectedClinicId,
        categoryId: expenseForm.categoryId,
        description: expenseForm.description.trim(),
        amountMinor: Math.round(Number(expenseForm.amountPkr) * 100),
        currency: 'PKR',
        paymentMethod: expenseForm.paymentMethod,
        vendor: expenseForm.vendor.trim() || undefined,
        referenceNumber: expenseForm.referenceNumber.trim() || undefined,
        expenseDate: new Date().toISOString().split('T')[0]!,
      });

      showSuccess('Clinic operating expense recorded.');
      setIsExpenseModalOpen(false);
      setExpenseForm({
        categoryId: '',
        description: '',
        amountPkr: 0,
        paymentMethod: 'CASH',
        vendor: '',
        referenceNumber: '',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  // Handle Open Cash Register
  const handleOpenCashSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await ApiClient.finance.openCashSession({
        clinicId: selectedClinicId,
        openingBalanceMinor: Math.round(Number(openCashForm.openingBalancePkr) * 100),
      });

      showSuccess('Cash register drawer shift session opened.');
      setIsOpenCashModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to open cash drawer session');
    } finally {
      setLoading(false);
    }
  };

  // Handle Close Cash Register
  const handleCloseCashSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCashSession) return;

    const expectedPkr = activeCashSession.expectedClosingMinor / 100;
    const countedPkr = Number(closeCashForm.actualClosingPkr);
    const diff = countedPkr - expectedPkr;

    if (diff !== 0 && !closeCashForm.discrepancyReason.trim()) {
      setError('A justification reason is required when counted cash differs from expected balance');
      return;
    }

    try {
      setLoading(true);
      await ApiClient.finance.closeCashSession(activeCashSession.id, {
        actualClosingMinor: Math.round(countedPkr * 100),
        discrepancyReason: closeCashForm.discrepancyReason.trim() || undefined,
      });

      showSuccess('Cash register shift successfully closed and balanced.');
      setIsCloseCashModalOpen(false);
      setCloseCashForm({ actualClosingPkr: 0, discrepancyReason: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to close cash drawer session');
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Reconciliation
  const handleManualReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReconcileForm.reference.trim() || !manualReconcileForm.matchedReference.trim()) {
      setError('Please provide both internal payment reference and bank/gateway matching reference');
      return;
    }

    try {
      setLoading(true);
      await ApiClient.finance.reconcileManually({
        itemType: 'PAYMENT',
        reference: manualReconcileForm.reference.trim(),
        matchedReference: manualReconcileForm.matchedReference.trim(),
        notes: manualReconcileForm.notes.trim() || undefined,
      });

      showSuccess(`Payment ${manualReconcileForm.reference} manually reconciled.`);
      setIsManualReconcileModalOpen(false);
      setManualReconcileForm({ reference: '', matchedReference: '', notes: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reconcile payment');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceReference.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.patient?.fullName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.patient?.patientNumber?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.patient?.phone?.includes(invoiceSearch);
    const matchesStatus = invoiceStatusFilter === 'ALL' || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-clinical-600" />
            Financial Management & Billing
          </h1>
          <p className="text-muted-foreground text-sm">
            Outpatient billing, multi-tender payment collections, cash drawer closing, and revenue analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Clinic Selector */}
          {clinics.length > 1 && (
            <select
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="h-9 px-3 py-1 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 shadow-sm"
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>

          <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-7 px-2">
            Dismiss
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)} className="h-7 px-2">
            Dismiss
          </Button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">Today&apos;s Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              PKR {((analytics?.todayRevenueMinor || 0) / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Invoices generated today</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              PKR {((analytics?.totalCollectedMinor || 0) / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed payments received</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">Outstanding Receivables</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              PKR {((analytics?.outstandingReceivablesMinor || 0) / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {analytics?.pendingInvoicesCount || 0} pending invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">Net Operating Balance</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              PKR {((analytics?.netOperatingBalanceMinor || 0) / 100).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Collected cash minus expenses &amp; refunds
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="refunds" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Refunds
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="cashRegister" className="gap-2">
            <Wallet className="h-4 w-4" />
            Cash Register
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* 1. INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by invoice #, patient, MRN, phone..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label className="text-xs text-slate-500 whitespace-nowrap">Status:</Label>
              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="h-9 px-3 py-1 bg-white border border-slate-200 rounded-md text-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued (Pending)</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No invoices found. Click &quot;New Invoice&quot; to generate an outpatient bill.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {inv.invoiceReference}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{inv.patient?.fullName || 'Walk-in'}</div>
                            {inv.patient?.patientNumber && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {inv.patient.patientNumber}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                inv.status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : inv.status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : inv.status === 'ISSUED'
                                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                                      : inv.status === 'DRAFT'
                                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                                        : 'bg-red-50 text-red-700 border-red-200'
                              }
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            PKR {(inv.totalMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                            PKR {(inv.paidMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            PKR {(inv.outstandingMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {new Date(inv.createdAt).toLocaleDateString('en-PK')}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            {inv.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIssueInvoice(inv)}
                                className="h-7 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                              >
                                Issue
                              </Button>
                            )}

                            {(inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID') && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setPaymentForm((prev) => ({
                                    ...prev,
                                    amountPkr: inv.outstandingMinor / 100,
                                  }));
                                  setIsPaymentModalOpen(true);
                                }}
                                className="h-7 text-xs bg-clinical-600 hover:bg-clinical-700 text-white"
                              >
                                Pay
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                window.open(ApiClient.finance.getPrintableA4Url(inv.id), '_blank');
                              }}
                              title="Print A4 Invoice"
                              className="h-7 w-7 p-0"
                            >
                              <Printer className="h-3.5 w-3.5 text-slate-600" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                window.open(ApiClient.finance.getPdfDownloadUrl(inv.id), '_blank');
                              }}
                              title="Download PDF"
                              className="h-7 w-7 p-0"
                            >
                              <Download className="h-3.5 w-3.5 text-slate-600" />
                            </Button>

                            {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.paidMinor === 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setIsCancelModalOpen(true);
                                }}
                                title="Cancel Invoice"
                                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Payment Collections Ledger</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Authoritative record of multi-tender cash, bank, card, and Raast receipts.</p>
              </div>
              {gatewayStatus && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className={gatewayStatus.raast?.configured ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-amber-50 text-amber-700 border-amber-300"}>
                    Raast P2M: {gatewayStatus.raast?.configured ? 'Active' : 'Unconfigured'}
                  </Badge>
                  <Badge variant="outline" className={gatewayStatus.cardGateway?.configured ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-amber-50 text-amber-700 border-amber-300"}>
                    Card Gateway: {gatewayStatus.cardGateway?.configured ? 'Active' : 'Unconfigured'}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Payment #</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Collector</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No payments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {p.paymentReference}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {p.invoice?.invoiceReference}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {p.invoice?.patient?.fullName || 'Walk-in'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="font-mono text-xs">
                              {p.method}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            PKR {(p.amountMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {p.collectedBy?.fullName || 'Reception Cashier'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {new Date(p.createdAt).toLocaleString('en-PK')}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReceiptHtmlUrl(ApiClient.finance.getReceiptThermalUrl(p.id));
                                setIsReceiptModalOpen(true);
                              }}
                              className="h-7 text-xs gap-1"
                            >
                              <Printer className="h-3 w-3" />
                              Receipt
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPayment(p);
                                setRefundForm({
                                  amountPkr: p.amountMinor / 100,
                                  reason: '',
                                });
                                setIsRefundModalOpen(true);
                              }}
                              className="h-7 text-xs text-amber-600 hover:bg-amber-50"
                            >
                              Refund
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. REFUNDS TAB */}
        <TabsContent value="refunds" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Refund Requests &amp; Approval Queue</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Two-stage separation of duties workflow with administrative review.</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Refund #</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Patient</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {refunds.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No refund requests found.
                        </td>
                      </tr>
                    ) : (
                      refunds.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {r.refundReference}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {r.invoice?.invoiceReference}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {r.invoice?.patient?.fullName || 'Walk-in'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-red-600">
                            PKR {(r.amountMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                            {r.reason}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                r.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : r.status === 'PENDING_APPROVAL'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                              }
                            >
                              {r.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            {r.status === 'PENDING_APPROVAL' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewRefund(r.id, 'APPROVE')}
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewRefund(r.id, 'REJECT')}
                                  className="h-7 text-xs text-red-600 hover:bg-red-50 border-red-200"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900">Clinic Operating Expenses</h2>
              <p className="text-xs text-muted-foreground">Track rent, utilities, staff payroll, medical reagents, and supplies.</p>
            </div>
            <Button
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              New Expense
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Expense #</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Vendor / Payee</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No expenses recorded yet.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {exp.expenseReference}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {exp.category?.name || 'General'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{exp.description}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">{exp.vendor || '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            PKR {(exp.amountMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs font-mono">
                              {exp.paymentMethod}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {new Date(exp.expenseDate).toLocaleDateString('en-PK')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. CASH REGISTER TAB */}
        <TabsContent value="cashRegister" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2 border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 to-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-clinical-600" />
                      Physical Cash Drawer Session
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Daily shift balancing and cash variance reconciliation.</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      activeCashSession?.status === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-sm py-1 px-3'
                        : 'bg-slate-100 text-slate-600 border-slate-300 text-sm py-1 px-3'
                    }
                  >
                    {activeCashSession ? `SESSION ${activeCashSession.status}` : 'DRAWER CLOSED'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeCashSession ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-white border border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase">Session Number</div>
                      <div className="text-base font-mono font-bold text-slate-900 mt-1">
                        {activeCashSession.sessionNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase">Opening Float</div>
                      <div className="text-base font-bold text-slate-900 mt-1">
                        PKR {((activeCashSession.openingBalanceMinor || 0) / 100).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase">Expected in Drawer</div>
                      <div className="text-base font-bold text-emerald-600 mt-1">
                        PKR {((activeCashSession.expectedClosingMinor || 0) / 100).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase">Opened By</div>
                      <div className="text-sm font-medium text-slate-800 mt-1">
                        {activeCashSession.openedBy?.fullName || 'Cashier'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                    No active cash session is currently open for this clinic. Open a session to start collecting cash payments.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  {!activeCashSession ? (
                    <Button
                      onClick={() => setIsOpenCashModalOpen(true)}
                      className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Open Shift Session
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setCloseCashForm({
                          actualClosingPkr: activeCashSession.expectedClosingMinor / 100,
                          discrepancyReason: '',
                        });
                        setIsCloseCashModalOpen(true);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      End Shift &amp; Close Drawer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900">Drawer Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p>• Only physical cash payments and cash refunds affect drawer totals.</p>
                <p>• Count all physical cash prior to entering closing balances.</p>
                <p>• Variances between counted and expected cash require mandatory audit explanations.</p>
                <p>• Closed sessions cannot be modified without authorized administrative audit reopening.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Shift History &amp; Closing Archive</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Session #</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Opening Float</th>
                      <th className="py-3 px-4 text-right">Expected</th>
                      <th className="py-3 px-4 text-right">Actual Counted</th>
                      <th className="py-3 px-4 text-right">Discrepancy</th>
                      <th className="py-3 px-4">Opened At</th>
                      <th className="py-3 px-4">Closed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashSessions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-500">
                          No previous shift sessions found.
                        </td>
                      </tr>
                    ) : (
                      cashSessions.map((cs) => (
                        <tr key={cs.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">{cs.sessionNumber}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs">
                              {cs.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            PKR {(cs.openingBalanceMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            PKR {(cs.expectedClosingMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {typeof cs.actualClosingMinor === 'number' ? `PKR ${(cs.actualClosingMinor / 100).toFixed(2)}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {typeof cs.discrepancyMinor === 'number' ? (
                              <span className={cs.discrepancyMinor === 0 ? 'text-emerald-600' : 'text-red-600'}>
                                PKR {(cs.discrepancyMinor / 100).toFixed(2)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {new Date(cs.openedAt).toLocaleString('en-PK')}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {cs.closedAt ? new Date(cs.closedAt).toLocaleString('en-PK') : 'Active'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. RECONCILIATION TAB */}
        <TabsContent value="reconciliation" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">Audit Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {reconciliation?.totalPaymentsAudited || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total transactions analyzed</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">Matched Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {reconciliation?.matchedCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Verified against bank/drawer</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">Discrepancies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {reconciliation?.discrepancyCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Duplicate or conflicting references</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-slate-500">Reconciliation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {reconciliation?.reconciliationRatePercentage || 100}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Settlement accuracy</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setIsManualReconcileModalOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Authorize Manual Match
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Transaction Reconciliation Audit</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Payment #</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Provider / Bank Reference</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Audit Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconciliation?.items?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          All recorded transactions are reconciled.
                        </td>
                      </tr>
                    ) : (
                      reconciliation?.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">{item.reference}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{item.method}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            PKR {(item.amountMinor / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600">
                            {item.bankReference || item.providerTransactionId || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                item.status === 'MATCHED' || item.status === 'MANUALLY_RECONCILED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.status === 'DISCREPANCY'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                              }
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">{item.notes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900">Revenue by Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics?.revenueByPaymentMethod && Object.keys(analytics.revenueByPaymentMethod).length > 0 ? (
                  Object.entries(analytics.revenueByPaymentMethod).map(([method, amountMinor]) => (
                    <div key={method} className="flex items-center justify-between p-2 rounded bg-slate-50">
                      <span className="font-medium text-slate-700">{method}</span>
                      <span className="font-bold text-slate-900">
                        PKR {((amountMinor as number) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No payment data recorded yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900">Revenue by Service Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics?.revenueByServiceCategory && Object.keys(analytics.revenueByServiceCategory).length > 0 ? (
                  Object.entries(analytics.revenueByServiceCategory).map(([cat, amountMinor]) => (
                    <div key={cat} className="flex items-center justify-between p-2 rounded bg-slate-50">
                      <span className="font-medium text-slate-700">{cat}</span>
                      <span className="font-bold text-slate-900">
                        PKR {((amountMinor as number) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No service category data recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">7-Day Financial Trajectory</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Revenue Invoiced</th>
                      <th className="py-3 px-4 text-right">Collections Received</th>
                      <th className="py-3 px-4 text-right">Expenses Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics?.timeline?.map((day) => (
                      <tr key={day.date} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{day.date}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          PKR {(day.revenueMinor / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          PKR {(day.collectionsMinor / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-red-600">
                          PKR {(day.expensesMinor / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: CREATE INVOICE */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Patient Outpatient Invoice</DialogTitle>
            <DialogDescription>
              Create an itemized medical invoice with consultations, diagnostic tests, or customized procedures.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientSelect">Patient *</Label>
                <select
                  id="patientSelect"
                  value={invoiceForm.patientId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })}
                  className="w-full h-9 px-3 py-1 bg-white border border-slate-200 rounded-md text-sm mt-1"
                  required
                >
                  <option value="">Select registered patient...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientNumber || p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="dueDays">Due In (Days)</Label>
                <Input
                  id="dueDays"
                  type="number"
                  min="0"
                  max="90"
                  value={invoiceForm.dueDays}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDays: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Line Items Builder */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-800">Line Items *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setInvoiceForm({
                      ...invoiceForm,
                      items: [
                        ...invoiceForm.items,
                        {
                          itemType: 'SERVICE' as InvoiceItemType,
                          description: 'Medical Procedure / Service',
                          quantity: 1,
                          unitPricePkr: 1000,
                          discountPkr: 0,
                        },
                      ],
                    })
                  }
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Item
                </Button>
              </div>

              {invoiceForm.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="col-span-3">
                    <Label className="text-xs">Type</Label>
                    <select
                      value={item.itemType}
                      onChange={(e) => {
                        const updated = [...invoiceForm.items];
                        updated[index]!.itemType = e.target.value as InvoiceItemType;
                        setInvoiceForm({ ...invoiceForm, items: updated });
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-xs mt-1"
                    >
                      <option value="CONSULTATION">Consultation</option>
                      <option value="LAB_TEST">Lab Test</option>
                      <option value="PROCEDURE">Procedure</option>
                      <option value="MEDICATION">Medication</option>
                      <option value="SERVICE">Service</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>

                  <div className="col-span-5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...invoiceForm.items];
                        updated[index]!.description = e.target.value;
                        setInvoiceForm({ ...invoiceForm, items: updated });
                      }}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...invoiceForm.items];
                        updated[index]!.quantity = Number(e.target.value);
                        setInvoiceForm({ ...invoiceForm, items: updated });
                      }}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Rate (PKR)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.unitPricePkr}
                      onChange={(e) => {
                        const updated = [...invoiceForm.items];
                        updated[index]!.unitPricePkr = Number(e.target.value);
                        setInvoiceForm({ ...invoiceForm, items: updated });
                      }}
                      className="h-8 text-xs mt-1"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Adjustments */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <Label htmlFor="discountPkr">Overall Discount (PKR)</Label>
                <Input
                  id="discountPkr"
                  type="number"
                  min="0"
                  value={invoiceForm.discountPkr}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, discountPkr: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  value={invoiceForm.taxRatePercent}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, taxRatePercent: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Clinical / Billing Notes</Label>
              <Input
                id="notes"
                placeholder="Optional billing remarks..."
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                className="mt-1"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white" disabled={loading}>
                Generate Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: COLLECT PAYMENT */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment Collection</DialogTitle>
            <DialogDescription>
              Collect full or partial payment against invoice {selectedInvoice?.invoiceReference}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCollectPayment} className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Total:</span>
                <span className="font-medium text-slate-800">PKR {((selectedInvoice?.totalMinor || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Previously Paid:</span>
                <span className="font-medium text-emerald-600">PKR {((selectedInvoice?.paidMinor || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                <span className="text-slate-700">Authoritative Balance Due:</span>
                <span className="text-amber-700">PKR {((selectedInvoice?.outstandingMinor || 0) / 100).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="payAmount">Payment Amount (PKR) *</Label>
              <Input
                id="payAmount"
                type="number"
                min="1"
                max={(selectedInvoice?.outstandingMinor || 0) / 100}
                value={paymentForm.amountPkr}
                onChange={(e) => setPaymentForm({ ...paymentForm, amountPkr: Number(e.target.value) })}
                className="mt-1 font-bold text-lg"
                required
              />
            </div>

            <div>
              <Label htmlFor="payMethod">Payment Method *</Label>
              <select
                id="payMethod"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                className="w-full h-9 px-3 py-1 bg-white border border-slate-200 rounded-md text-sm mt-1"
                required
              >
                <option value="CASH">Cash (Drawer Shift)</option>
                <option value="BANK_TRANSFER">Bank Transfer (IBFT)</option>
                <option value="RAAST">Raast (State Bank of Pakistan)</option>
                <option value="CARD">Credit / Debit Card</option>
              </select>
            </div>

            {paymentForm.method === 'BANK_TRANSFER' && (
              <div className="space-y-3 p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs">
                <div>
                  <Label className="text-xs">Bank Name</Label>
                  <Input
                    placeholder="e.g. Meezan Bank, HBL"
                    value={paymentForm.bankName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                    className="h-8 text-xs mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Slip / Transaction Reference</Label>
                  <Input
                    placeholder="e.g. IBFT-998811"
                    value={paymentForm.bankReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankReference: e.target.value })}
                    className="h-8 text-xs mt-1 bg-white"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white" disabled={loading}>
                Confirm Collection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: REQUEST REFUND */}
      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Payment Refund</DialogTitle>
            <DialogDescription>
              Submit an audited refund request against payment {selectedPayment?.paymentReference}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestRefund} className="space-y-4">
            <div>
              <Label htmlFor="refundAmount">Refund Amount (PKR) *</Label>
              <Input
                id="refundAmount"
                type="number"
                min="1"
                max={(selectedPayment?.amountMinor || 0) / 100}
                value={refundForm.amountPkr}
                onChange={(e) => setRefundForm({ ...refundForm, amountPkr: Number(e.target.value) })}
                className="mt-1 font-bold text-lg"
                required
              />
            </div>

            <div>
              <Label htmlFor="refundReason">Clinical / Administrative Reason *</Label>
              <Input
                id="refundReason"
                placeholder="Detailed reason for patient refund..."
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRefundModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={loading}>
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: CREATE EXPENSE */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Clinic Operating Expense</DialogTitle>
            <DialogDescription>
              Record an operating expense with vendor and category assignment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div>
              <Label htmlFor="expCat">Category *</Label>
              <select
                id="expCat"
                value={expenseForm.categoryId}
                onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                className="w-full h-9 px-3 py-1 bg-white border border-slate-200 rounded-md text-sm mt-1"
                required
              >
                <option value="">Select category...</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="expDesc">Description *</Label>
              <Input
                id="expDesc"
                placeholder="e.g. 5 boxes sterile blood collection tubes"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expAmount">Amount (PKR) *</Label>
                <Input
                  id="expAmount"
                  type="number"
                  min="1"
                  value={expenseForm.amountPkr}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amountPkr: Number(e.target.value) })}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="expMethod">Payment Method</Label>
                <select
                  id="expMethod"
                  value={expenseForm.paymentMethod}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })}
                  className="w-full h-9 px-3 py-1 bg-white border border-slate-200 rounded-md text-sm mt-1"
                >
                  <option value="CASH">Cash (Drawer)</option>
                  <option value="BANK_TRANSFER">Bank Wire</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="expVendor">Vendor / Supplier</Label>
              <Input
                id="expVendor"
                placeholder="e.g. Bio-Rad Laboratories Pakistan"
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                className="mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white" disabled={loading}>
                Record Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: OPEN CASH REGISTER */}
      <Dialog open={isOpenCashModalOpen} onOpenChange={setIsOpenCashModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Open Cash Drawer Shift</DialogTitle>
            <DialogDescription>
              Specify the starting cash float amount in the physical drawer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenCashSession} className="space-y-4">
            <div>
              <Label htmlFor="openFloat">Opening Float Balance (PKR) *</Label>
              <Input
                id="openFloat"
                type="number"
                min="0"
                value={openCashForm.openingBalancePkr}
                onChange={(e) => setOpenCashForm({ openingBalancePkr: Number(e.target.value) })}
                className="mt-1 font-bold text-lg"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpenCashModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white" disabled={loading}>
                Open Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: CLOSE CASH REGISTER */}
      <Dialog open={isCloseCashModalOpen} onOpenChange={setIsCloseCashModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Balance &amp; Close Cash Drawer</DialogTitle>
            <DialogDescription>
              Count physical banknotes and coins in the drawer and enter the actual total.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCloseCashSession} className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-slate-600">Expected System Balance:</span>
                <span className="text-emerald-700">
                  PKR {((activeCashSession?.expectedClosingMinor || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="countedCash">Actual Physical Cash Counted (PKR) *</Label>
              <Input
                id="countedCash"
                type="number"
                min="0"
                value={closeCashForm.actualClosingPkr}
                onChange={(e) => setCloseCashForm({ ...closeCashForm, actualClosingPkr: Number(e.target.value) })}
                className="mt-1 font-bold text-lg"
                required
              />
            </div>

            {Number(closeCashForm.actualClosingPkr) !== (activeCashSession?.expectedClosingMinor || 0) / 100 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-2">
                <div className="font-semibold text-amber-800">
                  Variance Detected: PKR{' '}
                  {(
                    Number(closeCashForm.actualClosingPkr) -
                    (activeCashSession?.expectedClosingMinor || 0) / 100
                  ).toFixed(2)}
                </div>
                <Label htmlFor="varReason" className="text-xs text-amber-900">
                  Mandatory Justification Reason *
                </Label>
                <Input
                  id="varReason"
                  placeholder="Explain cash difference..."
                  value={closeCashForm.discrepancyReason}
                  onChange={(e) =>
                    setCloseCashForm({ ...closeCashForm, discrepancyReason: e.target.value })
                  }
                  className="bg-white"
                  required
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCloseCashModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={loading}>
                Finalize Closing
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: MANUAL RECONCILIATION */}
      <Dialog open={isManualReconcileModalOpen} onOpenChange={setIsManualReconcileModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Authorize Manual Reconciliation</DialogTitle>
            <DialogDescription>
              Link an unverified payment against an official bank deposit slip or gateway trace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManualReconcile} className="space-y-4">
            <div>
              <Label htmlFor="recRef">Internal Payment Reference *</Label>
              <Input
                id="recRef"
                placeholder="e.g. PAY-202611-0001"
                value={manualReconcileForm.reference}
                onChange={(e) => setManualReconcileForm({ ...manualReconcileForm, reference: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="matRef">Bank / Gateway Matching Slip # *</Label>
              <Input
                id="matRef"
                placeholder="e.g. IBFT-554422 or Gateway ID"
                value={manualReconcileForm.matchedReference}
                onChange={(e) => setManualReconcileForm({ ...manualReconcileForm, matchedReference: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="recNotes">Audit Explanation</Label>
              <Input
                id="recNotes"
                placeholder="Auditor notes..."
                value={manualReconcileForm.notes}
                onChange={(e) => setManualReconcileForm({ ...manualReconcileForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsManualReconcileModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white" disabled={loading}>
                Authorize Match
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: CANCEL INVOICE */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Invoice {selectedInvoice?.invoiceReference}</DialogTitle>
            <DialogDescription>
              Cancellation marks this invoice inactive and removes outstanding balance. A mandatory clinical reason is required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="canReason">Reason for Cancellation *</Label>
              <Input
                id="canReason"
                placeholder="e.g. Appointment cancelled by patient prior to consultation"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCancelModalOpen(false)}>
                Go Back
              </Button>
              <Button
                type="button"
                onClick={handleCancelInvoice}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={loading}
              >
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: THERMAL RECEIPT PREVIEW */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Thermal Receipt (80mm)</DialogTitle>
            <DialogDescription>Point-of-sale receipt for POS printer or browser print.</DialogDescription>
          </DialogHeader>

          <div className="border border-slate-200 rounded p-2 bg-white max-h-[60vh] overflow-y-auto">
            <iframe
              src={receiptHtmlUrl}
              title="Receipt"
              className="w-full h-96 border-0"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                const w = window.open(receiptHtmlUrl, '_blank');
                w?.print();
              }}
              className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2 w-full"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
