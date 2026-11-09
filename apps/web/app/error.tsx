'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('App Error Boundary caught error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h2>
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        An unexpected error occurred in the clinic interface.
      </p>
      <Button onClick={() => reset()} variant="default" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
