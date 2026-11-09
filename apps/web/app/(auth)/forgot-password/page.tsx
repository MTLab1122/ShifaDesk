'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Enter your registered clinic email address to receive password reset instructions.
        </CardDescription>
      </CardHeader>
      {submitted ? (
        <CardContent className="space-y-4 text-center py-6">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h3 className="font-semibold text-lg">Instructions Sent</h3>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, a secure recovery link has been dispatched via Supabase Auth.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-clinical-600 hover:bg-clinical-700 text-white">
              Send Reset Link
            </Button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Login
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
