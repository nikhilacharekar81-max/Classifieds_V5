/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppClientRouter, AppClientRouterProps } from '@/components/AppClientRouter';
import { ChunkErrorRecovery } from '@/components/common/ChunkErrorRecovery';

export interface AppProps {
  ssrProps?: AppClientRouterProps;
}

export default function App({ ssrProps }: AppProps) {
  return (
    <>
      <ChunkErrorRecovery />
      <AppClientRouter {...(ssrProps || {})} />
    </>
  );
}
