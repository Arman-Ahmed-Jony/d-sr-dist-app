import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  query,
  updateDoc,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getProduct } from './productsRepo';
import { getShop, resolveShopForOrder } from './shopsRepo';
import { computeLineTotal, computeOrderTotal } from '@/src/domain/orderCalc';
import type { LineAdjustmentMode, Order, OrderLine, OrderStatus } from '@/src/domain/types';
import { toDate } from '../converters';
import { getDocWithFallback, getDocsWithFallback } from '../offline/firestoreReads';
import { isOfflineError } from '../offline/isOfflineError';
import {
  loadCachedDistributorOrders,
  loadCachedShopOrders,
  loadCachedSrOrders,
  saveCachedDistributorOrders,
  saveCachedShopOrders,
  saveCachedSrOrders,
} from '../offline/catalogStore';
import {
  enqueueCreateOrder,
  enqueueDeleteOrder,
  enqueueUpdateOrder,
  getPendingOrder,
  isLocalId,
  listPendingOrders,
  updatePendingPreview,
  type OutboxShopFields,
} from '../offline/outbox';

export type CreateOrderLineInput = {
  productId: string;
  quantityCases: number;
  quantityPcs: number;
  adjustmentMode: LineAdjustmentMode;
  adjustmentValue: number;
  freeProductId?: string;
};

export type CreateOrderShopInput =
  | { shopId: string }
  | {
      shopName: string;
      phone?: string;
      address?: string;
      area?: string;
      ownerName?: string;
    };

async function resolveOrderShop(
  distributorId: string,
  createdBy: string,
  shopInput: CreateOrderShopInput,
): Promise<{ shopId: string; shopName: string }> {
  if ('shopId' in shopInput) {
    const shop = await getShop(shopInput.shopId);
    if (!shop) {
      throw new Error(`Shop not found: ${shopInput.shopId}`);
    }
    if (shop.distributorId !== distributorId) {
      throw new Error('Shop belongs to another distributor.');
    }
    return { shopId: shop.id, shopName: shop.name };
  }

  const shop = await resolveShopForOrder({
    distributorId,
    createdBy,
    name: shopInput.shopName,
    phone: shopInput.phone,
    address: shopInput.address,
    area: shopInput.area,
    ownerName: shopInput.ownerName,
  });
  return { shopId: shop.id, shopName: shop.name };
}

async function requireActiveProduct(productId: string, distributorId: string) {
  const product = await getProduct(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }
  if (product.distributorId !== distributorId) {
    throw new Error(`Product ${productId} belongs to another distributor.`);
  }
  if (!product.active) {
    throw new Error(`Product is inactive: ${product.name}`);
  }
  return product;
}

async function snapshotOrderLines(
  distributorId: string,
  inputLines: CreateOrderLineInput[],
): Promise<OrderLine[]> {
  if (!inputLines.length) {
    throw new Error('Order must include at least one line.');
  }
  if (inputLines.length > 20) {
    throw new Error('Order cannot exceed 20 lines.');
  }

  const productIds = inputLines.map((line) => line.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw new Error('Duplicate products are not allowed.');
  }

  const lines: OrderLine[] = [];
  for (const line of inputLines) {
    if (!Number.isFinite(line.quantityCases) || line.quantityCases <= 0) {
      throw new Error('Each line needs a positive quantity.');
    }

    const product = await requireActiveProduct(line.productId, distributorId);

    const adjustmentMode: LineAdjustmentMode =
      line.adjustmentMode === 'freePcs' ? 'freePcs' : 'discountAmount';
    const adjustmentValue = Number.isFinite(line.adjustmentValue) ? Math.max(0, line.adjustmentValue) : 0;
    const quantityPcs = Number.isFinite(line.quantityPcs) ? Math.max(0, line.quantityPcs) : 0;
    const pricePerCase = product.pricePerCase;

    let freeProductId = '';
    let freeProductName = '';
    if (adjustmentMode === 'freePcs') {
      const freeId = line.freeProductId?.trim() || product.id;
      const freeProduct =
        freeId === product.id ? product : await requireActiveProduct(freeId, distributorId);
      freeProductId = freeProduct.id;
      freeProductName = freeProduct.name;
    }

    lines.push({
      productId: product.id,
      productName: product.name,
      pricePerCase,
      quantityCases: line.quantityCases,
      quantityPcs,
      adjustmentMode,
      discountAmount: adjustmentMode === 'discountAmount' ? adjustmentValue : 0,
      freePcs: adjustmentMode === 'freePcs' ? adjustmentValue : 0,
      freeProductId,
      freeProductName,
      lineTotal: computeLineTotal({
        pricePerCase,
        quantityCases: line.quantityCases,
        adjustmentMode,
        adjustmentValue,
      }),
    });
  }
  return lines;
}

type BuiltOrder = {
  shopId: string;
  shopName: string;
  lines: OrderLine[];
  orderTotal: number;
  status: OrderStatus;
};

async function buildOrder(input: {
  distributorId: string;
  createdBy: string;
  shop: CreateOrderShopInput;
  lines: CreateOrderLineInput[];
  status?: OrderStatus;
}): Promise<BuiltOrder> {
  const { shopId, shopName } = await resolveOrderShop(
    input.distributorId,
    input.createdBy,
    input.shop,
  );
  const lines = await snapshotOrderLines(input.distributorId, input.lines);
  return {
    shopId,
    shopName,
    lines,
    orderTotal: computeOrderTotal(lines),
    status: input.status ?? 'submitted',
  };
}

function outboxShopFromBuilt(
  inputShop: CreateOrderShopInput,
  shopId: string,
  shopName: string,
): { shopId: string } | { localShopId: string; shopName: string } | OutboxShopFields {
  if (isLocalId(shopId)) return { localShopId: shopId, shopName };
  if ('shopId' in inputShop) return { shopId };
  return {
    shopName: inputShop.shopName,
    phone: inputShop.phone,
    address: inputShop.address,
    area: inputShop.area,
    ownerName: inputShop.ownerName,
  };
}

function mergePending(remote: Order[], pending: Order[]): Order[] {
  const remoteIds = new Set(remote.map((row) => row.id));
  const extras = pending.filter((row) => !remoteIds.has(row.id));
  return [...extras, ...remote].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export type ServerOrderInput = {
  distributorId: string;
  distributorName?: string;
  srId: string;
  srName?: string;
  createdBy: string;
  shop: CreateOrderShopInput;
  orderDate: Date;
  deliveryDate: Date;
  lines: CreateOrderLineInput[];
  status?: OrderStatus;
};

export async function pushOrderToServer(input: ServerOrderInput): Promise<string> {
  const built = await buildOrder(input);
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, 'orders'), {
    distributorId: input.distributorId,
    distributorName: input.distributorName ?? '',
    srId: input.srId,
    srName: input.srName ?? '',
    shopId: built.shopId,
    shopName: built.shopName,
    orderDate: Timestamp.fromDate(input.orderDate),
    deliveryDate: Timestamp.fromDate(input.deliveryDate),
    lines: built.lines,
    orderTotal: built.orderTotal,
    status: built.status,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function createOrder(input: ServerOrderInput): Promise<string> {
  try {
    return await pushOrderToServer(input);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    const built = await buildOrder(input);
    const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const preview: Order = {
      id: localId,
      distributorId: input.distributorId,
      distributorName: input.distributorName,
      srId: input.srId,
      srName: input.srName,
      shopId: built.shopId,
      shopName: built.shopName,
      orderDate: input.orderDate,
      deliveryDate: input.deliveryDate,
      lines: built.lines,
      orderTotal: built.orderTotal,
      status: built.status,
      createdAt: now,
      updatedAt: now,
      pendingSync: true,
    };
    return enqueueCreateOrder(
      {
        distributorId: input.distributorId,
        distributorName: input.distributorName,
        srId: input.srId,
        srName: input.srName,
        createdBy: input.createdBy,
        shop: outboxShopFromBuilt(input.shop, built.shopId, built.shopName),
        orderDate: input.orderDate.toISOString(),
        deliveryDate: input.deliveryDate.toISOString(),
        lines: input.lines,
        status: input.status,
      },
      preview,
    );
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  if (isLocalId(id)) return getPendingOrder(id);
  try {
    const snap = await getDocWithFallback(doc(db, 'orders', id));
    if (!snap.exists()) return getPendingOrder(id);
    return mapOrder(snap.id, snap.data() as Record<string, unknown>);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    return getPendingOrder(id);
  }
}

export type ServerOrderUpdateInput = {
  id: string;
  distributorId: string;
  createdBy: string;
  shop: CreateOrderShopInput;
  orderDate: Date;
  deliveryDate: Date;
  lines: CreateOrderLineInput[];
  status?: OrderStatus;
};

export async function pushOrderUpdateToServer(input: ServerOrderUpdateInput): Promise<void> {
  const existing = await getOrder(input.id);
  if (!existing) {
    throw new Error('Order not found.');
  }
  if (existing.distributorId !== input.distributorId) {
    throw new Error('Order belongs to another distributor.');
  }
  const built = await buildOrder(input);
  await updateDoc(doc(db, 'orders', input.id), {
    shopId: built.shopId,
    shopName: built.shopName,
    orderDate: Timestamp.fromDate(input.orderDate),
    deliveryDate: Timestamp.fromDate(input.deliveryDate),
    lines: built.lines,
    orderTotal: built.orderTotal,
    status: input.status ?? existing.status,
    updatedAt: serverTimestamp(),
  });
}

export async function updateOrder(input: ServerOrderUpdateInput): Promise<void> {
  if (isLocalId(input.id)) {
    const built = await buildOrder(input);
    await enqueueUpdateOrder({
      orderId: input.id,
      payload: {
        distributorId: input.distributorId,
        createdBy: input.createdBy,
        shop: outboxShopFromBuilt(input.shop, built.shopId, built.shopName),
        orderDate: input.orderDate.toISOString(),
        deliveryDate: input.deliveryDate.toISOString(),
        lines: input.lines,
        status: input.status,
      },
    });
    const previous = (await getPendingOrder(input.id)) ?? {
      id: input.id,
      distributorId: input.distributorId,
      srId: '',
      shopId: built.shopId,
      shopName: built.shopName,
      orderDate: input.orderDate,
      deliveryDate: input.deliveryDate,
      lines: built.lines,
      orderTotal: built.orderTotal,
      status: input.status ?? 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
      pendingSync: true,
    };
    await updatePendingPreview(input.id, {
      ...previous,
      shopId: built.shopId,
      shopName: built.shopName,
      orderDate: input.orderDate,
      deliveryDate: input.deliveryDate,
      lines: built.lines,
      orderTotal: built.orderTotal,
      status: input.status ?? previous.status,
      updatedAt: new Date(),
      pendingSync: true,
    });
    return;
  }

  try {
    await pushOrderUpdateToServer(input);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    const built = await buildOrder(input);
    await enqueueUpdateOrder({
      orderId: input.id,
      payload: {
        distributorId: input.distributorId,
        createdBy: input.createdBy,
        shop: outboxShopFromBuilt(input.shop, built.shopId, built.shopName),
        orderDate: input.orderDate.toISOString(),
        deliveryDate: input.deliveryDate.toISOString(),
        lines: input.lines,
        status: input.status,
      },
    });
  }
}

export async function deleteDraftOrder(id: string, distributorId: string): Promise<void> {
  if (isLocalId(id)) {
    await enqueueDeleteOrder(id, distributorId);
    return;
  }
  const existing = await getOrder(id);
  if (!existing) {
    throw new Error('Order not found.');
  }
  if (existing.distributorId !== distributorId) {
    throw new Error('Order belongs to another distributor.');
  }
  if (existing.status !== 'draft' && !existing.pendingSync) {
    throw new Error('Only draft orders can be deleted.');
  }
  try {
    await deleteDoc(doc(db, 'orders', id));
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    await enqueueDeleteOrder(id, distributorId);
  }
}

export async function listOrdersByShop(shopId: string, distributorId: string): Promise<Order[]> {
  const pending = (await listPendingOrders()).filter((order) => order.shopId === shopId);
  try {
    const q = query(collection(db, 'orders'), where('distributorId', '==', distributorId));
    const snap = await getDocsWithFallback(q);
    const rows = snap.docs
      .map((d) => mapOrder(d.id, d.data() as Record<string, unknown>))
      .filter((order) => order.shopId === shopId);
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    await saveCachedShopOrders(shopId, distributorId, rows);
    return mergePending(rows, pending);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    const cached = (await loadCachedShopOrders(shopId, distributorId)) ?? [];
    return mergePending(cached, pending);
  }
}

export async function listOrdersBySr(srId: string, distributorId: string): Promise<Order[]> {
  const pending = await listPendingOrders(srId);
  try {
    const q = query(collection(db, 'orders'), where('distributorId', '==', distributorId));
    const snap = await getDocsWithFallback(q);
    const rows = snap.docs
      .map((d) => mapOrder(d.id, d.data() as Record<string, unknown>))
      .filter((order) => order.srId === srId);
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    await saveCachedSrOrders(srId, distributorId, rows);
    return mergePending(rows, pending);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    const cached = (await loadCachedSrOrders(srId, distributorId)) ?? [];
    return mergePending(cached, pending);
  }
}

export async function listOrdersByDistributor(distributorId: string): Promise<Order[]> {
  const pending = (await listPendingOrders()).filter((order) => order.distributorId === distributorId);
  try {
    const q = query(collection(db, 'orders'), where('distributorId', '==', distributorId));
    const snap = await getDocsWithFallback(q);
    const rows = snap.docs.map((d) => mapOrder(d.id, d.data() as Record<string, unknown>));
    rows.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
    await saveCachedDistributorOrders(distributorId, rows);
    return mergePending(rows, pending);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    const cached = (await loadCachedDistributorOrders(distributorId)) ?? [];
    return mergePending(cached, pending);
  }
}

function asAdjustmentMode(value: unknown): LineAdjustmentMode {
  return value === 'freePcs' ? 'freePcs' : 'discountAmount';
}

export function mapOrder(id: string, data: Record<string, unknown>): Order {
  const rawLines = Array.isArray(data.lines) ? data.lines : [];
  const lines: OrderLine[] = rawLines.map((raw) => {
    const line = raw as Record<string, unknown>;
    const adjustmentMode = asAdjustmentMode(line.adjustmentMode);
    const discountAmount = Number(line.discountAmount ?? 0);
    const freePcs = Number(line.freePcs ?? 0);
    const pricePerCase = Number(line.pricePerCase ?? 0);
    const quantityCases = Number(line.quantityCases ?? 0);
    const storedTotal = line.lineTotal;
    const productId = String(line.productId ?? '');
    const productName = String(line.productName ?? '');
    const storedFreeProductId = line.freeProductId ? String(line.freeProductId) : '';
    const storedFreeProductName = line.freeProductName ? String(line.freeProductName) : '';
    return {
      productId,
      productName,
      pricePerCase,
      quantityCases,
      quantityPcs: Number(line.quantityPcs ?? 0),
      adjustmentMode,
      discountAmount,
      freePcs,
      freeProductId:
        storedFreeProductId || (adjustmentMode === 'freePcs' ? productId : ''),
      freeProductName:
        storedFreeProductName || (adjustmentMode === 'freePcs' ? productName : ''),
      lineTotal:
        storedTotal === undefined
          ? computeLineTotal({
              pricePerCase,
              quantityCases,
              adjustmentMode,
              adjustmentValue: adjustmentMode === 'discountAmount' ? discountAmount : freePcs,
            })
          : Number(storedTotal),
    };
  });

  const orderDate = data.orderDate ? toDate(data.orderDate) : toDate(data.createdAt);
  const deliveryDate = data.deliveryDate ? toDate(data.deliveryDate) : orderDate;

  return {
    id,
    distributorId: String(data.distributorId ?? ''),
    distributorName: data.distributorName ? String(data.distributorName) : undefined,
    srId: String(data.srId ?? ''),
    srName: data.srName ? String(data.srName) : undefined,
    shopId: String(data.shopId ?? ''),
    shopName: String(data.shopName ?? ''),
    memoNo: data.memoNo ? String(data.memoNo) : undefined,
    orderDate,
    deliveryDate,
    lines,
    orderTotal:
      data.orderTotal === undefined ? computeOrderTotal(lines) : Number(data.orderTotal),
    status: (data.status as OrderStatus) ?? 'submitted',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}
