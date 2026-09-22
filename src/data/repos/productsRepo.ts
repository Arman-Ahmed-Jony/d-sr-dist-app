import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { toDate } from '../converters';
import type { Product } from '@/src/domain/types';

function mapProduct(id: string, data: Record<string, unknown>): Product {
  return {
    id,
    distributorId: String(data.distributorId ?? ''),
    name: String(data.name ?? ''),
    pricePerCase: Number(data.pricePerCase ?? 0),
    active: Boolean(data.active ?? true),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id));
  if (!snap.exists()) return null;
  return mapProduct(snap.id, snap.data() as Record<string, unknown>);
}

export async function listProductsByDistributor(distributorId: string): Promise<Product[]> {
  // Equality-only query avoids waiting on a composite index; sort in memory.
  const q = query(
    collection(db, 'products'),
    where('distributorId', '==', distributorId),
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => mapProduct(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export async function listActiveProductsByDistributor(
  distributorId: string,
): Promise<Product[]> {
  const q = query(
    collection(db, 'products'),
    where('distributorId', '==', distributorId),
    where('active', '==', true),
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => mapProduct(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export async function createProduct(input: {
  distributorId: string;
  name: string;
  pricePerCase: number;
}): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, 'products'), {
    distributorId: input.distributorId,
    name: input.name.trim(),
    pricePerCase: input.pricePerCase,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateProduct(
  id: string,
  input: { name?: string; pricePerCase?: number },
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.pricePerCase !== undefined) patch.pricePerCase = input.pricePerCase;
  await updateDoc(doc(db, 'products', id), patch);
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'products', id), {
    active,
    updatedAt: serverTimestamp(),
  });
}
