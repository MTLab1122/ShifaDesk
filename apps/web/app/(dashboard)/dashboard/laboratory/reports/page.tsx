'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiClient } from '@/lib/api-client';
import { LaboratoryReport } from '@matabai/shared';
import {
  ArrowLeft,
  Search,
  Download,
  Share2,
  Send,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Ban,
} from 'lucide-react';

export default function LabReportsPage() {
  const [reports, setReports] = React.useState<LaboratoryReport[]>([]);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Modals
  const [tokenModalData, setTokenModalData] = React.useState<{
    url: string;
    prefix: string;
    expiresAt: string;
  } | null>(null);

  const [revokeModalReport, setRevokeModalReport] = React.useState<LaboratoryReport | null>(null);
  const [revocationReason, setRevocationReason] = React.useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.laboratory.listReports({
        reportStatus: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
        limit: 50,
      });
      setReports(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load diagnostic reports archive');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleRelease = async (reportId: string) => {
    try {
      setLoading(true);
      await ApiClient.laboratory.releaseReport(reportId, {
        sendNotification: true,
      });
      showSuccess('Diagnostic report released and patient WhatsApp delivery triggered.');
      await fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to release report');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async (reportId: string) => {
    try {
      setLoading(true);
      const res = await ApiClient.laboratory.createAccessToken(reportId, 168);
      setTokenModalData({
        url: res.accessUrl,
        prefix: res.prefix,
        expiresAt: new Date(res.expiresAt).toLocaleString(),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate delivery link');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeModalReport || !revocationReason.trim()) return;

    try {
      setLoading(true);
      await ApiClient.laboratory.revokeAccess(revokeModalReport.id, {
        revocationReason: revocationReason.trim(),
      });
      showSuccess('All active public delivery tokens for this report have been revoked.');
      setRevokeModalReport(null);
      setRevocationReason('');
      await fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke token');
    } finally {
      setLoading(false);
    }
  };

  const handleResendNotification = async (reportId: string) => {
    try {
      setLoading(true);
      await ApiClient.laboratory.resendNotification(reportId);
      showSuccess('Delivery notification re-enqueued successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to re-enqueue notification');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RELEASED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Released to Patient</Badge>;
      case 'APPROVED':
        return <Badge className="bg-teal-100 text-teal-800 border-teal-300">Pathologist Approved</Badge>;
      case 'PENDING_REVIEW':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Pending Review</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/laboratory">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Diagnostic Reports Archive</h1>
            <p className="text-muted-foreground text-sm">
              Search, verify, download, and manage patient delivery tokens for authenticated PDF pathology reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

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

      {/* Filter and Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by report #, order #, or patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
                className="pl-9 h-10"
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm sm:w-48"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved Only</option>
              <option value="RELEASED">Released Only</option>
              <option value="PENDING_REVIEW">Pending Review</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading diagnostic reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No diagnostic reports found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Reference</TableHead>
                  <TableHead>Order Ref</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Approval / Release</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-semibold text-slate-900">
                      {report.reportReference}
                      <div className="text-[11px] text-muted-foreground font-normal">
                        {Math.round(report.fileSizeBytes / 1024)} KB • PDF
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {report.order?.orderReference}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">{report.order?.patient?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{report.order?.patient?.phone}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        v{report.version}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {report.approvedBy && <div>Approved by {report.approvedBy.fullName}</div>}
                      {report.releasedBy && <div>Released by {report.releasedBy.fullName}</div>}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.reportStatus)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Download link */}
                        <a
                          href={ApiClient.laboratory.getDownloadUrl(report.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-700" title="Download Signed PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>

                        {/* Release button if APPROVED */}
                        {report.reportStatus === 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={() => handleRelease(report.id)}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Release
                          </Button>
                        )}

                        {/* Get Delivery Link */}
                        {(report.reportStatus === 'RELEASED' || report.reportStatus === 'APPROVED') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleGenerateToken(report.id)}
                            className="h-8 w-8 text-clinical-600"
                            title="Generate Secure Patient Link"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Resend WhatsApp */}
                        {report.reportStatus === 'RELEASED' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleResendNotification(report.id)}
                            className="h-8 w-8 text-teal-600"
                            title="Resend WhatsApp Delivery Notification"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Revoke active link */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setRevokeModalReport(report)}
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          title="Revoke Public Delivery Link"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL: TOKEN SHARE */}
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
              <p>• Verification: Patient must verify their registered phone number or birth year to view the PDF.</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setTokenModalData(null)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: REVOKE ACCESS */}
      <Dialog open={!!revokeModalReport} onOpenChange={(open) => !open && setRevokeModalReport(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleRevoke}>
            <DialogHeader>
              <DialogTitle className="text-red-600">Revoke Report Access Links</DialogTitle>
              <DialogDescription>
                Immediately invalidate all active public access links for report {revokeModalReport?.reportReference}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <label className="text-sm font-medium">Revocation Justification *</label>
              <Input
                placeholder="e.g. Corrected results issued, privacy concern..."
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRevokeModalReport(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} variant="destructive">
                Confirm Revocation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
