'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MOCK_LAB_REPORTS, MOCK_LAB_TESTS, MockLabReport } from '@/lib/mock-data';
import { FlaskConical, TestTube, FileText, Plus, CheckCircle2, Clock } from 'lucide-react';

export default function LaboratoryDashboardPage() {
  const [reports, setReports] = React.useState<MockLabReport[]>(MOCK_LAB_REPORTS);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    patientName: '',
    testName: MOCK_LAB_TESTS[0]?.name || 'Complete Blood Count',
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName) return;

    const newReport: MockLabReport = {
      id: `rep-${Date.now()}`,
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: formData.patientName,
      testName: formData.testName,
      status: 'Pending',
      requestedDate: new Date().toISOString().split('T')[0] || '2026-11-09',
    };

    setReports([newReport, ...reports]);
    setFormData({ patientName: '', testName: MOCK_LAB_TESTS[0]?.name || 'Complete Blood Count' });
    setIsDialogOpen(false);
  };

  const handleUpdateStatus = (id: string, newStatus: MockLabReport['status']) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const pendingCount = reports.filter(r => r.status === 'Pending').length;
  const inProgressCount = reports.filter(r => r.status === 'Sample Collected').length;
  const readyCount = reports.filter(r => r.status === 'Ready').length;

  return (
    <div className="space-y-6">
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laboratory & Diagnostics</h1>
          <p className="text-muted-foreground text-sm">
            Outpatient pathology test orders, sample tracking, and digital diagnostic reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/laboratory/tests">
            <Button variant="outline" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Test Catalog
            </Button>
          </Link>
          <Link href="/dashboard/laboratory/reports">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              All Reports
            </Button>
          </Link>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
                <Plus className="h-4 w-4" />
                New Lab Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <form onSubmit={handleCreateOrder}>
                <DialogHeader>
                  <DialogTitle>Create Outpatient Lab Order</DialogTitle>
                  <DialogDescription>
                    Select pathology investigation and assign to outpatient.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Patient Full Name</label>
                    <Input
                      placeholder="e.g. Tariq Mehmood"
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Investigation / Test</label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={formData.testName}
                      onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                    >
                      {MOCK_LAB_TESTS.map((test) => (
                        <option key={test.id} value={test.name}>
                          {test.code} - {test.name} ({test.price} PKR)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white">
                    Confirm Order
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting specimen sample draw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Specimen Collected</CardTitle>
            <TestTube className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Under laboratory analysis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Ready</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Approved for doctor review & patient dispatch</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Diagnostic Orders</CardTitle>
          <CardDescription>
            Live status of outpatient laboratory tests requested today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Investigation</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell className="font-mono text-xs font-semibold">{rep.orderNumber}</TableCell>
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
                    {rep.status === 'Pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(rep.id, 'Sample Collected')}
                        className="text-xs h-7"
                      >
                        Collect Sample
                      </Button>
                    )}
                    {rep.status === 'Sample Collected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(rep.id, 'Ready')}
                        className="text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      >
                        Publish Report
                      </Button>
                    )}
                    {rep.status === 'Ready' && (
                      <Button size="sm" variant="ghost" className="text-xs h-7 text-clinical-600">
                        View Results
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
