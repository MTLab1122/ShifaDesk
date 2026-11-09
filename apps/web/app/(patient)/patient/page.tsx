'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Calendar,
  Clock,
  MessageCircle,
  MapPin,
  Phone,
} from 'lucide-react';

export default function PatientHomePage() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-clinical-600 to-clinical-700 rounded-2xl p-6 text-white shadow-md">
        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-3">
          Assalam-o-Alaikum
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Welcome, Usman Ali
        </h1>
        <p className="text-clinical-100 text-sm mt-1 max-w-xl">
          Track your live OPD queue token, manage appointments, and access clinical test reports in one place.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/patient/book-appointment">
            <Button size="sm" className="bg-white text-clinical-700 hover:bg-slate-100 font-semibold gap-1.5">
              <Calendar className="h-4 w-4" />
              Book Appointment
            </Button>
          </Link>
          <Link href="/patient/tokens">
            <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10 gap-1.5">
              <Activity className="h-4 w-4" />
              Track Live Token
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Status Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Active Queue Token Card */}
        <Card className="border-2 border-clinical-500 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-clinical-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">
            LIVE TOKEN
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Outpatient Queue Status</CardDescription>
            <CardTitle className="text-3xl font-black text-clinical-700 flex items-center justify-between">
              <span>Token #101</span>
              <Badge variant="clinical" className="bg-emerald-100 text-emerald-800 text-xs font-semibold">
                Called (Now Serving)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b text-xs">
              <span className="text-muted-foreground">Doctor:</span>
              <span className="font-semibold">Dr. Muhammad Talha</span>
            </div>
            <div className="flex justify-between py-1 border-b text-xs">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-semibold">Consultation Room 101</span>
            </div>
            <div className="flex justify-between py-1 text-xs">
              <span className="text-muted-foreground">Estimated Wait:</span>
              <span className="font-bold text-emerald-600">Please enter doctor room now</span>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t pt-3 pb-3">
            <Link href="/patient/tokens" className="w-full">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 text-clinical-700 border-clinical-300">
                <Activity className="h-3.5 w-3.5" />
                View Full Live Queue Board
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Next Scheduled Appointment */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Upcoming Appointment</CardDescription>
            <CardTitle className="text-lg font-bold flex items-center justify-between">
              <span>Dr. Ayesha Malik</span>
              <Badge variant="outline" className="text-xs">Confirmed</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-4 w-4 text-clinical-600" />
              <span>Today, 10 Nov 2026</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4 text-clinical-600" />
              <span>02:30 PM - 02:50 PM</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-4 w-4 text-clinical-600" />
              <span>Pediatrics OPD, Room 104</span>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t pt-3 pb-3">
            <Link href="/patient/appointments" className="w-full">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                View All Appointments
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Quick Access Services */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Quick Patient Services</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/patient/book-appointment">
            <Card className="p-4 hover:border-clinical-500 hover:shadow-sm transition-all cursor-pointer text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="font-semibold text-xs">Book OPD Visit</div>
            </Card>
          </Link>

          <Link href="/patient/tokens">
            <Card className="p-4 hover:border-clinical-500 hover:shadow-sm transition-all cursor-pointer text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
              <div className="font-semibold text-xs">Live Token Tracker</div>
            </Card>
          </Link>

          <Link href="/patient/appointments">
            <Card className="p-4 hover:border-clinical-500 hover:shadow-sm transition-all cursor-pointer text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div className="font-semibold text-xs">My History</div>
            </Card>
          </Link>

          <Link href="/dashboard/conversations">
            <Card className="p-4 hover:border-clinical-500 hover:shadow-sm transition-all cursor-pointer text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="font-semibold text-xs">WhatsApp AI Chat</div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Clinic Facility Info Banner */}
      <Card className="bg-slate-50 border">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-clinical-600" />
              Al-Shifa Community Clinic (Main Branch)
            </div>
            <p className="text-muted-foreground">Plot 42-B, Sector G-9 Markaz, Islamabad • Timing: 08:00 AM - 10:00 PM</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="tel:+92512289901" className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-white border text-slate-700 hover:bg-slate-100 font-medium text-xs">
              <Phone className="h-3.5 w-3.5 text-clinical-600" />
              Call Reception
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
