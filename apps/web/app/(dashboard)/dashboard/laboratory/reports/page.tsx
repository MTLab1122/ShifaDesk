'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MOCK_LAB_REPORTS, MockLabReport } from '@/lib/mock-data';
import { ArrowLeft, Search, FileText, Printer, CheckCircle } from 'lucide-react';

export default function LabReportsPage() {
  const [reports] = React.useState<MockLabReport[]>(MOCK_LAB_REPORTS);
  const [search, setSearch] = React.useState('');
  const [selectedReport, setSelectedReport] = React.useState<MockLabReport | null>(null);

  const filteredReports = reports.filter(
    (r) =>
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.testName.toLowerCase().includes(search.toLowerCase()),
  );

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
            <h1 className="text-2xl font-bold tracking-tight">Diagnostic Reports Archive</h1>
            <p className="text-muted-foreground text-sm">
              Search, verify, and print authenticated pathology diagnostic reports.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number, patient name, or investigation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Investigation</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell className="font-mono font-semibold text-xs">{rep.orderNumber}</TableCell>
                  <TableCell className="font-medium">{rep.patientName}</TableCell>
                  <TableCell>{rep.testName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{rep.requestedDate}</TableCell>
                  <TableCell>
                    {rep.status === 'Ready' ? (
                      <Badge variant="clinical" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        Ready
                      </Badge>
                    ) : rep.status === 'Sample Collected' ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        In Analysis
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        Pending Draw
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 gap-1.5"
                      onClick={() => setSelectedReport(rep)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View Report
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Report Preview Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Laboratory Investigation Report</DialogTitle>
                <span className="font-mono text-xs text-muted-foreground">{selectedReport.orderNumber}</span>
              </div>
              <DialogDescription>
                Official electronic pathology test certificate.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 border rounded-md space-y-4 bg-muted/20 text-sm">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b">
                <div>
                  <span className="text-xs text-muted-foreground block">Patient Name:</span>
                  <span className="font-semibold">{selectedReport.patientName}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Date of Request:</span>
                  <span className="font-semibold">{selectedReport.requestedDate}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Investigation:</span>
                  <span className="font-semibold">{selectedReport.testName}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Status:</span>
                  <span className="font-semibold">{selectedReport.status}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Observed Findings (Digital Specimen Run)
                </h4>
                <div className="rounded border bg-white p-3 space-y-2 text-xs">
                  <div className="flex justify-between border-b pb-1">
                    <span>Analyte / Parameter</span>
                    <span className="font-semibold">Value (Ref Range)</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Hemoglobin (Hb)</span>
                    <span className="font-mono text-foreground font-medium">14.2 g/dL (13.0 - 17.0)</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>WBC Count</span>
                    <span className="font-mono text-foreground font-medium">6,800 /uL (4,000 - 11,000)</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platelet Count</span>
                    <span className="font-mono text-foreground font-medium">245,000 /uL (150,000 - 450,000)</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                Verified electronically by MatabAI Pathology Services.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  window.print();
                }}
                className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print Certificate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
