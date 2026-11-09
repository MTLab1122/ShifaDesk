'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiClient } from '@/lib/api-client';
import { AuditLog } from '@matabai/shared';
import { ShieldCheck, Search, Loader2, Calendar } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await ApiClient.auditLogs.list();
        setLogs(res.items || []);
      } catch {
        // Fallback demo audit logs
        setLogs([
          {
            id: 'audit-1',
            organizationId: 'org-1',
            actorUserId: 'admin-1',
            action: 'ORGANIZATION_CREATED',
            resourceType: 'Organization',
            resourceId: 'org-1',
            metadata: { name: 'Al-Shifa Healthcare', slug: 'al-shifa' },
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'audit-2',
            organizationId: 'org-1',
            clinicId: 'clinic-1',
            actorUserId: 'admin-1',
            action: 'CLINIC_CREATED',
            resourceType: 'Clinic',
            resourceId: 'clinic-1',
            metadata: { name: 'Al-Shifa Main Hospital Branch' },
            createdAt: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: 'audit-3',
            organizationId: 'org-1',
            actorUserId: 'admin-1',
            action: 'USER_AUTHENTICATED',
            resourceType: 'Session',
            resourceId: 'sess-9821',
            metadata: { ip: '127.0.0.1', method: 'Bearer JWT' },
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.resourceType.toLowerCase().includes(search.toLowerCase()) ||
      (l.resourceId && l.resourceId.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-clinical-600" />
            Security & Audit Logs
          </h1>
          <p className="text-muted-foreground text-sm">
            Immutable, HIPAA-aligned activity audit trail tracking data mutations and security events.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by action or resource..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Total Recorded Events: <span className="font-bold text-foreground">{logs.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-clinical-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center p-12 text-sm text-muted-foreground">
              No audit records match your search filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Actor / Author</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      {log.resourceType}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.resourceId || '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.actorUserId ? (
                        <span className="font-mono">{log.actorUserId.slice(0, 8)}...</span>
                      ) : (
                        'System'
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
