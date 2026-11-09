'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { LANGUAGE_LIST } from '@/lib/i18n';
import {
  Building,
  User,
  Shield,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, organizationId, clinicId, language, setLanguage, logout } = useAuth();

  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({
    fullName: user?.fullName || 'Dr. Muhammad Talha',
    email: user?.email || 'founder@matabai.local',
    phone: user?.phone || '+92 300 1234567',
  });

  const [clinicForm, setClinicForm] = React.useState({
    name: 'Al-Shifa Community Clinic (Main Branch)',
    address: 'Plot 42-B, Sector G-9 Markaz, Islamabad',
    phone: '+92 51 2289901',
    email: 'contact@alshifaclinic.local',
    timezone: 'Asia/Karachi',
    openHour: '08:00',
    closeHour: '22:00',
    whatsappGreeting:
      'Assalam-o-Alaikum! MatabAI clinic reception mein khushamdeed. Aap kis tarah ki madad chahte hain?',
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveClinic = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System & Clinic Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your personal profile, clinic operating parameters, and multi-tenant configurations.
          </p>
        </div>

        {savedSuccess && (
          <Badge className="bg-emerald-600 text-white gap-1.5 py-1 px-3">
            <CheckCircle2 className="h-4 w-4" />
            Changes saved successfully!
          </Badge>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="clinic" className="gap-2">
            <Building className="h-4 w-4" />
            Clinic Setup
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile */}
        <TabsContent value="profile">
          <form onSubmit={handleSaveProfile}>
            <Card>
              <CardHeader>
                <CardTitle>Personal Profile</CardTitle>
                <CardDescription>
                  Your healthcare provider profile details and UI localization preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Application Language</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGUAGE_LIST.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`p-3 border rounded-lg text-left transition-all ${
                          language === lang.code
                            ? 'border-clinical-600 bg-clinical-50 ring-1 ring-clinical-600'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <span className="block font-semibold text-sm">{lang.name}</span>
                        <span className="block text-xs text-muted-foreground">{lang.nativeName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
                  <Save className="h-4 w-4" />
                  Save Profile Settings
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* Tab 2: Clinic Setup */}
        <TabsContent value="clinic">
          <form onSubmit={handleSaveClinic}>
            <Card>
              <CardHeader>
                <CardTitle>Clinic Facility Settings</CardTitle>
                <CardDescription>
                  Operational hours, emergency contacts, and automated WhatsApp receptionist parameters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Clinic Branch Name</label>
                  <Input
                    value={clinicForm.name}
                    onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Physical Address</label>
                  <Input
                    value={clinicForm.address}
                    onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reception Phone</label>
                    <Input
                      value={clinicForm.phone}
                      onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Clinic Email</label>
                    <Input
                      type="email"
                      value={clinicForm.email}
                      onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Opening Hour</label>
                    <Input
                      type="time"
                      value={clinicForm.openHour}
                      onChange={(e) => setClinicForm({ ...clinicForm, openHour: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Closing Hour</label>
                    <Input
                      type="time"
                      value={clinicForm.closeHour}
                      onChange={(e) => setClinicForm({ ...clinicForm, closeHour: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Receptionist Welcome Message (WhatsApp)</label>
                  <textarea
                    rows={3}
                    className="w-full p-2.5 rounded-md border border-input bg-background text-sm"
                    value={clinicForm.whatsappGreeting}
                    onChange={(e) => setClinicForm({ ...clinicForm, whatsappGreeting: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Sent automatically when a patient initiates a chat via WhatsApp.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button type="submit" className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2">
                  <Save className="h-4 w-4" />
                  Save Clinic Parameters
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* Tab 3: Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Authentication & Security</CardTitle>
              <CardDescription>
                Active tenant credentials, current role privileges, and session management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Current Active Role:</span>
                  <Badge variant="clinical">{user?.role || 'SUPER_ADMIN'}</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Organization Tenant:</span>
                  <span className="font-semibold">{organizationId || 'Matab Healthcare Network'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Active Clinic Branch:</span>
                  <span className="font-semibold">{clinicId || 'Main Branch'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Session Isolation:</span>
                  <span className="text-xs font-mono text-emerald-600 font-bold">RLS & Multi-Tenant Enforced</span>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" onClick={logout} className="text-destructive hover:bg-destructive/10 gap-2">
                  Sign Out of Current Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
