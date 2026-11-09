'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PatientProfilePage() {
  const [saved, setSaved] = React.useState(false);
  const [form, setForm] = React.useState({
    mrn: 'MRN-2026-001',
    name: 'Usman Ali',
    phone: '03211122334',
    age: 34,
    gender: 'Male',
    bloodGroup: 'B+',
    emergencyContact: '03009988776 (Brother)',
    allergies: 'Penicillin, NSAIDs',
    chronicConditions: 'Mild Hypertension',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patient">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Patient Profile & Health ID</h1>
            <p className="text-muted-foreground text-sm">
              Your registered demographic data and clinical safety profile.
            </p>
          </div>
        </div>

        {saved && (
          <Badge className="bg-emerald-600 text-white gap-1.5 py-1 px-3">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved!
          </Badge>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Demographics Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Personal Demographics</CardTitle>
              <Badge variant="clinical" className="font-mono text-xs">
                {form.mrn}
              </Badge>
            </div>
            <CardDescription>
              Verified patient identification for OPD consults and pharmacy orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Legal Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mobile Phone (WhatsApp)</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Age</label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Gender</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Blood Group</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={form.bloodGroup}
                  onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Emergency Contact</label>
              <Input
                value={form.emergencyContact}
                onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                placeholder="e.g. 03001234567 (Spouse)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Clinical Safety & Allergy Card */}
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-amber-600" />
              Clinical Alerts & Known Allergies
            </CardTitle>
            <CardDescription>
              High-priority medical notes visible to doctors before writing prescriptions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-amber-900">Drug & Food Allergies</label>
              <Input
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Sulfa, Peanuts"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-amber-900">Chronic Health Conditions</label>
              <Input
                value={form.chronicConditions}
                onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
                placeholder="e.g. Diabetes Type 2, Asthma"
                className="bg-white"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-amber-200/60 pt-4 flex justify-end">
            <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
              <Save className="h-4 w-4" />
              Update Medical Profile
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
