import {
  addDoc,
  collection,
  doc,
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
import { getDocWithFallback, getDocsWithFallback } from '../offline/firestoreReads';
import { isOfflineError } from '../offline/isOfflineError';
import {
  loadCachedShopById,
  loadCachedShops,
  saveCachedShops,
  upsertCachedShop,
} from '../offline/catalogStore';
import { enqueueCreateShop, listPendingShops } from '../offline/outbox';

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
  try {
    const snap = await getDocWithFallback(doc(db, 'shops', id));
    if (!snap.exists()) return loadCachedShopById(id);
    const shop = mapShop(snap.id, snap.data() as Record<string, unknown>);
    await upsertCachedShop(shop);
    return shop;
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    return loadCachedShopById(id);
  }
}

function mergeShops(remote: Shop[], pending: Shop[]): Shop[] {
  const ids = new Set(remote.map((shop) => shop.id));
  const names = new Set(remote.map((shop) => shop.nameNormalized));
  const extras = pending.filter((shop) => !ids.has(shop.id) && !names.has(shop.nameNormalized));
  return [...extras, ...remote].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listShopsByDistributor(distributorId: string): Promise<Shop[]> {
  const pending = await listPendingShops(distributorId);
  try {
    const q = query(collection(db, 'shops'), where('distributorId', '==', distributorId));
    const snap = await getDocsWithFallback(q);
    const rows = snap.docs.map((d) => mapShop(d.id, d.data() as Record<string, unknown>));
    rows.sort((a, b) => a.name.localeCompare(b.name));
    await saveCachedShops(distributorId, rows);
    return mergeShops(rows, pending);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    return mergeShops((await loadCachedShops(distributorId)) ?? [], pending);
  }
}

export async function findShopByNormalizedName(
  distributorId: string,
  nameNormalized: string,
): Promise<Shop | null> {
  try {
    const q = query(
      collection(db, 'shops'),
      where('distributorId', '==', distributorId),
      where('nameNormalized', '==', nameNormalized),
    );
    const snap = await getDocsWithFallback(q);
    if (snap.empty) {
      const cached = await loadCachedShops(distributorId);
      return cached?.find((shop) => shop.nameNormalized === nameNormalized) ?? null;
    }
    const first = snap.docs[0];
    return mapShop(first.id, first.data() as Record<string, unknown>);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    const cached = await loadCachedShops(distributorId);
    return cached?.find((shop) => shop.nameNormalized === nameNormalized) ?? null;
  }
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

  try {
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
    if (created) return created;
    return {
      id,
      distributorId: input.distributorId,
      name,
      nameNormalized,
      phone: input.phone ?? '',
      address: input.address ?? '',
      area: input.area ?? '',
      ownerName: input.ownerName ?? '',
      createdBy: input.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    const localId = await enqueueCreateShop({
      distributorId: input.distributorId,
      createdBy: input.createdBy,
      name,
      phone: input.phone ?? '',
      address: input.address ?? '',
      area: input.area ?? '',
      ownerName: input.ownerName ?? '',
    });
    const localShop: Shop = {
      id: localId,
      distributorId: input.distributorId,
      name,
      nameNormalized,
      phone: input.phone ?? '',
      address: input.address ?? '',
      area: input.area ?? '',
      ownerName: input.ownerName ?? '',
      createdBy: input.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await upsertCachedShop(localShop);
    return localShop;
  }
}
