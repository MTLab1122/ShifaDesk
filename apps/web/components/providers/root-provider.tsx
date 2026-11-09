'use client';

import * as React from 'react';
import { QueryProvider } from './query-provider';
import { AuthProvider } from '@/lib/auth-context';

export interface RootProviderProps {
  children: React.ReactNode;
}

export function RootProvider({ children }: RootProviderProps) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
