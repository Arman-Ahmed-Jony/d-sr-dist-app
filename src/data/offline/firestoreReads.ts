import {
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { isOfflineError } from './isOfflineError';

export async function getDocWithFallback<T>(
  ref: DocumentReference<T>,
): Promise<DocumentSnapshot<T>> {
  try {
    return await getDoc(ref);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    try {
      return await getDocFromCache(ref);
    } catch {
      throw error;
    }
  }
}

export async function getDocsWithFallback<T>(q: Query<T>): Promise<QuerySnapshot<T>> {
  try {
    return await getDocs(q);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    try {
      return await getDocsFromCache(q);
    } catch {
      throw error;
    }
  }
}
