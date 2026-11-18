'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RotateCw,
} from 'lucide-react';

export default function PlatformAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.platform.getAuditLogs(1, 50);
      setLogs(res.items || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Administrator Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tamper-evident ledger of administrative operations, manual payment approvals, tenant suspensions, and quota overrides.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base text-slate-900">Immutable Audit Logs</CardTitle>
          <CardDescription>All governance mutations executed with actor identification and justifications</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No platform administrative events recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Resource Target</th>
                    <th className="py-3 px-4">Metadata / Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        {log.actor?.fullName || log.actor?.email || log.actorUserId}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-slate-800 text-white font-mono text-[10px]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {log.resourceType}: {log.resourceId}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs max-w-xs truncate font-mono text-[11px]">
                        {JSON.stringify(log.metadata || {})}
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
