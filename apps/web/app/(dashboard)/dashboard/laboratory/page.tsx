'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClient } from '@/lib/api-client';
import {
  LaboratoryOrder,
  LaboratorySample,
  LaboratoryTest,
  LaboratoryPackage,
  LaboratoryAnalytics,
  Patient,
  Doctor,
  ReviewDecision,
} from '@matabai/shared';
import {
  FlaskConical,
  TestTube,
  FileText,
  Plus,
  CheckCircle2,
  RefreshCw,
  Search,
  AlertCircle,
  Share2,
  Download,
  Copy,
  BarChart3,
  Send,
} from 'lucide-react';

export default function LaboratoryDashboardPage() {
  const [activeTab, setActiveTab] = React.useState('orders');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Data states
  const [orders, setOrders] = React.useState<LaboratoryOrder[]>([]);
  const [samples, setSamples] = React.useState<LaboratorySample[]>([]);
  const [tests, setTests] = React.useState<LaboratoryTest[]>([]);
  const [packages, setPackages] = React.useState<LaboratoryPackage[]>([]);
  const [analytics, setAnalytics] = React.useState<LaboratoryAnalytics | null>(null);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);

  // Filters
  const [orderSearch, setOrderSearch] = React.useState('');
  const [sampleSearch, setSampleSearch] = React.useState('');

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = React.useState(false);
  const [selectedPatientId, setSelectedPatientId] = React.useState('');
  const [selectedDoctorId, setSelectedDoctorId] = React.useState('');
  const [selectedTestIds, setSelectedTestIds] = React.useState<string[]>([]);
  const [selectedPackageIds, setSelectedPackageIds] = React.useState<string[]>([]);
  const [orderNotes, setOrderNotes] = React.useState('');

  // Result entry modal
  const [resultModalItem, setResultModalItem] = React.useState<any | null>(null);
  const [resultValue, setResultValue] = React.useState('');
  const [resultUnit, setResultUnit] = React.useState('');
  const [resultRefRange, setResultRefRange] = React.useState('');
  const [resultNotes, setResultNotes] = React.useState('');

  // Sample status modal
  const [sampleStatusItem, setSampleStatusItem] = React.useState<LaboratorySample | null>(null);
  const [targetSampleStatus, setTargetSampleStatus] = React.useState<string>('COLLECTED');
  const [rejectionReason, setRejectionReason] = React.useState('');

  // Result review modal
  const [reviewResultItem, setReviewResultItem] = React.useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = React.useState<ReviewDecision>(ReviewDecision.APPROVED);
  const [reviewComments, setReviewComments] = React.useState('');

  // Delivery token modal
  const [tokenModalData, setTokenModalData] = React.useState<{ url: string; prefix: string; expiresAt: string } | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordRes, smpRes, testRes, pkgRes, anaRes, patRes, docRes] = await Promise.all([
        ApiClient.laboratory.listOrders({ limit: 50 }).catch(() => ({ items: [] })),
        ApiClient.laboratory.listSamples({ limit: 50 }).catch(() => ({ items: [] })),
        ApiClient.laboratory.listTests({ limit: 100 }).catch(() => ({ items: [] })),
        ApiClient.laboratory.listPackages({ limit: 50 }).catch(() => ({ items: [] })),
        ApiClient.laboratory.getAnalytics().catch(() => null),
        ApiClient.patients.list({ limit: 100 }).catch(() => ({ items: [] } as any)),
        ApiClient.doctors.list({ limit: 50 }).catch(() => ({ items: [] } as any)),
      ]);

      setOrders(ordRes.items || []);
      setSamples(smpRes.items || []);
      setTests(testRes.items || []);
      setPackages(pkgRes.items || []);
      setAnalytics(anaRes);
      setPatients(patRes.items || []);
      setDoctors(docRes.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load laboratory dashboard');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  // Flash message helper
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Order creation
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || (selectedTestIds.length === 0 && selectedPackageIds.length === 0)) {
      setError('Please select a patient and at least one diagnostic test or package');
      return;
    }

    try {
      setLoading(true);
      const clinicId = patients.find((p) => p.id === selectedPatientId)?.clinicId || doctors[0]?.clinicId || '';
      await ApiClient.laboratory.createOrder({
        clinicId,
        patientId: selectedPatientId,
        orderingDoctorId: selectedDoctorId || undefined,
        testIds: selectedTestIds,
        packageIds: selectedPackageIds,
        notes: orderNotes || undefined,
      });

      showSuccess('Diagnostic order created successfully with immutable snapshots and initial specimen requests.');
      setIsOrderModalOpen(false);
      setSelectedPatientId('');
      setSelectedDoctorId('');
      setSelectedTestIds([]);
      setSelectedPackageIds([]);
      setOrderNotes('');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to create diagnostic order');
    } finally {
      setLoading(false);
    }
  };

  // Calculate order modal total
  const calculatedTotal = React.useMemo(() => {
    let sum = 0;
    for (const tid of selectedTestIds) {
      const t = tests.find((x) => x.id === tid);
      if (t) sum += t.price;
    }
    for (const pid of selectedPackageIds) {
      const p = packages.find((x) => x.id === pid);
      if (p) sum += p.price;
    }
    return sum;
  }, [selectedTestIds, selectedPackageIds, tests, packages]);

  // Sample status update
  const handleUpdateSampleStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleStatusItem) return;

    if (
      (targetSampleStatus === 'REJECTED' || targetSampleStatus === 'RECOLLECTION_REQUIRED') &&
      !rejectionReason.trim()
    ) {
      setError('Rejection reason is mandatory when rejecting a specimen');
      return;
    }

    try {
      setLoading(true);
      await ApiClient.laboratory.updateSampleStatus(sampleStatusItem.id, {
        sampleStatus: targetSampleStatus as any,
        rejectionReason: rejectionReason.trim() || undefined,
      });

      showSuccess(`Specimen status updated to ${targetSampleStatus}.`);
      setSampleStatusItem(null);
      setRejectionReason('');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to update specimen status');
    } finally {
      setLoading(false);
    }
  };

  // Result entry
  const handleEnterResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultModalItem || !resultValue.trim()) return;

    try {
      setLoading(true);
      await ApiClient.laboratory.enterResult(resultModalItem.id, {
        resultValue: resultValue.trim(),
        resultType: 'NUMERIC',
        unit: resultUnit.trim() || undefined,
        referenceRange: resultRefRange.trim() || undefined,
        resultNotes: resultNotes.trim() || undefined,
      });

      showSuccess('Test result recorded successfully.');
      setResultModalItem(null);
      setResultValue('');
      setResultUnit('');
      setResultRefRange('');
      setResultNotes('');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to record test result');
    } finally {
      setLoading(false);
    }
  };

  // Review result
  const handleReviewResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewResultItem) return;

    try {
      setLoading(true);
      await ApiClient.laboratory.reviewResult(reviewResultItem.result.id, {
        decision: reviewDecision,
        comments: reviewComments.trim() || undefined,
      });

      showSuccess(`Result review decision recorded: ${reviewDecision}`);
      setReviewResultItem(null);
      setReviewComments('');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  // Generate Report
  const handleGenerateReport = async (orderId: string) => {
    try {
      setLoading(true);
      await ApiClient.laboratory.generateReport(orderId);
      showSuccess('Diagnostic report generated and approved. Ready for release.');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate diagnostic report');
    } finally {
      setLoading(false);
    }
  };

  // Release Report
  const handleReleaseReport = async (reportId: string) => {
    try {
      setLoading(true);
      await ApiClient.laboratory.releaseReport(reportId, {
        sendNotification: true,
      });
      showSuccess('Report released and patient notification enqueued via WhatsApp.');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to release diagnostic report');
    } finally {
      setLoading(false);
    }
  };

  // Create Delivery Token
  const handleCreateToken = async (reportId: string) => {
    try {
      setLoading(true);
      const tokenRes = await ApiClient.laboratory.createAccessToken(reportId, 168);
      setTokenModalData({
        url: tokenRes.accessUrl,
        prefix: tokenRes.prefix,
        expiresAt: new Date(tokenRes.expiresAt).toLocaleString(),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate delivery link');
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
      case 'REPORT_READY':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Report Ready</Badge>;
      case 'APPROVED':
        return <Badge className="bg-teal-100 text-teal-800 border-teal-300">Results Approved</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Under Pathologist Review</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Processing</Badge>;
      case 'SAMPLE_COLLECTED':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Sample Drawn</Badge>;
      case 'REGISTERED':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">Registered</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSampleStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'COMPLETED':
        return <Badge className="bg-emerald-100 text-emerald-800">Accepted</Badge>;
      case 'RECEIVED':
      case 'PROCESSING':
        return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
      case 'COLLECTED':
        return <Badge className="bg-amber-100 text-amber-800">Collected</Badge>;
      case 'PENDING':
        return <Badge className="bg-slate-100 text-slate-800">Pending Draw</Badge>;
      case 'REJECTED':
      case 'RECOLLECTION_REQUIRED':
        return <Badge variant="destructive">{status.replace('_', ' ')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Laboratory & Diagnostics</h1>
          <p className="text-muted-foreground text-sm">
            Outpatient pathology test orders, specimen tracking, two-stage result review, and secure patient report delivery.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/laboratory/tests">
            <Button variant="outline" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Test Catalog
            </Button>
          </Link>
          <Link href="/dashboard/laboratory/reports">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Reports Archive
            </Button>
          </Link>

          <Button
            onClick={() => setIsOrderModalOpen(true)}
            className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            New Lab Order
          </Button>

          <Button variant="ghost" size="icon" onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Alerts */}
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

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Orders Today</CardDescription>
            <CardTitle className="text-2xl font-bold">{analytics?.ordersToday ?? orders.length}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-[11px] text-muted-foreground">
            Total: {analytics?.totalOrders ?? orders.length}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Pending Specimen</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {analytics?.pendingSamples ?? samples.filter((s) => s.sampleStatus === 'PENDING').length}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-[11px] text-muted-foreground">
            Awaiting phlebotomy
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">In Processing</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {analytics?.processingSamples ?? samples.filter((s) => s.sampleStatus === 'PROCESSING').length}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-[11px] text-muted-foreground">
            Under analysis
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Awaiting Review</CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-600">
              {analytics?.resultsAwaitingReview ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-[11px] text-muted-foreground">
            Pathologist queue
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Reports Approved</CardDescription>
            <CardTitle className="text-2xl font-bold text-teal-600">
              {analytics?.reportsApproved ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-[11px] text-muted-foreground">
            Ready for release
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Delivered</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {analytics?.reportsDelivered ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-[11px] text-muted-foreground">
            Patient notified
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="orders" className="gap-2">
            <FileText className="h-4 w-4" />
            Outpatient Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="samples" className="gap-2">
            <TestTube className="h-4 w-4" />
            Specimens ({samples.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            Results & Reviews
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ORDERS */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Laboratory Orders Ledger</CardTitle>
                  <CardDescription>
                    All diagnostic orders registered with immutable snapshot prices.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order # or patient..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No laboratory orders registered yet. Click &quot;New Lab Order&quot; to begin.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Reference</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Tests Included</TableHead>
                      <TableHead>Total (PKR)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders
                      .filter(
                        (o) =>
                          o.orderReference.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.patient?.fullName.toLowerCase().includes(orderSearch.toLowerCase()),
                      )
                      .map((order) => {
                        const hasApprovedResults =
                          order.items?.length &&
                          order.items.every(
                            (it) => it.result && it.result.resultStatus === 'APPROVED',
                          );
                        const latestReport = order.reports?.[0];

                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-semibold text-slate-900">
                              {order.orderReference}
                              <div className="text-[11px] text-muted-foreground font-normal">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-800">{order.patient?.fullName}</div>
                              <div className="text-xs text-muted-foreground">
                                {order.patient?.phone} • MRN: {order.patient?.patientNumber}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {order.orderingDoctor ? `Dr. ${order.orderingDoctor.fullName}` : 'Self / Outpatient'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {order.items?.map((it) => (
                                  <Badge key={it.id} variant="secondary" className="text-[10px]">
                                    {it.testCodeSnapshot}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              Rs. {order.totalAmount.toLocaleString()}
                            </TableCell>
                            <TableCell>{getOrderStatusBadge(order.orderStatus)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {hasApprovedResults && !latestReport && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleGenerateReport(order.id)}
                                    className="h-8 gap-1 text-xs text-clinical-600 border-clinical-200 hover:bg-clinical-50"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Generate Report
                                  </Button>
                                )}

                                {latestReport && latestReport.reportStatus === 'APPROVED' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleReleaseReport(latestReport.id)}
                                    className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    Release & Notify
                                  </Button>
                                )}

                                {latestReport && (
                                  <>
                                    <a
                                      href={ApiClient.laboratory.getDownloadUrl(latestReport.id)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </a>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleCreateToken(latestReport.id)}
                                      className="h-8 w-8 text-clinical-600"
                                      title="Get Secure Delivery Link"
                                    >
                                      <Share2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SAMPLES / SPECIMENS */}
        <TabsContent value="samples" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Specimen Tracking Ledger</CardTitle>
                  <CardDescription>
                    Physical pathology samples from collection to analysis.
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by sample # or patient..."
                    value={sampleSearch}
                    onChange={(e) => setSampleSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {samples.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No specimen records found. Samples are auto-created when orders are registered.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sample Reference</TableHead>
                      <TableHead>Order Ref</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Specimen Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {samples
                      .filter(
                        (s) =>
                          s.sampleReference.toLowerCase().includes(sampleSearch.toLowerCase()) ||
                          s.order?.patient?.fullName.toLowerCase().includes(sampleSearch.toLowerCase()),
                      )
                      .map((sample) => (
                        <TableRow key={sample.id}>
                          <TableCell className="font-semibold text-slate-900">
                            {sample.sampleReference}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sample.order?.orderReference}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {sample.order?.patient?.fullName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {sample.sampleType}
                            </Badge>
                          </TableCell>
                          <TableCell>{getSampleStatusBadge(sample.sampleStatus)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sample.collectedBy && <div>Drawn by {sample.collectedBy.fullName}</div>}
                            {sample.receivedBy && <div>Received by {sample.receivedBy.fullName}</div>}
                            {sample.rejectionReason && (
                              <div className="text-red-600 font-medium">{sample.rejectionReason}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {sample.sampleStatus === 'PENDING' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSampleStatusItem(sample);
                                    setTargetSampleStatus('COLLECTED');
                                  }}
                                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  Mark Collected
                                </Button>
                              )}
                              {sample.sampleStatus === 'COLLECTED' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSampleStatusItem(sample);
                                    setTargetSampleStatus('RECEIVED');
                                  }}
                                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  Receive in Lab
                                </Button>
                              )}
                              {sample.sampleStatus === 'RECEIVED' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSampleStatusItem(sample);
                                    setTargetSampleStatus('ACCEPTED');
                                  }}
                                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Accept for Testing
                                </Button>
                              )}
                              {sample.sampleStatus !== 'REJECTED' && sample.sampleStatus !== 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSampleStatusItem(sample);
                                    setTargetSampleStatus('REJECTED');
                                  }}
                                  className="h-8 text-xs text-red-600 hover:bg-red-50"
                                >
                                  Reject
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: RESULTS & REVIEWS */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Two-Stage Result Recording & Review</CardTitle>
              <CardDescription>
                Technician result entry with reference ranges, amendment audit ledger, and independent pathologist review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No orders on record.</div>
              ) : (
                <div className="space-y-6">
                  {orders.map((ord) => (
                    <div key={ord.id} className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-bold text-slate-900">{ord.orderReference}</span> •{' '}
                          <span className="text-slate-700 font-medium">{ord.patient?.fullName}</span>
                          <span className="text-xs text-muted-foreground ml-2">({ord.items?.length || 0} tests)</span>
                        </div>
                        <div>{getOrderStatusBadge(ord.orderStatus)}</div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Investigation / Test</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Recorded Value</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Reference Range</TableHead>
                            <TableHead>Review Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ord.items?.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium text-slate-800">{item.testNameSnapshot}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.testCodeSnapshot}</TableCell>
                              <TableCell className="font-mono font-semibold">
                                {item.result ? item.result.resultValue : <span className="text-slate-400 font-normal">Pending</span>}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">{item.result?.unit || '-'}</TableCell>
                              <TableCell className="text-xs text-slate-600">{item.result?.referenceRange || '-'}</TableCell>
                              <TableCell>
                                {item.result ? (
                                  item.result.resultStatus === 'APPROVED' ? (
                                    <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>
                                  ) : item.result.resultStatus === 'AMENDED' ? (
                                    <Badge className="bg-purple-100 text-purple-800">Amended</Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-800">Awaiting Review</Badge>
                                  )
                                ) : (
                                  <Badge variant="outline">Not Entered</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {!item.result ? (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setResultModalItem(item);
                                        setResultValue('');
                                        setResultUnit('');
                                        setResultRefRange('');
                                      }}
                                      className="h-8 text-xs bg-clinical-600 hover:bg-clinical-700 text-white"
                                    >
                                      Enter Result
                                    </Button>
                                  ) : item.result.resultStatus !== 'APPROVED' ? (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setReviewResultItem(item);
                                        setReviewDecision(ReviewDecision.APPROVED);
                                        setReviewComments('');
                                      }}
                                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                      Review / Approve
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-emerald-600 font-medium">Validated</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ANALYTICS */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Status Distribution</CardTitle>
                <CardDescription>Breakdown across current active orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics?.ordersByStatus || {}).map(([st, cnt]) => (
                    <div key={st} className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
                      <span className="text-slate-700">{st}</span>
                      <Badge variant="secondary">{cnt}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">7-Day Test Volume Trend</CardTitle>
                <CardDescription>Daily registered and completed investigations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.volumeByDay?.map((vol) => (
                    <div key={vol.date} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span className="font-medium">{vol.date}</span>
                        <span>
                          {vol.orders} orders • {vol.completed} completed
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="bg-clinical-600 h-full"
                          style={{
                            width: `${Math.min(100, (vol.orders / Math.max(1, vol.orders)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: NEW LAB ORDER */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateOrder}>
            <DialogHeader>
              <DialogTitle>Register Diagnostic Lab Order</DialogTitle>
              <DialogDescription>
                Assign outpatient pathology investigations with immutable price snapshots.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Registered Patient *</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.phone} • MRN: {p.patientNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ordering Doctor (Optional)</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                >
                  <option value="">-- Self / Outpatient Walk-in --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.fullName} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Diagnostic Tests</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1">
                  {tests.map((t) => (
                    <label key={t.id} className="flex items-center justify-between text-xs p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTestIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTestIds([...selectedTestIds, t.id]);
                            else setSelectedTestIds(selectedTestIds.filter((id) => id !== t.id));
                          }}
                        />
                        <span className="font-medium text-slate-800">{t.testName}</span>
                        <Badge variant="outline" className="text-[10px]">{t.testCode}</Badge>
                      </div>
                      <span className="font-semibold text-slate-700">Rs. {t.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              {packages.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Diagnostic Packages / Panels</label>
                  <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1">
                    {packages.map((pkg) => (
                      <label key={pkg.id} className="flex items-center justify-between text-xs p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedPackageIds.includes(pkg.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPackageIds([...selectedPackageIds, pkg.id]);
                              else setSelectedPackageIds(selectedPackageIds.filter((id) => id !== pkg.id));
                            }}
                          />
                          <span className="font-medium text-slate-800">{pkg.name}</span>
                        </div>
                        <span className="font-semibold text-clinical-600">Rs. {pkg.price}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Calculated Total Amount:</span>
                <span className="text-lg font-bold text-clinical-700">Rs. {calculatedTotal.toLocaleString()} PKR</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Clinical Notes (Optional)</label>
                <Input
                  placeholder="e.g. Fasting sample requested, diabetic checkup"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOrderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-clinical-600 hover:bg-clinical-700 text-white">
                {loading ? 'Registering...' : 'Confirm Lab Order'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ENTER RESULT */}
      <Dialog open={!!resultModalItem} onOpenChange={(open) => !open && setResultModalItem(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleEnterResult}>
            <DialogHeader>
              <DialogTitle>Record Diagnostic Result</DialogTitle>
              <DialogDescription>
                {resultModalItem?.testNameSnapshot} ({resultModalItem?.testCodeSnapshot})
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Result Value *</label>
                <Input
                  placeholder="e.g. 14.2 or Negative"
                  value={resultValue}
                  onChange={(e) => setResultValue(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit</label>
                  <Input
                    placeholder="e.g. g/dL, mg/dL"
                    value={resultUnit}
                    onChange={(e) => setResultUnit(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference Range</label>
                  <Input
                    placeholder="e.g. 13.5 - 17.5"
                    value={resultRefRange}
                    onChange={(e) => setResultRefRange(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Technician Notes</label>
                <Input
                  placeholder="Observation notes..."
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResultModalItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-clinical-600 hover:bg-clinical-700 text-white">
                Save Result
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: REVIEW / APPROVE RESULT */}
      <Dialog open={!!reviewResultItem} onOpenChange={(open) => !open && setReviewResultItem(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleReviewResult}>
            <DialogHeader>
              <DialogTitle>Pathologist Result Evaluation</DialogTitle>
              <DialogDescription>
                {reviewResultItem?.testNameSnapshot}: Recorded Value &quot;{reviewResultItem?.result?.resultValue}&quot;
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Review Decision *</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value as ReviewDecision)}
                >
                  <option value={ReviewDecision.APPROVED}>Approved (Clinically Validated)</option>
                  <option value={ReviewDecision.AMENDMENT_REQUESTED}>Amendment Requested</option>
                  <option value={ReviewDecision.REJECTED}>Rejected (Retest Required)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pathologist Comments</label>
                <Input
                  placeholder="Clinical validation notes..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReviewResultItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Submit Decision
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: SPECIMEN STATUS */}
      <Dialog open={!!sampleStatusItem} onOpenChange={(open) => !open && setSampleStatusItem(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleUpdateSampleStatus}>
            <DialogHeader>
              <DialogTitle>Update Specimen Tracking</DialogTitle>
              <DialogDescription>
                {sampleStatusItem?.sampleReference} • {sampleStatusItem?.sampleType}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Status</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={targetSampleStatus}
                  onChange={(e) => setTargetSampleStatus(e.target.value)}
                >
                  <option value="COLLECTED">COLLECTED (Sample Drawn)</option>
                  <option value="RECEIVED">RECEIVED (In Laboratory)</option>
                  <option value="ACCEPTED">ACCEPTED (Validated for Processing)</option>
                  <option value="REJECTED">REJECTED (Hemolyzed / Clotted / Insufficient)</option>
                  <option value="RECOLLECTION_REQUIRED">RECOLLECTION REQUIRED</option>
                </select>
              </div>

              {(targetSampleStatus === 'REJECTED' || targetSampleStatus === 'RECOLLECTION_REQUIRED') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-red-600">Rejection Reason *</label>
                  <Input
                    placeholder="Specify why specimen was rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSampleStatusItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-clinical-600 hover:bg-clinical-700 text-white">
                Update Status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: DELIVERY TOKEN SHARE */}
      <Dialog open={!!tokenModalData} onOpenChange={(open) => !open && setTokenModalData(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Secure Patient Delivery Link</DialogTitle>
            <DialogDescription>
              High-entropy 256-bit unguessable link generated for patient verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-xs font-semibold text-slate-700">Patient Access URL:</label>
              <div className="flex items-center gap-2">
                <Input value={tokenModalData?.url || ''} readOnly className="font-mono text-xs bg-white" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (tokenModalData?.url) {
                      navigator.clipboard.writeText(tokenModalData.url);
                      showSuccess('Access link copied to clipboard!');
                    }
                  }}
                  className="gap-1 shrink-0"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Token Prefix: <span className="font-mono font-semibold">{tokenModalData?.prefix}</span></p>
              <p>• Expires At: {tokenModalData?.expiresAt}</p>
              <p>• Verification: Patient must confirm their registered phone number or birth year to download the PDF.</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setTokenModalData(null)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
