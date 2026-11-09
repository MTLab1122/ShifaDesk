'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LANGUAGE_LIST } from '@/lib/i18n';
import { Activity, Calendar, Clock, User, Home, ArrowLeft, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { language, setLanguage } = useAuth();

  const isRtl = language === 'ur' || language === 'ps';

  const navLinks = [
    { title: 'Home', href: '/patient', icon: Home },
    { title: 'Book Appointment', href: '/patient/book-appointment', icon: Calendar },
    { title: 'My Appointments', href: '/patient/appointments', icon: Clock },
    { title: 'Live Token', href: '/patient/tokens', icon: Activity },
    { title: 'My Profile', href: '/patient/profile', icon: User },
  ];

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-50 flex flex-col font-sans text-foreground"
    >
      {/* Patient Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/patient" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-clinical-600 flex items-center justify-center text-white font-bold shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-slate-900 block leading-tight">
                  MatabAI <span className="text-clinical-600">Patient Portal</span>
                </span>
                <span className="text-[11px] text-muted-foreground block">Al-Shifa Clinic</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
              <Globe className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              {LANGUAGE_LIST.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    language === lang.code
                      ? 'bg-white text-clinical-700 shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>

            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Staff Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Patient Sub Navigation */}
        <div className="bg-white border-t border-slate-100 overflow-x-auto">
          <div className="max-w-4xl mx-auto px-4 flex gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-clinical-600 text-clinical-700 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile-Friendly Sticky Bottom Bar */}
      <nav className="sm:hidden sticky bottom-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around shadow-lg">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 text-[10px] ${
                isActive ? 'text-clinical-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} MatabAI (ShifaDesk) • Patient Care Portal</p>
          <p className="mt-1">For immediate medical emergencies, please visit the emergency room or call 1122.</p>
        </div>
      </footer>
    </div>
  );
}
