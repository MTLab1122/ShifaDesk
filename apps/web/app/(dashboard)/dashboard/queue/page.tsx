'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MOCK_QUEUE, MockQueueToken } from '@/lib/mock-data';
import { ListOrdered, Play, CheckCircle2, SkipForward, Clock, AlertCircle } from 'lucide-react';

export default function QueuePage() {
  const [tokens, setTokens] = React.useState<MockQueueToken[]>(MOCK_QUEUE);

  const activeCalled = tokens.find((t) => t.status === 'Called');
  const waitingList = tokens.filter((t) => t.status === 'Waiting');

  const handleCallNext = () => {
    const nextWaiting = tokens.find((t) => t.status === 'Waiting');
    if (!nextWaiting) return;

    setTokens((prev) =>
      prev.map((t) => {
        if (t.id === activeCalled?.id) {
          return { ...t, status: 'Completed' };
        }
        if (t.id === nextWaiting.id) {
          return { ...t, status: 'Called', estimatedWaitMinutes: 0 };
        }
        return t;
      }),
    );
  };

  const handleCompleteToken = (id: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'Completed' } : t)),
    );
  };

  const handleSkipToken = (id: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'Skipped' } : t)),
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Outpatient Queue</h1>
          <p className="text-muted-foreground text-sm">
            Walk-in token dispatcher, calling interface, and waiting room display feed.
          </p>
        </div>
        <Button
          onClick={handleCallNext}
          className="bg-clinical-600 hover:bg-clinical-700 text-white gap-2"
          disabled={waitingList.length === 0}
        >
          <Play className="h-4 w-4" />
          Call Next Patient
        </Button>
      </div>

      {/* Currently Called Banner Display */}
      <Card className="border-2 border-clinical-500 bg-clinical-50/30">
        <CardHeader className="pb-2">
          <Badge variant="clinical" className="w-fit text-xs uppercase tracking-wider">
            Now Serving
          </Badge>
          <CardTitle className="text-3xl font-extrabold flex items-center justify-between">
            {activeCalled ? (
              <span>Token #{activeCalled.tokenNumber}</span>
            ) : (
              <span className="text-muted-foreground text-xl">No active patient called</span>
            )}
            {activeCalled && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleCompleteToken(activeCalled.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSkipToken(activeCalled.id)}
                  className="gap-1 text-destructive"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip Token
                </Button>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            {activeCalled
              ? `Patient: ${activeCalled.patientName} &bull; Consultant: ${activeCalled.doctorName} (${activeCalled.department})`
              : 'Waiting for reception dispatcher or doctor to call the next token.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-clinical-600" />
              Waiting Room Tokens
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Waiting: <span className="font-bold text-foreground">{waitingList.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Physician</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Estimated Wait (Estimate Only)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-bold text-base text-clinical-600">
                    #{t.tokenNumber}
                  </TableCell>
                  <TableCell className="font-semibold">{t.patientName}</TableCell>
                  <TableCell className="text-xs">{t.doctorName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.department}</TableCell>
                  <TableCell className="text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      ~{t.estimatedWaitMinutes} mins
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.status === 'Called'
                          ? 'destructive'
                          : t.status === 'Completed'
                          ? 'secondary'
                          : t.status === 'Skipped'
                          ? 'outline'
                          : 'clinical'
                      }
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === 'Waiting' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTokens((prev) =>
                            prev.map((item) =>
                              item.id === t.id
                                ? { ...item, status: 'Called', estimatedWaitMinutes: 0 }
                                : item.status === 'Called'
                                ? { ...item, status: 'Completed' }
                                : item,
                            ),
                          );
                        }}
                        className="text-xs gap-1"
                      >
                        <Play className="h-3 w-3" /> Call
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              Disclaimer: Estimated wait times are automated approximations based on average doctor consultation duration and are not guaranteed appointment times.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
