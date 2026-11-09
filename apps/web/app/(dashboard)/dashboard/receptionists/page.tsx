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
import { MOCK_RECEPTIONISTS, MockReceptionist } from '@/lib/mock-data';
import { UserCheck, Plus, Search, Phone, Mail, Clock } from 'lucide-react';

export default function ReceptionistsPage() {
  const [receptionists, setReceptionists] = React.useState<MockReceptionist[]>(MOCK_RECEPTIONISTS);
  const [search, setSearch] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);

  // Form State
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [shift, setShift] = React.useState<'Morning' | 'Evening' | 'Night'>('Morning');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newRec: MockReceptionist = {
      id: `rec-${Date.now()}`,
      name,
      email,
      phone,
      shift,
      status: 'Active',
    };
    setReceptionists([newRec, ...receptionists]);
    setModalOpen(false);
  };

  const filtered = receptionists.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receptionist Staff</h1>
          <p className="text-muted-foreground text-sm">
            Front-desk operators, shift schedules, and patient intake staff.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Reception Staff
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search receptionists..."
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
                <TableHead>Staff Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Assigned Shift</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-semibold flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-clinical-600 shrink-0" />
                    <span>{rec.name}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {rec.email}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {rec.phone}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {rec.shift} Shift
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rec.status === 'Active' ? 'clinical' : 'outline'}>
                      {rec.status}
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
            <DialogTitle>Add Reception Staff</DialogTitle>
            <DialogDescription>Assign front-desk operators to clinic queues.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Staff Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maryam Nawaz"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reception@clinic.local"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Phone Number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Shift Timing</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="Morning">Morning (08:00 - 14:00)</option>
                <option value="Evening">Evening (14:00 - 20:00)</option>
                <option value="Night">Night (20:00 - 08:00)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white">
              Save Staff Member
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
