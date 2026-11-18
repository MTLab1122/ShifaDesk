'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/analytics');
  }, [router]);

  return (
    <div className="flex items-center justify-center p-12">
      <p className="text-muted-foreground text-sm">Redirecting to Advanced Analytics & BI...</p>
    </div>
  );
}
