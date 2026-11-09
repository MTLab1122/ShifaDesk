import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  ShieldCheck,
  Layers,
  Server,
  ArrowRight,
  UserCheck,
  Building2,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-5xl mx-auto w-full">
      <div className="text-center space-y-4 mb-8">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="clinical" className="text-xs uppercase tracking-wider px-3 py-1">
            Phase 1 & Phase 2 Operational
          </Badge>
          <Badge variant="outline" className="text-xs font-mono">
            v0.2.0-beta
          </Badge>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          MatabAI <span className="text-clinical-600">(ShifaDesk)</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Multilingual AI-Powered Clinic Operations SaaS Platform. Complete healthcare receptionist, live OPD queue management, multi-tenant backend, and patient care portal.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link href="/dashboard">
            <Button size="lg" className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2 shadow-md">
              <Building2 className="h-5 w-5" />
              Launch Staff Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/patient">
            <Button size="lg" variant="outline" className="border-clinical-600 text-clinical-700 hover:bg-clinical-50 gap-2">
              <UserCheck className="h-5 w-5" />
              Open Patient Portal
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <Lock className="h-4 w-4" />
              Sign In
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-6">
        <Card className="hover:border-clinical-400 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multi-Tenant Architecture</CardTitle>
            <Layers className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">RLS & Isolated DB</div>
            <CardDescription className="mt-1">
              Prisma ORM, PostgreSQL with Row-Level Security, strict tenant isolation across organizations & clinics.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:border-clinical-400 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backend & Auth API</CardTitle>
            <Server className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">NestJS Modular Core</div>
            <CardDescription className="mt-1">
              Real session management, 5-role RBAC guards, audit logs, and RESTful CRUD endpoints under `/api/v1`.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:border-clinical-400 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multilingual SaaS UI</CardTitle>
            <ShieldCheck className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">English • Urdu • Pashto</div>
            <CardDescription className="mt-1">
              Next.js 15 App Router with full RTL support, dynamic role switching, and live outpatient queue token board.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
        <span>System Status: Backend API & Frontend Dashboard Verified Operational</span>
      </div>
    </main>
  );
}
