import * as React from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30">
      {/* Brand Panel */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-clinical-900 via-clinical-700 to-clinical-600 text-white p-12">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-teal-300" />
          <span className="font-extrabold text-2xl tracking-tight">
            MatabAI <span className="text-teal-300 font-normal">(ShifaDesk)</span>
          </span>
        </Link>

        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Multilingual AI-Powered Clinic Operations Platform
          </h2>
          <p className="text-teal-100 text-sm leading-relaxed">
            Streamlining reception queues, doctor scheduling, patient consultations, and bilingual communications across healthcare clinics in Pakistan and globally.
          </p>
        </div>

        <div className="text-xs text-teal-200">
          © {new Date().getFullYear()} MatabAI. All rights reserved. Founded by Muhammad Talha.
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="md:hidden flex items-center justify-center gap-2 mb-6">
            <Activity className="h-6 w-6 text-clinical-600" />
            <span className="font-bold text-xl text-foreground">
              MatabAI (ShifaDesk)
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
