import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ShieldCheck, Layers, Server } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-5xl mx-auto w-full">
      <div className="text-center space-y-4 mb-10">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="clinical" className="text-xs uppercase tracking-wider px-3 py-1">
            Phase 0 Operational
          </Badge>
          <Badge variant="outline" className="text-xs font-mono">
            v0.1.0-alpha
          </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          MatabAI <span className="text-clinical-600">(ShifaDesk)</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Multilingual AI-Powered Clinic Operations SaaS Platform.
          Engineering foundation and monorepo architecture initialized.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Core Monorepo</CardTitle>
            <Layers className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">Apps & Packages</div>
            <CardDescription className="mt-1">
              Next.js 15 Web, NestJS 10 API, shared contracts & validation.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backend Architecture</CardTitle>
            <Server className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">13 Modular Boundaries</div>
            <CardDescription className="mt-1">
              Auth, Tenant, Clinic, Appointments, WhatsApp & AI modules prepared.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security & DB</CardTitle>
            <ShieldCheck className="h-4 w-4 text-clinical-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">Supabase / PostgreSQL</div>
            <CardDescription className="mt-1">
              Strict schema isolation, connection pooling, and environment validation.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
        <span>System Status: Core Engineering Foundation Verified</span>
      </div>
    </main>
  );
}
