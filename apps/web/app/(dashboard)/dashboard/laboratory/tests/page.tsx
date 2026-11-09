'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MOCK_LAB_TESTS, MockLabTest } from '@/lib/mock-data';
import { ArrowLeft, Plus, Search, Clock } from 'lucide-react';

export default function LabTestsCatalogPage() {
  const [tests, setTests] = React.useState<MockLabTest[]>(MOCK_LAB_TESTS);
  const [search, setSearch] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    code: '',
    name: '',
    category: 'Hematology',
    price: 1000,
    turnaroundHours: 4,
  });

  const filteredTests = tests.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    const newTest: MockLabTest = {
      id: `lab-${Date.now()}`,
      code: formData.code.toUpperCase(),
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      turnaroundHours: Number(formData.turnaroundHours),
    };

    setTests([...tests, newTest]);
    setFormData({ code: '', name: '', category: 'Hematology', price: 1000, turnaroundHours: 4 });
    setIsDialogOpen(false);
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
            <h1 className="text-2xl font-bold tracking-tight">Pathology Test Catalog</h1>
            <p className="text-muted-foreground text-sm">
              Standard clinic laboratory investigations, fee tariff, and diagnostic SLAs.
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
              <Plus className="h-4 w-4" />
              Add Investigation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleCreateTest}>
              <DialogHeader>
                <DialogTitle>Add Laboratory Investigation</DialogTitle>
                <DialogDescription>
                  Configure new pathology test profile and price.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Test Code</label>
                    <Input
                      placeholder="e.g. ESR"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Hematology">Hematology</option>
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Endocrinology">Endocrinology</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Serology">Serology</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Investigation Full Name</label>
                  <Input
                    placeholder="e.g. Erythrocyte Sedimentation Rate"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tariff Price (PKR)</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Turnaround (Hours)</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.turnaroundHours}
                      onChange={(e) => setFormData({ ...formData, turnaroundHours: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white">
                  Save Investigation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by test code, investigation name, or department category..."
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
                <TableHead>Code</TableHead>
                <TableHead>Investigation Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price (PKR)</TableHead>
                <TableHead>Turnaround</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-mono font-bold text-xs">{test.code}</TableCell>
                  <TableCell className="font-medium">{test.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {test.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{test.price.toLocaleString()} PKR</TableCell>
                  <TableCell className="text-muted-foreground text-xs flex items-center gap-1 py-3">
                    <Clock className="h-3 w-3" />
                    {test.turnaroundHours} hours
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
