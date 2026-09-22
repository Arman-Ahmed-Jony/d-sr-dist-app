import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { toDate } from '../converters';
import { normalizeShopName } from '@/src/domain/normalizeShopName';
import type { Shop } from '@/src/domain/types';

function mapShop(id: string, data: Record<string, unknown>): Shop {
  return {
    id,
    distributorId: String(data.distributorId ?? ''),
    name: String(data.name ?? ''),
    nameNormalized: String(data.nameNormalized ?? ''),
    phone: String(data.phone ?? ''),
    address: String(data.address ?? ''),
    area: String(data.area ?? ''),
    ownerName: String(data.ownerName ?? ''),
    createdBy: String(data.createdBy ?? ''),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}

export async function getShop(id: string): Promise<Shop | null> {
  const snap = await getDoc(doc(db, 'shops', id));
  if (!snap.exists()) return null;
  return mapShop(snap.id, snap.data() as Record<string, unknown>);
}

export async function listShopsByDistributor(distributorId: string): Promise<Shop[]> {
  const q = query(
    collection(db, 'shops'),
    where('distributorId', '==', distributorId),
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => mapShop(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export async function findShopByNormalizedName(
  distributorId: string,
  nameNormalized: string,
): Promise<Shop | null> {
  const q = query(
    collection(db, 'shops'),
    where('distributorId', '==', distributorId),
    where('nameNormalized', '==', nameNormalized),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return mapShop(first.id, first.data() as Record<string, unknown>);
}

export type ShopWritableFields = {
  name: string;
  phone: string;
  address: string;
  area: string;
  ownerName: string;
};

export async function createShop(input: {
  distributorId: string;
  createdBy: string;
} & ShopWritableFields): Promise<string> {
  const name = input.name.trim();
  const nameNormalized = normalizeShopName(name);
  if (!nameNormalized) {
    throw new Error('Shop name is required.');
  }
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, 'shops'), {
    distributorId: input.distributorId,
    name,
    nameNormalized,
    phone: input.phone.trim(),
    address: input.address.trim(),
    area: input.area.trim(),
    ownerName: input.ownerName.trim(),
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateShop(id: string, input: ShopWritableFields): Promise<void> {
  const name = input.name.trim();
  const nameNormalized = normalizeShopName(name);
  if (!nameNormalized) {
    throw new Error('Shop name is required.');
  }
  await updateDoc(doc(db, 'shops', id), {
    name,
    nameNormalized,
    phone: input.phone.trim(),
    address: input.address.trim(),
    area: input.area.trim(),
    ownerName: input.ownerName.trim(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Find an existing shop by normalized name within the distributor, or create one.
 * Best-effort only — not a strong uniqueness guarantee.
 */
export async function resolveShopForOrder(input: {
  distributorId: string;
  createdBy: string;
  name: string;
  phone?: string;
  address?: string;
  area?: string;
  ownerName?: string;
}): Promise<Shop> {
  const name = input.name.trim();
  const nameNormalized = normalizeShopName(name);
  if (!nameNormalized) {
    throw new Error('Shop name is required.');
  }

  const existing = await findShopByNormalizedName(input.distributorId, nameNormalized);
  if (existing) return existing;

  const id = await createShop({
    distributorId: input.distributorId,
    createdBy: input.createdBy,
    name,
    phone: input.phone ?? '',
    address: input.address ?? '',
    area: input.area ?? '',
    ownerName: input.ownerName ?? '',
  });

  const created = await getShop(id);
  if (!created) {
    throw new Error('Failed to load newly created shop.');
  }
  return created;
}
