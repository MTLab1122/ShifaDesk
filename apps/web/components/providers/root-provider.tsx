'use client';

import * as React from 'react';
import { QueryProvider } from './query-provider';

export interface RootProviderProps {
  children: React.ReactNode;
}

export function RootProvider({ children }: RootProviderProps) {
  return <QueryProvider>{children}</QueryProvider>;
}
