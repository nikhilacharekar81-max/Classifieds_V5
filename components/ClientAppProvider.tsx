'use client';

import React from 'react';
import { AppProvider, InitialServerData } from '@/context/AppContext';
import { ChunkErrorRecovery } from '@/components/common/ChunkErrorRecovery';

export {
  isChunkLoadFailure,
  attemptChunkErrorRecovery,
} from '@/lib/router/chunkErrorRecovery';

export function ClientAppProvider({
  children,
  initialServerData,
}: {
  children: React.ReactNode;
  initialServerData?: InitialServerData;
}) {
  return (
    <AppProvider initialServerData={initialServerData}>
      <ChunkErrorRecovery />
      {children}
    </AppProvider>
  );
}



