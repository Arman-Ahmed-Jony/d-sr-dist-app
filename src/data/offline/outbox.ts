import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LineAdjustmentMode, Order, OrderStatus, Shop } from '@/src/domain/types';
import { normalizeShopName } from '@/src/domain/normalizeShopName';
import { deserializeOrder, serializeOrder } from './catalogStore';

const OUTBOX_KEY = 'sr-dist.outbox.v1';

export type OutboxShopFields = {
  shopName: string;
  phone?: string;
  address?: string;
  area?: string;
  ownerName?: string;
};

export type OutboxLineInput = {
  productId: string;
  quantityCases: number;
  quantityPcs: number;
  adjustmentMode: LineAdjustmentMode;
  adjustmentValue: number;
  freeProductId?: string;
};

export type OutboxCreateShop = {
  kind: 'createShop';
  localId: string;
  createdAt: string;
  payload: {
    distributorId: string;
    createdBy: string;
    name: string;
    phone: string;
    address: string;
    area: string;
    ownerName: string;
  };
};

export type OutboxCreateOrder = {
  kind: 'createOrder';
  localId: string;
  createdAt: string;
  srId: string;
  distributorId: string;
  payload: {
    distributorId: string;
    distributorName?: string;
    srId: string;
    srName?: string;
    createdBy: string;
    shop:
      | { shopId: string }
      | { localShopId: string; shopName: string }
      | OutboxShopFields;
    orderDate: string;
    deliveryDate: string;
    lines: OutboxLineInput[];
    status?: OrderStatus;
  };
  preview: ReturnType<typeof serializeOrder>;
};

export type OutboxUpdateOrder = {
  kind: 'updateOrder';
  orderId: string;
  createdAt: string;
  payload: {
    distributorId: string;
    createdBy: string;
    shop: { shopId: string } | { localShopId: string; shopName: string } | OutboxShopFields;
    orderDate: string;
    deliveryDate: string;
    lines: OutboxLineInput[];
    status?: OrderStatus;
  };
};

export type OutboxDeleteOrder = {
  kind: 'deleteDraft';
  orderId: string;
  distributorId: string;
  createdAt: string;
};

export type OutboxItem =
  | OutboxCreateShop
  | OutboxCreateOrder
  | OutboxUpdateOrder
  | OutboxDeleteOrder;

function newLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readOutbox(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOutbox(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export async function getOutbox(): Promise<OutboxItem[]> {
  return readOutbox();
}

export async function replaceOutbox(items: OutboxItem[]): Promise<void> {
  await writeOutbox(items);
}

export async function enqueueCreateShop(payload: OutboxCreateShop['payload']): Promise<string> {
  const items = await readOutbox();
  const localId = newLocalId('local-shop');
  items.push({
    kind: 'createShop',
    localId,
    createdAt: new Date().toISOString(),
    payload,
  });
  await writeOutbox(items);
  return localId;
}

export async function enqueueCreateOrder(
  payload: OutboxCreateOrder['payload'],
  preview: Order,
): Promise<string> {
  const items = await readOutbox();
  const localId = preview.id || newLocalId('pending');
  items.push({
    kind: 'createOrder',
    localId,
    createdAt: new Date().toISOString(),
    srId: payload.srId,
    distributorId: payload.distributorId,
    payload,
    preview: serializeOrder({ ...preview, id: localId, pendingSync: true }),
  });
  await writeOutbox(items);
  return localId;
}

export async function enqueueUpdateOrder(item: Omit<OutboxUpdateOrder, 'kind' | 'createdAt'>): Promise<void> {
  const items = await readOutbox();
  const create = items.find(
    (row): row is OutboxCreateOrder => row.kind === 'createOrder' && row.localId === item.orderId,
  );
  if (create) {
    create.payload = {
      ...create.payload,
      shop: item.payload.shop,
      orderDate: item.payload.orderDate,
      deliveryDate: item.payload.deliveryDate,
      lines: item.payload.lines,
      status: item.payload.status ?? create.payload.status,
    };
    await writeOutbox(items);
    return;
  }
  const next = items.filter((row) => !(row.kind === 'updateOrder' && row.orderId === item.orderId));
  next.push({
    kind: 'updateOrder',
    createdAt: new Date().toISOString(),
    ...item,
  });
  await writeOutbox(next);
}

export async function enqueueDeleteOrder(orderId: string, distributorId: string): Promise<boolean> {
  const items = await readOutbox();
  const createIndex = items.findIndex(
    (row) => row.kind === 'createOrder' && row.localId === orderId,
  );
  if (createIndex >= 0) {
    const create = items[createIndex] as OutboxCreateOrder;
    const shopRef = create.payload.shop;
    items.splice(createIndex, 1);
    if ('localShopId' in shopRef) {
      const stillUsed = items.some(
        (row) =>
          row.kind === 'createOrder' &&
          'localShopId' in row.payload.shop &&
          row.payload.shop.localShopId === shopRef.localShopId,
      );
      if (!stillUsed) {
        const shopIndex = items.findIndex(
          (row) => row.kind === 'createShop' && row.localId === shopRef.localShopId,
        );
        if (shopIndex >= 0) items.splice(shopIndex, 1);
      }
    }
    await writeOutbox(items);
    return true;
  }
  const next = items.filter((row) => !(row.kind === 'deleteDraft' && row.orderId === orderId));
  next.push({
    kind: 'deleteDraft',
    orderId,
    distributorId,
    createdAt: new Date().toISOString(),
  });
  await writeOutbox(next);
  return false;
}

export function isLocalId(id: string): boolean {
  return id.startsWith('pending-') || id.startsWith('local-shop-');
}

export async function listPendingShops(distributorId: string): Promise<Shop[]> {
  const items = await readOutbox();
  return items
    .filter((row): row is OutboxCreateShop => row.kind === 'createShop')
    .filter((row) => row.payload.distributorId === distributorId)
    .map((row) => ({
      id: row.localId,
      distributorId: row.payload.distributorId,
      name: row.payload.name,
      nameNormalized: normalizeShopName(row.payload.name),
      phone: row.payload.phone,
      address: row.payload.address,
      area: row.payload.area,
      ownerName: row.payload.ownerName,
      createdBy: row.payload.createdBy,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.createdAt),
    }));
}

export async function listPendingOrders(srId?: string): Promise<Order[]> {
  const items = await readOutbox();
  return items
    .filter((row): row is OutboxCreateOrder => row.kind === 'createOrder')
    .filter((row) => !srId || row.srId === srId)
    .map((row) => deserializeOrder(row.preview));
}

export async function getPendingOrder(id: string): Promise<Order | null> {
  const items = await readOutbox();
  const row = items.find((item): item is OutboxCreateOrder => item.kind === 'createOrder' && item.localId === id);
  return row ? deserializeOrder(row.preview) : null;
}

export async function updatePendingPreview(localId: string, preview: Order): Promise<void> {
  const items = await readOutbox();
  const row = items.find((item): item is OutboxCreateOrder => item.kind === 'createOrder' && item.localId === localId);
  if (!row) return;
  row.preview = serializeOrder({ ...preview, id: localId, pendingSync: true });
  await writeOutbox(items);
}
