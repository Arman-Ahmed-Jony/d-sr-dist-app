import {
  addDoc,
  collection,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getProduct } from './productsRepo';
import type { Order, OrderLine, OrderStatus } from '@/src/domain/types';
import { toDate } from '../converters';

export type CreateOrderLineInput = {
  productId: string;
  quantityCases: number;
};

/**
 * Creates an order with prices snapshotted from Firestore products.
 * Callers must not supply pricePerCase — it is always read from the product doc.
 */
export async function createOrder(input: {
  distributorId: string;
  srId: string;
  lines: CreateOrderLineInput[];
  status?: OrderStatus;
}): Promise<string> {
  if (!input.lines.length) {
    throw new Error('Order must include at least one line.');
  }
  if (input.lines.length > 20) {
    throw new Error('Order cannot exceed 20 lines.');
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
    lines,
    status,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
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
    lines,
    status: (data.status as OrderStatus) ?? 'submitted',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
  };
}
