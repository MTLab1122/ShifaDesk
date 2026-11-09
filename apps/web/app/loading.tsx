import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-clinical-600 mb-4" />
      <p className="text-sm text-muted-foreground font-medium">
        Loading MatabAI workspace...
      </p>
    </div>
  );
}
