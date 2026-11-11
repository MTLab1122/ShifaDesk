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
import { LaboratoryTest, LaboratoryTestCategory } from '@matabai/shared';
import { ArrowLeft, Plus, Search, RefreshCw, AlertCircle, CheckCircle2, Tag } from 'lucide-react';

export default function LabTestsCatalogPage() {
  const [tests, setTests] = React.useState<LaboratoryTest[]>([]);
  const [categories, setCategories] = React.useState<LaboratoryTestCategory[]>([]);
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('ALL');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Modals
  const [isTestModalOpen, setIsTestModalOpen] = React.useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);

  // Test form state
  const [testForm, setTestForm] = React.useState({
    categoryId: '',
    testCode: '',
    testName: '',
    sampleType: 'Blood',
    turnaroundMinutes: 240,
    price: 1000,
    unit: '',
    referenceRange: '',
    resultType: 'NUMERIC',
    description: '',
  });

  // Category form state
  const [categoryForm, setCategoryForm] = React.useState({
    name: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [testRes, catRes] = await Promise.all([
        ApiClient.laboratory.listTests({ limit: 100 }).catch(() => ({ items: [] })),
        ApiClient.laboratory.listCategories().catch(() => []),
      ]);
      setTests(testRes.items || []);
      setCategories(catRes || []);
      if (catRes && catRes.length > 0 && !testForm.categoryId) {
        setTestForm((prev) => ({ ...prev, categoryId: catRes[0]?.id || '' }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load test catalog');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    try {
      setLoading(true);
      const created = await ApiClient.laboratory.createCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
      });

      showSuccess(`Category "${created.name}" created successfully.`);
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', description: '' });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.testCode.trim() || !testForm.testName.trim() || !testForm.categoryId) {
      setError('Please fill in required fields (Category, Code, Name)');
      return;
    }

    try {
      setLoading(true);
      await ApiClient.laboratory.createTest({
        categoryId: testForm.categoryId,
        testCode: testForm.testCode.trim().toUpperCase(),
        testName: testForm.testName.trim(),
        sampleType: testForm.sampleType,
        turnaroundMinutes: Number(testForm.turnaroundMinutes),
        price: Number(testForm.price),
        currency: 'PKR',
        unit: testForm.unit.trim() || undefined,
        referenceRange: testForm.referenceRange.trim() || undefined,
        resultType: testForm.resultType as any,
        description: testForm.description.trim() || undefined,
      });

      showSuccess(`Diagnostic test ${testForm.testCode.toUpperCase()} added to catalog.`);
      setIsTestModalOpen(false);
      setTestForm({
        categoryId: categories[0]?.id || '',
        testCode: '',
        testName: '',
        sampleType: 'Blood',
        turnaroundMinutes: 240,
        price: 1000,
        unit: '',
        referenceRange: '',
        resultType: 'NUMERIC',
        description: '',
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      t.testName.toLowerCase().includes(search.toLowerCase()) ||
      t.testCode.toLowerCase().includes(search.toLowerCase()) ||
      t.sampleType.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || t.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Diagnostic Tests Catalog</h1>
            <p className="text-muted-foreground text-sm">
              Standardized outpatient pathology investigation directory with sample instructions, turnaround times, and prices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)} className="gap-2">
            <Tag className="h-4 w-4" />
            New Category
          </Button>

          <Button
            onClick={() => setIsTestModalOpen(true)}
            className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            New Test
          </Button>

          <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
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

      {/* Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tests by code, name, specimen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm sm:w-48"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading diagnostic tests...
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No diagnostic tests found matching your search. Click &quot;New Test&quot; to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Specimen</TableHead>
                  <TableHead>Reference Range</TableHead>
                  <TableHead>Turnaround</TableHead>
                  <TableHead>Price (PKR)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-mono font-semibold text-slate-900">{test.testCode}</TableCell>
                    <TableCell className="font-medium text-slate-800">{test.testName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {test.category?.name || 'Standard'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">
                        {test.sampleType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {test.referenceRange ? `${test.referenceRange} ${test.unit || ''}` : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {Math.round(test.turnaroundMinutes / 60)} hrs
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      Rs. {test.price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {test.active ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL: NEW TEST */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateTest}>
            <DialogHeader>
              <DialogTitle>Add Diagnostic Investigation</DialogTitle>
              <DialogDescription>
                Create a standardized pathology test definition with price and specimen specifications.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category *</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={testForm.categoryId}
                  onChange={(e) => setTestForm({ ...testForm, categoryId: e.target.value })}
                  required
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Test Code *</label>
                  <Input
                    placeholder="e.g. CBC, LFT"
                    value={testForm.testCode}
                    onChange={(e) => setTestForm({ ...testForm, testCode: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Specimen Type *</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={testForm.sampleType}
                    onChange={(e) => setTestForm({ ...testForm, sampleType: e.target.value })}
                  >
                    <option value="Blood">Blood (EDTA / Plain)</option>
                    <option value="Serum">Serum</option>
                    <option value="Plasma">Plasma</option>
                    <option value="Urine">Urine</option>
                    <option value="Stool">Stool</option>
                    <option value="Sputum">Sputum</option>
                    <option value="Swab">Swab</option>
                    <option value="Tissue">Tissue / Biopsy</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Test Full Name *</label>
                <Input
                  placeholder="e.g. Complete Blood Count"
                  value={testForm.testName}
                  onChange={(e) => setTestForm({ ...testForm, testName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (PKR) *</label>
                  <Input
                    type="number"
                    min="0"
                    value={testForm.price}
                    onChange={(e) => setTestForm({ ...testForm, price: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turnaround (Minutes)</label>
                  <Input
                    type="number"
                    min="1"
                    value={testForm.turnaroundMinutes}
                    onChange={(e) => setTestForm({ ...testForm, turnaroundMinutes: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Measurement Unit</label>
                  <Input
                    placeholder="e.g. g/dL, mg/dL"
                    value={testForm.unit}
                    onChange={(e) => setTestForm({ ...testForm, unit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Standard Reference Range</label>
                  <Input
                    placeholder="e.g. 13.5 - 17.5"
                    value={testForm.referenceRange}
                    onChange={(e) => setTestForm({ ...testForm, referenceRange: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Result Value Format</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={testForm.resultType}
                  onChange={(e) => setTestForm({ ...testForm, resultType: e.target.value })}
                >
                  <option value="NUMERIC">NUMERIC (e.g. 14.5)</option>
                  <option value="TEXT">TEXT / PARAGRAPH</option>
                  <option value="QUALITATIVE">QUALITATIVE (Positive / Negative)</option>
                  <option value="STRUCTURED">STRUCTURED TABLE</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Clinical Description (Optional)</label>
                <Input
                  placeholder="Clinical significance notes..."
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTestModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-clinical-600 hover:bg-clinical-700 text-white">
                Add to Catalog
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: NEW CATEGORY */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleCreateCategory}>
            <DialogHeader>
              <DialogTitle>Add Test Category</DialogTitle>
              <DialogDescription>
                e.g. Hematology, Microbiology, Clinical Biochemistry.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Name *</label>
                <Input
                  placeholder="e.g. Immunology"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Brief description..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-clinical-600 hover:bg-clinical-700 text-white">
                Create Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
