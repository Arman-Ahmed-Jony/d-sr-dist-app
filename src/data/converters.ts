import {
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

export function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
}

export function asData<T extends DocumentData>(
  snap: QueryDocumentSnapshot<DocumentData>,
): T & { id: string } {
  return { id: snap.id, ...(snap.data() as T) };
}
