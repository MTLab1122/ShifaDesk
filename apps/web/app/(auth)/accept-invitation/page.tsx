'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CheckCircle2 } from 'lucide-react';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [accepted, setAccepted] = React.useState(false);

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault();
    setAccepted(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 p-3 bg-clinical-50 text-clinical-600 rounded-full w-fit">
          <Building2 className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold">Accept Clinic Invitation</CardTitle>
        <CardDescription>
          You have been invited to join <span className="font-semibold text-foreground">Al-Shifa Healthcare Network</span> as a Clinic Staff member.
        </CardDescription>
      </CardHeader>
      {accepted ? (
        <CardContent className="space-y-4 text-center py-6">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h3 className="font-semibold text-lg">Invitation Accepted!</h3>
          <p className="text-sm text-muted-foreground">
            Setting up your clinic workspace and redirecting...
          </p>
        </CardContent>
      ) : (
        <form onSubmit={handleAccept}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Legal Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Tariq Khan"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Create Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-clinical-600 hover:bg-clinical-700 text-white">
              Accept Invitation & Join
            </Button>
            <Link href="/login" className="text-xs text-muted-foreground hover:underline text-center">
              Already have an account? Sign In
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
