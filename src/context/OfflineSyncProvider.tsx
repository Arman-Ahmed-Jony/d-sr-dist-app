import { useEffect, type ReactNode } from 'react';
import * as Network from 'expo-network';
import { flushOutbox } from '@/src/data/offline/syncOutbox';

function shouldFlush(state: Network.NetworkState): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      if (shouldFlush(state)) void flushOutbox();
    });
    void Network.getNetworkStateAsync().then((state) => {
      if (shouldFlush(state)) void flushOutbox();
    });
    return () => subscription.remove();
  }, []);

  return <>{children}</>;
}
