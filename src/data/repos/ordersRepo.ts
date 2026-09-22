import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getProduct } from './productsRepo';
import { getShop, resolveShopForOrder } from './shopsRepo';
import type { Order, OrderLine, OrderStatus } from '@/src/domain/types';
import { toDate } from '../converters';

export type CreateOrderLineInput = {
  productId: string;
  quantityCases: number;
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

/**
 * Creates an order with prices snapshotted from Firestore products.
 * Resolves shop by id or via resolveShopForOrder when given a new shop name.
 */
export async function createOrder(input: {
  distributorId: string;
  srId: string;
  createdBy: string;
  shop: CreateOrderShopInput;
  lines: CreateOrderLineInput[];
  status?: OrderStatus;
}): Promise<string> {
  if (!input.lines.length) {
    throw new Error('Order must include at least one line.');
  }
  if (input.lines.length > 20) {
    throw new Error('Order cannot exceed 20 lines.');
  }

  let shopId: string;
  let shopName: string;

  if ('shopId' in input.shop) {
    const shop = await getShop(input.shop.shopId);
    if (!shop) {
      throw new Error(`Shop not found: ${input.shop.shopId}`);
    }
    if (shop.distributorId !== input.distributorId) {
      throw new Error('Shop belongs to another distributor.');
    }
    shopId = shop.id;
    shopName = shop.name;
  } else {
    const shop = await resolveShopForOrder({
      distributorId: input.distributorId,
      createdBy: input.createdBy,
      name: input.shop.shopName,
      phone: input.shop.phone,
      address: input.shop.address,
      area: input.shop.area,
      ownerName: input.shop.ownerName,
    });
    shopId = shop.id;
    shopName = shop.name;
  }

  const lines: OrderLine[] = [];

  for (const line of input.lines) {
    if (!Number.isFinite(line.quantityCases) || line.quantityCases <= 0) {
      throw new Error('Each line needs a positive quantity.');
    }

    const product = await getProduct(line.productId);
    if (!product) {
      throw new Error(`Product not found: ${line.productId}`);
    }
    if (product.distributorId !== input.distributorId) {
      throw new Error(`Product ${line.productId} belongs to another distributor.`);
    }
    if (!product.active) {
      throw new Error(`Product is inactive: ${product.name}`);
    }

    const pricePerCase = product.pricePerCase;
    const quantityCases = line.quantityCases;
    lines.push({
      productId: product.id,
      productName: product.name,
      pricePerCase,
      quantityCases,
      lineTotal: pricePerCase * quantityCases,
    });
  }

  const now = Timestamp.now();
  const status: OrderStatus = input.status ?? 'submitted';
  const ref = await addDoc(collection(db, 'orders'), {
    distributorId: input.distributorId,
    srId: input.srId,
    shopId,
    shopName,
    lines,
    status,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function listOrdersByShop(shopId: string): Promise<Order[]> {
  const q = query(collection(db, 'orders'), where('shopId', '==', shopId));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => mapOrder(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows;
}

export function mapOrder(id: string, data: Record<string, unknown>): Order {
  const rawLines = Array.isArray(data.lines) ? data.lines : [];
  const lines: OrderLine[] = rawLines.map((raw) => {
    const line = raw as Record<string, unknown>;
    return {
      productId: String(line.productId ?? ''),
      productName: String(line.productName ?? ''),
      pricePerCase: Number(line.pricePerCase ?? 0),
      quantityCases: Number(line.quantityCases ?? 0),
      lineTotal: Number(line.lineTotal ?? 0),
    };
  });

  return {
    id,
    distributorId: String(data.distributorId ?? ''),
    srId: String(data.srId ?? ''),
    shopId: String(data.shopId ?? ''),
    shopName: String(data.shopName ?? ''),
    lines,
    status: (data.status as OrderStatus) ?? 'submitted',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}
