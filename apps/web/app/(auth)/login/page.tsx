'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@matabai/shared';
import { Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, t } = useAuth();

  const [email, setEmail] = React.useState('admin@matabai.local');
  const [password, setPassword] = React.useState('password123');
  const [role, setRole] = React.useState<UserRole>(UserRole.CLINIC_ADMIN);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{t.login || 'Sign In'}</CardTitle>
        <CardDescription>
          Enter your clinic credentials to access the ShifaDesk portal.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.com"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-clinical-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role (Demo Mode Switcher)</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value={UserRole.CLINIC_ADMIN}>Clinic Admin</option>
              <option value={UserRole.DOCTOR}>Doctor</option>
              <option value={UserRole.RECEPTIONIST}>Receptionist</option>
              <option value={UserRole.LAB_STAFF}>Laboratory Staff</option>
              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
              <option value={UserRole.PATIENT}>Patient</option>
            </select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-clinical-600 hover:bg-clinical-700 text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              t.login || 'Sign In'
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            Looking for patient booking?{' '}
            <Link href="/patient" className="text-clinical-600 hover:underline font-medium">
              Open Patient Portal
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
