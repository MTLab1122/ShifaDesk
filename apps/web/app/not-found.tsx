import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
      <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-bold tracking-tight mb-2">Page Not Found</h2>
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        The requested resource or clinic route does not exist.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}
