'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { MOCK_PATIENTS, MockPatient } from '@/lib/mock-data';
import { Users, UserPlus, Search, Phone, Calendar } from 'lucide-react';

export default function PatientsPage() {
  const [patients, setPatients] = React.useState<MockPatient[]>(MOCK_PATIENTS);
  const [search, setSearch] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);

  // Form State
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [age, setAge] = React.useState('');
  const [gender, setGender] = React.useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = React.useState('B+');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newPat: MockPatient = {
      id: `pat-${Date.now()}`,
      mrn: `MRN-2026-${String(patients.length + 1).padStart(3, '0')}`,
      name,
      phone,
      age: Number(age) || 30,
      gender,
      bloodGroup,
      lastVisit: new Date().toISOString().split('T')[0] || '2026-11-09',
    };
    setPatients([newPat, ...patients]);
    setModalOpen(false);
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Directory</h1>
          <p className="text-muted-foreground text-sm">
            Medical Record Numbers (MRN), demographics, and basic clinical check-in logs.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
          <UserPlus className="h-4 w-4" />
          Register Patient
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, MRN, or phone..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MRN</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Demographics</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Last Encounter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pat) => (
                <TableRow key={pat.id}>
                  <TableCell className="font-mono text-xs font-bold text-clinical-600">
                    {pat.mrn}
                  </TableCell>
                  <TableCell className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{pat.name}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {pat.phone}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {pat.age} yrs &bull; {pat.gender}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {pat.bloodGroup}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {pat.lastVisit}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleRegister}>
          <DialogHeader>
            <DialogTitle>Patient Registration</DialogTitle>
            <DialogDescription>
              Create outpatient record. Minimally required demographics for clinic scheduling.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Patient Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Muhammad Tariq"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Mobile Phone (Pakistani/E.164)</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Age (Years)</label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="35"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white">
              Complete Registration
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
