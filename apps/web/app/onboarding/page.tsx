'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  UserPlus,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Building,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const [operatingHours] = useState([
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 }, // Monday
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
    { dayOfWeek: 5, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 15 },
    { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 15 },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('RECEPTIONIST');
  const [invitedList, setInvitedList] = useState<Array<{ email: string; fullName: string; role: string }>>([]);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await ApiClient.onboarding.getStatus();
        setStatus(res);
      } catch {
        // Fallback default
      }
    }
    loadStatus();
  }, []);

  const addStaffMember = () => {
    if (inviteEmail && inviteName) {
      setInvitedList((prev) => [...prev, { email: inviteEmail, fullName: inviteName, role: inviteRole }]);
      setInviteEmail('');
      setInviteName('');
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await ApiClient.onboarding.complete({
        operatingHours,
        invitedStaff: invitedList,
      });
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-teal-700 tracking-wider uppercase">
              Clinic Setup Wizard — Step {step} of 3
            </span>
            <span className="text-xs text-slate-500 font-medium">{Math.round((step / 3) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Confirmation */}
        {step === 1 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-teal-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">Tenant Account Initialized!</CardTitle>
              <CardDescription>
                Your clinic tenant, administrative permissions, and 14-day free trial have been provisioned in the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-teal-600" /> Clinic Organization:
                  </span>
                  <span className="font-semibold text-slate-900">{status?.clinicName || 'Active'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" /> Subscription Status:
                  </span>
                  <span className="font-semibold text-teal-700">{status?.subscriptionStatus || 'TRIALING (14 Days)'}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={() => setStep(2)} className="bg-teal-600 hover:bg-teal-700 text-white">
                  Continue to Schedule Setup <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Operating Hours */}
        {step === 2 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                <CardTitle className="text-lg text-slate-900">Clinic Operating Hours</CardTitle>
              </div>
              <CardDescription>
                Configure standard opening hours for patient booking and receptionist scheduling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-sm">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                  <div key={day} className="p-3 flex items-center justify-between bg-white">
                    <span className="font-medium text-slate-800">{day}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {idx === 4 ? '09:00 - 13:00' : '09:00 - 17:00'}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">15m slots</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="bg-teal-600 hover:bg-teal-700 text-white">
                  Continue to Staff <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Invite Staff */}
        {step === 3 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <CardTitle className="text-lg text-slate-900">Invite Clinical Staff (Optional)</CardTitle>
              </div>
              <CardDescription>
                Add initial receptionists, laboratory technicians, or associate physicians to your clinic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="sName" className="text-xs">Full Name</Label>
                  <Input
                    id="sName"
                    placeholder="Staff Name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="sEmail" className="text-xs">Email</Label>
                  <Input
                    id="sEmail"
                    type="email"
                    placeholder="staff@clinic.pk"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="sRole" className="text-xs">Role</Label>
                  <select
                    id="sRole"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="LAB_STAFF">Laboratory Staff</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addStaffMember}
                  disabled={!inviteEmail || !inviteName}
                  className="text-xs"
                >
                  + Add to Invite List
                </Button>
              </div>

              {invitedList.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-700">Pending Invitations:</p>
                  {invitedList.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs text-slate-600">
                      <span>{item.fullName} ({item.email})</span>
                      <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">{item.role}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Launching...
                    </>
                  ) : (
                    'Launch Clinic Dashboard'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
