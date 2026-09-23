import { FirebaseError } from 'firebase/app';

export function isOfflineError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    if (
      error.code === 'unavailable' ||
      error.code === 'firestore/unavailable' ||
      error.code === 'auth/network-request-failed'
    ) {
      return true;
    }
  }
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('client is offline') ||
    message.includes('failed to get document because the client is offline') ||
    message.includes('failed to get documents from server') ||
    message.includes('network request failed') ||
    message.includes('profile load timed out')
  );
}
