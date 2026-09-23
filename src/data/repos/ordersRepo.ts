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
import { getProduct } from './productsRepo';
import { getShop, resolveShopForOrder } from './shopsRepo';
import { computeLineTotal, computeOrderTotal } from '@/src/domain/orderCalc';
import type { LineAdjustmentMode, Order, OrderLine, OrderStatus } from '@/src/domain/types';
import { toDate } from '../converters';

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

/**
 * Creates an order with prices snapshotted from Firestore products.
 * Resolves shop by id or via resolveShopForOrder when given a new shop name.
 */
export async function createOrder(input: {
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
}): Promise<string> {
  const { shopId, shopName } = await resolveOrderShop(
    input.distributorId,
    input.createdBy,
    input.shop,
  );
  const lines = await snapshotOrderLines(input.distributorId, input.lines);
  const now = Timestamp.now();
  const status: OrderStatus = input.status ?? 'submitted';
  const orderTotal = computeOrderTotal(lines);
  const ref = await addDoc(collection(db, 'orders'), {
    distributorId: input.distributorId,
    distributorName: input.distributorName ?? '',
    srId: input.srId,
    srName: input.srName ?? '',
    shopId,
    shopName,
    orderDate: Timestamp.fromDate(input.orderDate),
    deliveryDate: Timestamp.fromDate(input.deliveryDate),
    lines,
    orderTotal,
    status,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function getOrder(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', id));
  if (!snap.exists()) return null;
  return mapOrder(snap.id, snap.data() as Record<string, unknown>);
}

export async function updateOrder(input: {
  id: string;
  distributorId: string;
  createdBy: string;
  shop: CreateOrderShopInput;
  orderDate: Date;
  deliveryDate: Date;
  lines: CreateOrderLineInput[];
  status?: OrderStatus;
}): Promise<void> {
  const existing = await getOrder(input.id);
  if (!existing) {
    throw new Error('Order not found.');
  }
  if (existing.distributorId !== input.distributorId) {
    throw new Error('Order belongs to another distributor.');
  }

  const { shopId, shopName } = await resolveOrderShop(
    input.distributorId,
    input.createdBy,
    input.shop,
  );
  const lines = await snapshotOrderLines(input.distributorId, input.lines);
  await updateDoc(doc(db, 'orders', input.id), {
    shopId,
    shopName,
    orderDate: Timestamp.fromDate(input.orderDate),
    deliveryDate: Timestamp.fromDate(input.deliveryDate),
    lines,
    orderTotal: computeOrderTotal(lines),
    status: input.status ?? existing.status,
    updatedAt: serverTimestamp(),
  });
}

export async function listOrdersByShop(shopId: string, distributorId: string): Promise<Order[]> {
  // Equality on distributorId only so list queries satisfy rules without a composite index.
  const q = query(collection(db, 'orders'), where('distributorId', '==', distributorId));
  const snap = await getDocs(q);
  const rows = snap.docs
    .map((d) => mapOrder(d.id, d.data() as Record<string, unknown>))
    .filter((order) => order.shopId === shopId);
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows;
}

export async function listOrdersBySr(srId: string, distributorId: string): Promise<Order[]> {
  const q = query(collection(db, 'orders'), where('distributorId', '==', distributorId));
  const snap = await getDocs(q);
  const rows = snap.docs
    .map((d) => mapOrder(d.id, d.data() as Record<string, unknown>))
    .filter((order) => order.srId === srId);
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows;
}

export async function listOrdersByDistributor(distributorId: string): Promise<Order[]> {
  const q = query(collection(db, 'orders'), where('distributorId', '==', distributorId));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => mapOrder(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
  return rows;
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
