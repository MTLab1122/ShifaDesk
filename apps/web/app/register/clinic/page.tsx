'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '@/lib/api-client';
import { ClinicType, BillingInterval } from '@matabai/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Stethoscope,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function ClinicRegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clinicName: '',
    clinicType: ClinicType.SINGLE_DOCTOR,
    ownerFullName: '',
    ownerEmail: '',
    ownerPhone: '',
    city: 'Islamabad',
    address: '',
    country: 'Pakistan',
    preferredLanguage: 'en' as const,
    timezone: 'Asia/Karachi',
    password: '',
    planCode: 'STARTER',
    billingInterval: BillingInterval.MONTHLY,
    startTrial: true,
    termsAccepted: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.termsAccepted) {
      setError('You must accept the terms of service and privacy notice to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiClient.onboarding.register({
        ...formData,
        termsAccepted: true,
      });

      if (res?.token) {
        localStorage.setItem('matabai_token', res.token);
        localStorage.setItem('matabai_org_id', res.organizationId);
        localStorage.setItem('matabai_clinic_id', res.clinicId);
      }

      router.push('/onboarding');
    } catch (err: any) {
      setError(err?.message || 'Failed to register clinic. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-3xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            14-Day Full Access Free Trial
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Register Your Clinic on MatabAI
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
            Transform patient scheduling, automated WhatsApp & Voice reception, clinical encounters, and digital queueing in minutes.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Registration Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Clinic Information */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <CardTitle className="text-base text-slate-900">Clinic Facility Details</CardTitle>
              </div>
              <CardDescription>Primary facility name and operating classification</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clinicName">Clinic Name *</Label>
                  <Input
                    id="clinicName"
                    name="clinicName"
                    placeholder="e.g. Al-Shifa Polyclinic"
                    required
                    value={formData.clinicName}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="clinicType">Facility Type</Label>
                  <select
                    id="clinicType"
                    name="clinicType"
                    value={formData.clinicType}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value={ClinicType.SINGLE_DOCTOR}>Single-Doctor Practice</option>
                    <option value={ClinicType.POLYCLINIC}>Multi-Specialty Polyclinic</option>
                    <option value={ClinicType.SPECIALIST}>Specialist Clinic</option>
                    <option value={ClinicType.DIAGNOSTIC_LAB}>Diagnostic Pathology Laboratory</option>
                    <option value={ClinicType.HOSPITAL}>Outpatient Hospital Department</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Physical Clinic Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Street, Sector, Floor, Building"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owner Account Details */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <CardTitle className="text-base text-slate-900">Clinic Owner & Administrator</CardTitle>
              </div>
              <CardDescription>Primary administrative credentials for tenant isolation and audit records</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownerFullName">Full Name *</Label>
                  <Input
                    id="ownerFullName"
                    name="ownerFullName"
                    placeholder="Dr. Muhammad Ali"
                    required
                    value={formData.ownerFullName}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ownerEmail">Official Email *</Label>
                  <Input
                    id="ownerEmail"
                    name="ownerEmail"
                    type="email"
                    placeholder="doctor@clinic.pk"
                    required
                    value={formData.ownerEmail}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownerPhone">Phone Number (WhatsApp verified) *</Label>
                  <Input
                    id="ownerPhone"
                    name="ownerPhone"
                    placeholder="+923001234567"
                    required
                    value={formData.ownerPhone}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password * (min 8 characters)</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Plan Selection */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <CardTitle className="text-base text-slate-900">Choose Starting Plan</CardTitle>
              </div>
              <CardDescription>All plans include a 14-day free trial. No credit card required upfront.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Starter */}
                <label
                  className={`border rounded-lg p-4 cursor-pointer transition-all flex flex-col justify-between ${
                    formData.planCode === 'STARTER'
                      ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="planCode"
                    value="STARTER"
                    checked={formData.planCode === 'STARTER'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-slate-900">Starter</h4>
                      {formData.planCode === 'STARTER' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Single-Doctor Clinic</p>
                    <div className="text-lg font-extrabold text-slate-900">
                      PKR 6,999 <span className="text-xs font-normal text-slate-500">/mo</span>
                    </div>
                    <ul className="mt-3 text-xs text-slate-600 space-y-1">
                      <li>• 1 Doctor, 3 Staff</li>
                      <li>• Appointments & Queue</li>
                      <li>• EMR & Prescriptions</li>
                      <li>• 500 WhatsApp msgs/mo</li>
                    </ul>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-teal-700 bg-teal-100/60 rounded px-2 py-1 text-center">
                    14 Days Free
                  </div>
                </label>

                {/* Professional */}
                <label
                  className={`border rounded-lg p-4 cursor-pointer transition-all flex flex-col justify-between ${
                    formData.planCode === 'PROFESSIONAL'
                      ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="planCode"
                    value="PROFESSIONAL"
                    checked={formData.planCode === 'PROFESSIONAL'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-slate-900">Professional</h4>
                      {formData.planCode === 'PROFESSIONAL' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Multi-Doctor Polyclinic</p>
                    <div className="text-lg font-extrabold text-slate-900">
                      PKR 14,999 <span className="text-xs font-normal text-slate-500">/mo</span>
                    </div>
                    <ul className="mt-3 text-xs text-slate-600 space-y-1">
                      <li>• 5 Doctors, 15 Staff</li>
                      <li>• AI & Voice Receptionist</li>
                      <li>• Advanced Analytics & BI</li>
                      <li>• 2,000 WhatsApp msgs/mo</li>
                    </ul>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-teal-700 bg-teal-100/60 rounded px-2 py-1 text-center">
                    14 Days Free
                  </div>
                </label>

                {/* Laboratory */}
                <label
                  className={`border rounded-lg p-4 cursor-pointer transition-all flex flex-col justify-between ${
                    formData.planCode === 'LABORATORY'
                      ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="planCode"
                    value="LABORATORY"
                    checked={formData.planCode === 'LABORATORY'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-slate-900">Laboratory</h4>
                      {formData.planCode === 'LABORATORY' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">Diagnostic Testing Center</p>
                    <div className="text-lg font-extrabold text-slate-900">
                      PKR 19,999 <span className="text-xs font-normal text-slate-500">/mo</span>
                    </div>
                    <ul className="mt-3 text-xs text-slate-600 space-y-1">
                      <li>• Full Laboratory Operations</li>
                      <li>• Encrypted Report Delivery</li>
                      <li>• 10 Doctors, 25 Staff</li>
                      <li>• 5,000 WhatsApp msgs/mo</li>
                    </ul>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-teal-700 bg-teal-100/60 rounded px-2 py-1 text-center">
                    14 Days Free
                  </div>
                </label>
              </div>

              {/* Terms check */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="termsAccepted"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="termsAccepted" className="text-xs text-slate-600 leading-normal">
                  I agree to the MatabAI Master Services Agreement, Terms of Service, and Privacy Notice. I understand that medical diagnostic and treatment advice must always remain the sole responsibility of licensed clinical practitioners.
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <Link href="/login" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              Already have an account? Sign in
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 h-auto text-sm font-semibold shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Tenant...
                </>
              ) : (
                'Start 14-Day Free Trial'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
