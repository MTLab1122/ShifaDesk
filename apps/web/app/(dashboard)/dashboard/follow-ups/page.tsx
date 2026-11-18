'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiClient } from '@/lib/api-client';
import { EncounterFollowup, FollowupStatus } from '@matabai/shared';
import {
  Clock,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function FollowupsBoardPage() {
  const [followups, setFollowups] = React.useState<EncounterFollowup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  const loadFollowups = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.encounter.listFollowups({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as any),
        limit: 50,
      });
      setFollowups(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    loadFollowups();
  }, [loadFollowups]);

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    try {
      await ApiClient.encounter.updateFollowup(id, { status: newStatus });
      loadFollowups();
    } catch (err: any) {
      setError(err?.message || 'Failed to update follow-up status');
    }
  };

  const getStatusBadge = (status: FollowupStatus | string) => {
    switch (status) {
      case FollowupStatus.PENDING:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Pending</Badge>;
      case FollowupStatus.SCHEDULED:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Scheduled</Badge>;
      case FollowupStatus.COMPLETED:
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Completed</Badge>;
      case FollowupStatus.CANCELLED:
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-clinical-600" />
            Patient Follow-Up Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Track recommended return dates, monitoring instructions, and appointment scheduling.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadFollowups()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <Card className="border border-slate-200">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs w-fit">
            {['ALL', 'PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-clinical-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Recommended Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Clinical Instructions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-clinical-600" />
                    Loading follow-ups...
                  </TableCell>
                </TableRow>
              ) : followups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No follow-up plans found.
                  </TableCell>
                </TableRow>
              ) : (
                followups.map((f: any) => (
                  <TableRow key={f.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-sm text-slate-900">
                      {f.recommendedDate}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm text-slate-900">{f.patient?.fullName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {f.patient?.patientNumber || f.patientId.substring(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-800">{f.doctor?.fullName}</div>
                      <div className="text-xs text-muted-foreground">{f.clinic?.name}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-xs truncate">
                      {f.instructions}
                    </TableCell>
                    <TableCell>{getStatusBadge(f.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {f.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(f.id, 'COMPLETED')}
                          className="text-xs text-emerald-700 hover:bg-emerald-50"
                        >
                          Mark Completed
                        </Button>
                      )}
                      <Link href={`/dashboard/encounters/${f.encounterId}`}>
                        <Button size="sm" variant="ghost" className="text-xs">
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Encounter
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
