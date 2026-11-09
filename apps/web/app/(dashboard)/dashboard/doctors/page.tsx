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
import { MOCK_DOCTORS, MockDoctor } from '@/lib/mock-data';
import { Stethoscope, Plus, Search, Calendar } from 'lucide-react';

export default function DoctorsPage() {
  const [doctors, setDoctors] = React.useState<MockDoctor[]>(MOCK_DOCTORS);
  const [search, setSearch] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);

  // Form State
  const [name, setName] = React.useState('');
  const [specialty, setSpecialty] = React.useState('Internal Medicine');
  const [qualifications, setQualifications] = React.useState('');
  const [roomNumber, setRoomNumber] = React.useState('');
  const [fee, setFee] = React.useState('2000');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc: MockDoctor = {
      id: `doc-${Date.now()}`,
      name,
      specialty,
      qualifications,
      roomNumber,
      consultationFee: Number(fee) || 2000,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      status: 'Available',
    };
    setDoctors([newDoc, ...doctors]);
    setModalOpen(false);
  };

  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Physicians & Consultants</h1>
          <p className="text-muted-foreground text-sm">
            Doctor rosters, clinical specialties, consulting hours, and fee configurations.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Doctor Profile
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialty..."
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
                <TableHead>Doctor</TableHead>
                <TableHead>Specialty & Degree</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Consultation Fee</TableHead>
                <TableHead>Working Days</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-semibold flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-clinical-600 shrink-0" />
                    <span>{doc.name}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium">{doc.specialty}</div>
                    <div className="text-[11px] text-muted-foreground">{doc.qualifications}</div>
                  </TableCell>
                  <TableCell className="text-xs">{doc.roomNumber}</TableCell>
                  <TableCell className="text-xs font-semibold">
                    PKR {doc.consultationFee.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {doc.availableDays.join(', ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={doc.status === 'Available' ? 'clinical' : 'outline'}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <form onSubmit={handleAdd}>
          <DialogHeader>
            <DialogTitle>Add New Physician</DialogTitle>
            <DialogDescription>Register a consulting doctor and set working parameters.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Doctor Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Haris Mehmood"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Specialty</label>
                <Input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Dermatology"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Degrees & Qualifications</label>
                <Input
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="MBBS, FCPS"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Consulting Room</label>
                <Input
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Room 105"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Consultation Fee (PKR)</label>
                <Input
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="2500"
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white">
              Save Physician Profile
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
